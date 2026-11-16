import { Inject, Injectable } from '@nestjs/common';
import type { PaginacionNormalizada } from '../compartido/dominio/paginacion.js';
import { DB, type Db } from '../compartido/infraestructura/db/db.js';
import type { DatosProyecto, EstadoProyecto, FiltrosBusqueda } from './esquemas.js';

/** Quién publica: el perfil de una empresa o el de un docente (nunca ambos). */
export interface PublicadorRef {
  tipo: 'empresa' | 'docente';
  id: number;
}

/** Un proyecto como está guardado: el publicador y las tecnologías y habilidades son solo ids. */
export interface FilaProyecto {
  idProyecto: number;
  titulo: string;
  descripcion: string;
  objetivos: string | null;
  perfilBuscado: string | null;
  duracionSemanas: number;
  horasSemanales: number;
  anioMinimo: number;
  cupos: number;
  modalidad: string;
  tipoRetribucion: string;
  detalleRetribucion: string | null;
  estado: EstadoProyecto;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  tipoPublicador: 'empresa' | 'docente';
  idPublicador: number;
  tecnologias: Array<{ idTecnologia: number; obligatoria: boolean }>;
  habilidades: number[];
}
type FilaBase = Omit<FilaProyecto, 'tecnologias' | 'habilidades'>;

const SELECT_PROYECTO = `
  SELECT p.id_proyecto, p.titulo, p.descripcion, p.objetivos, p.perfil_buscado,
         p.duracion_semanas, p.horas_semanales, p.anio_minimo, p.cupos, p.modalidad,
         p.tipo_retribucion, p.detalle_retribucion, p.estado, p.fecha_publicacion, p.fecha_cierre,
         CASE WHEN p.id_empresa IS NOT NULL THEN 'empresa' ELSE 'docente' END AS tipo_publicador,
         COALESCE(p.id_empresa, p.id_docente) AS id_publicador
    FROM proyecto p`;

/** Filtros de la búsqueda de proyectos publicados. Un parámetro `NULL` significa "sin filtro". */
const FILTROS_BUSQUEDA = `
  p.estado = 'publicado'
  AND ($1::text IS NULL OR p.titulo ILIKE $1 OR p.descripcion ILIKE $1)
  AND ($2::bigint[] IS NULL OR EXISTS (
        SELECT 1 FROM proyecto_tecnologia pt
         WHERE pt.id_proyecto = p.id_proyecto AND pt.id_tecnologia = ANY($2::bigint[])))
  AND ($3::modalidad IS NULL OR p.modalidad = $3::modalidad)
  AND ($4::tipo_retribucion IS NULL OR p.tipo_retribucion = $4::tipo_retribucion)
  AND ($5::int IS NULL OR p.horas_semanales <= $5::int)
  AND ($6::int IS NULL OR p.anio_minimo <= $6::int)`;

/**
 * Repositorio de `proyecto`, `proyecto_tecnologia` y `proyecto_habilidad` (dueño: M2).
 * Los nombres de tecnologías, habilidades y publicadores no se leen acá: son de otros módulos.
 */
@Injectable()
export class ProyectosRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Crea el proyecto con sus tecnologías y habilidades. Si `publicar`, nace publicado. */
  crear(publicador: PublicadorRef, datos: DatosProyecto, publicar: boolean): Promise<number> {
    return this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ idProyecto: number }>(
        `INSERT INTO proyecto
           (id_empresa, id_docente, titulo, descripcion, objetivos, perfil_buscado, duracion_semanas,
            horas_semanales, anio_minimo, cupos, modalidad, tipo_retribucion, detalle_retribucion,
            estado, fecha_publicacion)
         VALUES ($1::bigint, $2::bigint, $3, $4, $5, $6, $7, $8, $9, $10, $11::modalidad,
                 $12::tipo_retribucion, $13,
                 CASE WHEN $14::boolean THEN 'publicado'::estado_proyecto ELSE 'borrador'::estado_proyecto END,
                 CASE WHEN $14::boolean THEN now() END)
         RETURNING id_proyecto`,
        [
          publicador.tipo === 'empresa' ? publicador.id : null,
          publicador.tipo === 'docente' ? publicador.id : null,
          datos.titulo,
          datos.descripcion,
          datos.objetivos,
          datos.perfilBuscado,
          datos.duracionSemanas,
          datos.horasSemanales,
          datos.anioMinimo,
          datos.cupos,
          datos.modalidad,
          datos.tipoRetribucion,
          datos.detalleRetribucion,
          publicar,
        ],
      );
      const { idProyecto } = rows[0];
      await this.reemplazarTecnologiasYHabilidades(tx, idProyecto, datos);
      return idProyecto;
    });
  }

  /**
   * Reemplaza los datos del proyecto, sus tecnologías y sus habilidades. Devuelve `false` si el
   * proyecto no existe o su estado ya no admite ediciones (finalizado, cancelado o suspendido).
   */
  reemplazar(idProyecto: number, datos: DatosProyecto): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const { rowCount } = await tx.query(
        `UPDATE proyecto
            SET titulo = $2, descripcion = $3, objetivos = $4, perfil_buscado = $5,
                duracion_semanas = $6, horas_semanales = $7, anio_minimo = $8, cupos = $9,
                modalidad = $10::modalidad, tipo_retribucion = $11::tipo_retribucion,
                detalle_retribucion = $12
          WHERE id_proyecto = $1 AND estado IN ('borrador', 'publicado', 'en_curso')`,
        [
          idProyecto,
          datos.titulo,
          datos.descripcion,
          datos.objetivos,
          datos.perfilBuscado,
          datos.duracionSemanas,
          datos.horasSemanales,
          datos.anioMinimo,
          datos.cupos,
          datos.modalidad,
          datos.tipoRetribucion,
          datos.detalleRetribucion,
        ],
      );
      if (rowCount === 0) return false;
      await this.reemplazarTecnologiasYHabilidades(tx, idProyecto, datos);
      return true;
    });
  }

  /**
   * Cambia el estado solo si todavía es `desde` (así dos pedidos a la vez no pisan la
   * transición). Devuelve `false` si el proyecto ya cambió. Al salir de `borrador` se fija la
   * fecha de publicación (la tabla lo exige para todo estado que no sea borrador, y un borrador
   * cancelado también) y al finalizar o cancelar, la de cierre.
   */
  async cambiarEstado(
    idProyecto: number,
    desde: EstadoProyecto,
    hacia: EstadoProyecto,
  ): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `UPDATE proyecto
          SET estado = $3::estado_proyecto,
              fecha_publicacion = COALESCE(fecha_publicacion, now()),
              fecha_cierre = CASE WHEN $4::boolean THEN now() ELSE fecha_cierre END
        WHERE id_proyecto = $1 AND estado = $2::estado_proyecto`,
      [idProyecto, desde, hacia, hacia === 'finalizado' || hacia === 'cancelado'],
    );
    return rowCount > 0;
  }

  /** Los proyectos que existen, entre los pedidos, sin importar su estado. */
  async buscarPorIds(ids: readonly number[]): Promise<FilaProyecto[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query<FilaBase>(
      `${SELECT_PROYECTO} WHERE p.id_proyecto = ANY($1::bigint[]) ORDER BY p.id_proyecto`,
      [[...new Set(ids)]],
    );
    return this.conRelaciones(rows);
  }

  /**
   * Los proyectos que alguna vez se publicaron (todos menos los borradores): el motor los
   * puntúa para que sus postulaciones conserven el puntaje, aunque solo recomienda los publicados.
   */
  async listarParaMatching(): Promise<FilaProyecto[]> {
    const { rows } = await this.db.query<FilaBase>(
      `${SELECT_PROYECTO} WHERE p.estado <> 'borrador' ORDER BY p.id_proyecto`,
    );
    return this.conRelaciones(rows);
  }

  /** Los proyectos de un publicador, los más nuevos primero, opcionalmente de un solo estado. */
  async listarDePublicador(
    publicador: PublicadorRef,
    estado?: EstadoProyecto,
  ): Promise<FilaProyecto[]> {
    const { rows } = await this.db.query<FilaBase>(
      `${SELECT_PROYECTO}
        WHERE (p.id_empresa = $1::bigint OR p.id_docente = $2::bigint)
          AND ($3::estado_proyecto IS NULL OR p.estado = $3::estado_proyecto)
        ORDER BY p.id_proyecto DESC`,
      [
        publicador.tipo === 'empresa' ? publicador.id : null,
        publicador.tipo === 'docente' ? publicador.id : null,
        estado ?? null,
      ],
    );
    return this.conRelaciones(rows);
  }

  /** Búsqueda de proyectos publicados, los más nuevos primero. */
  async buscarPublicados(
    filtros: FiltrosBusqueda,
    paginacion: PaginacionNormalizada,
  ): Promise<{ filas: FilaProyecto[]; total: number }> {
    const parametros = [
      filtros.q ? `%${filtros.q.replace(/[\\%_]/g, '\\$&')}%` : null,
      filtros.tecnologias ?? null,
      filtros.modalidad ?? null,
      filtros.tipoRetribucion ?? null,
      filtros.horasMax ?? null,
      filtros.anioMax ?? null,
    ];
    const [pagina, conteo] = await Promise.all([
      this.db.query<FilaBase>(
        `${SELECT_PROYECTO} WHERE ${FILTROS_BUSQUEDA}
          ORDER BY p.fecha_publicacion DESC, p.id_proyecto DESC
          LIMIT $7::int OFFSET $8::int`,
        [...parametros, paginacion.tamano, paginacion.desplazamiento],
      ),
      this.db.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM proyecto p WHERE ${FILTROS_BUSQUEDA}`,
        parametros,
      ),
    ]);
    return { filas: await this.conRelaciones(pagina.rows), total: conteo.rows[0].total };
  }

  // -------------------------------------------------------------------------

  private async reemplazarTecnologiasYHabilidades(
    tx: Db,
    idProyecto: number,
    datos: DatosProyecto,
  ): Promise<void> {
    await tx.query('DELETE FROM proyecto_tecnologia WHERE id_proyecto = $1', [idProyecto]);
    await tx.query('DELETE FROM proyecto_habilidad WHERE id_proyecto = $1', [idProyecto]);
    await tx.query(
      `INSERT INTO proyecto_tecnologia (id_proyecto, id_tecnologia, obligatoria)
       SELECT $1::bigint, t.id_tecnologia, t.obligatoria
         FROM unnest($2::bigint[], $3::boolean[]) AS t(id_tecnologia, obligatoria)`,
      [
        idProyecto,
        datos.tecnologias.map((t) => t.idTecnologia),
        datos.tecnologias.map((t) => t.obligatoria),
      ],
    );
    await tx.query(
      `INSERT INTO proyecto_habilidad (id_proyecto, id_habilidad)
       SELECT $1::bigint, unnest($2::bigint[])`,
      [idProyecto, datos.habilidades],
    );
  }

  /** Agrega a cada proyecto sus tecnologías y habilidades (dos consultas para todos). */
  private async conRelaciones(filas: FilaBase[]): Promise<FilaProyecto[]> {
    if (filas.length === 0) return [];
    const ids = filas.map((f) => f.idProyecto);
    const [tecnologias, habilidades] = await Promise.all([
      this.db.query<{ idProyecto: number; idTecnologia: number; obligatoria: boolean }>(
        `SELECT id_proyecto, id_tecnologia, obligatoria
           FROM proyecto_tecnologia WHERE id_proyecto = ANY($1::bigint[])`,
        [ids],
      ),
      this.db.query<{ idProyecto: number; idHabilidad: number }>(
        `SELECT id_proyecto, id_habilidad
           FROM proyecto_habilidad WHERE id_proyecto = ANY($1::bigint[])`,
        [ids],
      ),
    ]);
    return filas.map((fila) => ({
      ...fila,
      tecnologias: tecnologias.rows
        .filter((t) => t.idProyecto === fila.idProyecto)
        .map(({ idTecnologia, obligatoria }) => ({ idTecnologia, obligatoria })),
      habilidades: habilidades.rows
        .filter((h) => h.idProyecto === fila.idProyecto)
        .map((h) => h.idHabilidad),
    }));
  }
}
