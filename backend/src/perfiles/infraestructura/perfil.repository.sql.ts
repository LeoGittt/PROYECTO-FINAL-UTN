import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../compartido/infraestructura/db/db.js';
import type {
  DatosPerfilDocente,
  DatosPerfilEmpresa,
  DatosPerfilEstudiante,
  NivelTecnologia,
  PerfilDocenteDto,
  PerfilEmpresaDto,
  PublicadorDto,
  RegistroEstudiante,
} from '../dominio/perfil.js';
import type {
  FiltroEstudiantes,
  PerfilRepository,
} from '../dominio/puertos.js';

type FilaEstudiante = Omit<
  RegistroEstudiante,
  'tecnologias' | 'habilidades' | 'materiasAprobadas'
>;

/**
 * Repositorio de `perfil_estudiante`, `perfil_empresa`, `perfil_docente`, `estudiante_tecnologia`,
 * `estudiante_habilidad` y `materia_aprobada` (dueño: M1). Los nombres de carreras, materias,
 * tecnologías y habilidades no se leen acá: pertenecen al catálogo de M5.
 */
@Injectable()
export class PerfilRepositorySql implements PerfilRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // -------------------------------------------------------------------------
  // Estudiante
  // -------------------------------------------------------------------------

  async listarEstudiantes(filtro: FiltroEstudiantes): Promise<RegistroEstudiante[]> {
    const { rows } = await this.db.query<FilaEstudiante>(
      `SELECT pe.id_estudiante, pe.id_usuario, pe.id_carrera, pe.anio_cursada, pe.horas_semanales,
              pe.descripcion, pe.proyectos_previos, pe.cv_url, pe.github_url, pe.portfolio_url,
              u.nombre, u.apellido, u.email, u.activo
         FROM perfil_estudiante pe
         JOIN usuario u ON u.id_usuario = pe.id_usuario
        WHERE ($1::bigint[] IS NULL OR pe.id_estudiante = ANY($1::bigint[]))
          AND ($2::bigint IS NULL OR pe.id_usuario = $2::bigint)
          AND (NOT $3::boolean OR u.activo)
        ORDER BY pe.id_estudiante`,
      [
        filtro.idsEstudiante ? [...new Set(filtro.idsEstudiante)] : null,
        filtro.idUsuario ?? null,
        filtro.soloActivos ?? false,
      ],
    );
    if (rows.length === 0) return [];

    const ids = rows.map((fila) => fila.idEstudiante);
    const [tecnologias, habilidades, materias] = await Promise.all([
      filtro.incluir?.tecnologias ? this.tecnologiasDe(ids) : new Map(),
      filtro.incluir?.habilidades ? this.habilidadesDe(ids) : new Map(),
      filtro.incluir?.materias ? this.materiasDe(ids) : new Map(),
    ]);
    return rows.map((fila) => ({
      ...fila,
      tecnologias: tecnologias.get(fila.idEstudiante) ?? [],
      habilidades: habilidades.get(fila.idEstudiante) ?? [],
      materiasAprobadas: materias.get(fila.idEstudiante) ?? [],
    }));
  }

  async guardarEstudiante(
    idUsuario: number,
    datos: DatosPerfilEstudiante,
  ): Promise<number> {
    return this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ idEstudiante: number }>(
        `INSERT INTO perfil_estudiante
           (id_usuario, id_carrera, anio_cursada, horas_semanales, descripcion,
            proyectos_previos, cv_url, github_url, portfolio_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id_usuario) DO UPDATE SET
            id_carrera = EXCLUDED.id_carrera,
            anio_cursada = EXCLUDED.anio_cursada,
            horas_semanales = EXCLUDED.horas_semanales,
            descripcion = EXCLUDED.descripcion,
            proyectos_previos = EXCLUDED.proyectos_previos,
            cv_url = EXCLUDED.cv_url,
            github_url = EXCLUDED.github_url,
            portfolio_url = EXCLUDED.portfolio_url
         RETURNING id_estudiante`,
        [
          idUsuario,
          datos.idCarrera,
          datos.anioCursada,
          datos.horasSemanales,
          datos.descripcion,
          datos.proyectosPrevios,
          datos.cvUrl,
          datos.githubUrl,
          datos.portfolioUrl,
        ],
      );
      const idEstudiante = rows[0].idEstudiante;

      // Las tres listas se reemplazan completas.
      await tx.query('DELETE FROM estudiante_tecnologia WHERE id_estudiante = $1', [idEstudiante]);
      await tx.query('DELETE FROM estudiante_habilidad WHERE id_estudiante = $1', [idEstudiante]);
      await tx.query('DELETE FROM materia_aprobada WHERE id_estudiante = $1', [idEstudiante]);

      if (datos.tecnologias.length > 0) {
        await tx.query(
          `INSERT INTO estudiante_tecnologia (id_estudiante, id_tecnologia, nivel)
           SELECT $1, t.id, t.nivel::nivel_tecnologia
             FROM unnest($2::bigint[], $3::text[]) AS t(id, nivel)`,
          [
            idEstudiante,
            datos.tecnologias.map((t) => t.idTecnologia),
            datos.tecnologias.map((t) => t.nivel),
          ],
        );
      }
      if (datos.habilidades.length > 0) {
        await tx.query(
          `INSERT INTO estudiante_habilidad (id_estudiante, id_habilidad)
           SELECT $1, h FROM unnest($2::bigint[]) AS h`,
          [idEstudiante, datos.habilidades],
        );
      }
      if (datos.materiasAprobadas.length > 0) {
        await tx.query(
          `INSERT INTO materia_aprobada (id_estudiante, id_materia)
           SELECT $1, m FROM unnest($2::bigint[]) AS m`,
          [idEstudiante, datos.materiasAprobadas],
        );
      }
      return idEstudiante;
    });
  }

  private async tecnologiasDe(ids: number[]) {
    const { rows } = await this.db.query<{
      idEstudiante: number;
      idTecnologia: number;
      nivel: NivelTecnologia;
    }>(
      `SELECT id_estudiante, id_tecnologia, nivel FROM estudiante_tecnologia
        WHERE id_estudiante = ANY($1::bigint[]) ORDER BY id_estudiante, id_tecnologia`,
      [ids],
    );
    return agrupar(rows, (fila) => ({
      idTecnologia: fila.idTecnologia,
      nivel: fila.nivel,
    }));
  }

  private async habilidadesDe(ids: number[]) {
    const { rows } = await this.db.query<{ idEstudiante: number; idHabilidad: number }>(
      `SELECT id_estudiante, id_habilidad FROM estudiante_habilidad
        WHERE id_estudiante = ANY($1::bigint[]) ORDER BY id_estudiante, id_habilidad`,
      [ids],
    );
    return agrupar(rows, (fila) => fila.idHabilidad);
  }

  private async materiasDe(ids: number[]) {
    const { rows } = await this.db.query<{ idEstudiante: number; idMateria: number }>(
      `SELECT id_estudiante, id_materia FROM materia_aprobada
        WHERE id_estudiante = ANY($1::bigint[]) ORDER BY id_estudiante, id_materia`,
      [ids],
    );
    return agrupar(rows, (fila) => fila.idMateria);
  }

  // -------------------------------------------------------------------------
  // Empresa y docente
  // -------------------------------------------------------------------------

  async obtenerEmpresaPorUsuario(idUsuario: number): Promise<PerfilEmpresaDto | null> {
    const { rows } = await this.db.query<PerfilEmpresaDto>(
      `SELECT id_empresa, nombre_empresa, sector, descripcion, contacto, sitio_web
         FROM perfil_empresa WHERE id_usuario = $1`,
      [idUsuario],
    );
    return rows[0] ?? null;
  }

  async guardarEmpresa(idUsuario: number, datos: DatosPerfilEmpresa): Promise<void> {
    await this.db.query(
      `INSERT INTO perfil_empresa (id_usuario, nombre_empresa, sector, descripcion, contacto, sitio_web)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id_usuario) DO UPDATE SET
          nombre_empresa = EXCLUDED.nombre_empresa,
          sector = EXCLUDED.sector,
          descripcion = EXCLUDED.descripcion,
          contacto = EXCLUDED.contacto,
          sitio_web = EXCLUDED.sitio_web`,
      [
        idUsuario,
        datos.nombreEmpresa,
        datos.sector,
        datos.descripcion,
        datos.contacto,
        datos.sitioWeb,
      ],
    );
  }

  async obtenerDocentePorUsuario(idUsuario: number): Promise<PerfilDocenteDto | null> {
    const { rows } = await this.db.query<PerfilDocenteDto>(
      `SELECT id_docente, catedra, area_investigacion, descripcion
         FROM perfil_docente WHERE id_usuario = $1`,
      [idUsuario],
    );
    return rows[0] ?? null;
  }

  async guardarDocente(idUsuario: number, datos: DatosPerfilDocente): Promise<void> {
    await this.db.query(
      `INSERT INTO perfil_docente (id_usuario, catedra, area_investigacion, descripcion)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_usuario) DO UPDATE SET
          catedra = EXCLUDED.catedra,
          area_investigacion = EXCLUDED.area_investigacion,
          descripcion = EXCLUDED.descripcion`,
      [idUsuario, datos.catedra, datos.areaInvestigacion, datos.descripcion],
    );
  }

  // -------------------------------------------------------------------------
  // Publicadores (empresa o docente)
  // -------------------------------------------------------------------------

  /** Consulta compartida: una fila por publicador, con el filtro que se le agregue. */
  private static readonly SELECT_PUBLICADORES = `
    SELECT 'empresa'::text AS tipo, e.id_empresa AS id, e.nombre_empresa AS nombre, e.id_usuario
      FROM perfil_empresa e
     WHERE ($1::bigint IS NULL OR e.id_usuario = $1::bigint)
       AND ($2::bigint[] IS NULL OR e.id_empresa = ANY($2::bigint[]))
    UNION ALL
    SELECT 'docente'::text, d.id_docente, u.nombre || ' ' || u.apellido, d.id_usuario
      FROM perfil_docente d
      JOIN usuario u ON u.id_usuario = d.id_usuario
     WHERE ($1::bigint IS NULL OR d.id_usuario = $1::bigint)
       AND ($3::bigint[] IS NULL OR d.id_docente = ANY($3::bigint[]))`;

  async obtenerPublicadorPorUsuario(idUsuario: number): Promise<PublicadorDto | null> {
    const { rows } = await this.db.query<PublicadorDto>(
      PerfilRepositorySql.SELECT_PUBLICADORES,
      [idUsuario, null, null],
    );
    return rows[0] ?? null;
  }

  async obtenerPublicadoresPorPerfil(
    referencias: ReadonlyArray<{ tipo: 'empresa' | 'docente'; id: number }>,
  ): Promise<PublicadorDto[]> {
    const empresas = referencias.filter((r) => r.tipo === 'empresa').map((r) => r.id);
    const docentes = referencias.filter((r) => r.tipo === 'docente').map((r) => r.id);
    if (empresas.length === 0 && docentes.length === 0) return [];
    // Un arreglo vacío filtra todo ("= ANY('{}')" es falso); `null` no filtra.
    const { rows } = await this.db.query<PublicadorDto>(
      PerfilRepositorySql.SELECT_PUBLICADORES,
      [null, empresas, docentes],
    );
    return rows;
  }
}

function agrupar<F extends { idEstudiante: number }, V>(
  filas: F[],
  valor: (fila: F) => V,
): Map<number, V[]> {
  const mapa = new Map<number, V[]>();
  for (const fila of filas) {
    const lista = mapa.get(fila.idEstudiante) ?? [];
    lista.push(valor(fila));
    mapa.set(fila.idEstudiante, lista);
  }
  return mapa;
}
