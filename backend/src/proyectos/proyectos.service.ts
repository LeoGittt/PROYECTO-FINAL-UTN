import { Inject, Injectable } from '@nestjs/common';
import { CatalogosService } from '../administracion/catalogos/aplicacion/catalogos.service.js';
import {
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorProhibido,
  ErrorReglaNegocio,
  type DetalleError,
} from '../compartido/dominio/errores.js';
import { PUBLICADOR_EVENTOS, type PublicadorEventos } from '../compartido/dominio/eventos.js';
import { armarPagina, normalizarPaginacion, type Pagina } from '../compartido/dominio/paginacion.js';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { PerfilesService } from '../perfiles/aplicacion/perfiles.service.js';
import type { PublicadorDto } from '../perfiles/dominio/perfil.js';
import type { DatosProyecto, EstadoProyecto, FiltrosBusqueda } from './esquemas.js';
import { ProyectosRepository, type FilaProyecto } from './proyectos.repository.js';

/** Un proyecto como lo ve la API (docs/api/CONTRATO.md, sección 4). */
export interface ProyectoDto {
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
  publicador: PublicadorDto;
  tecnologias: Array<{ idTecnologia: number; nombre: string; categoria: string; obligatoria: boolean }>;
  habilidades: Array<{ idHabilidad: number; nombre: string }>;
  /** Solo para el publicador dueño y el administrador. */
  cantidadPostulaciones?: number;
  /** Solo para un estudiante con perfil, cuando el motor calculó el par. */
  compatibilidad?: number;
}

/**
 * Lo que M3 le informa a M2 para completar el `ProyectoDto`. M3 depende de M2 (y no al
 * revés), así que M3 lo registra al iniciar con `registrarDatosDeMatching`.
 */
export interface DatosDeMatching {
  contarPostulaciones(idsProyecto: number[]): Promise<Map<number, number>>;
  compatibilidades(idEstudiante: number, idsProyecto: number[]): Promise<Map<number, number>>;
}

/**
 * Cambios de estado que hace el dueño con `PATCH /proyectos/:id/estado`. Publicar tiene su
 * propia ruta y suspender o reactivar son del administrador. Un borrador no se cancela: la base
 * exige fecha de publicación fuera del borrador, así que contaría como publicado.
 */
const TRANSICIONES_DEL_DUENO: Partial<Record<EstadoProyecto, EstadoProyecto[]>> = {
  publicado: ['en_curso', 'cancelado'],
  en_curso: ['finalizado', 'cancelado'],
};

const nombreEstado = (estado: EstadoProyecto) => estado.replace('_', ' ');

/**
 * M2: alta, edición, estados y búsqueda de proyectos. También es la API de M2 para los demás
 * módulos (`obtener`, `obtenerVarios`, `listarParaMatching`): nadie más lee sus tablas.
 */
@Injectable()
export class ProyectosService {
  private datosDeMatching?: DatosDeMatching;

  constructor(
    private readonly repositorio: ProyectosRepository,
    private readonly perfiles: PerfilesService,
    private readonly catalogos: CatalogosService,
    @Inject(PUBLICADOR_EVENTOS) private readonly eventos: PublicadorEventos,
  ) {}

  registrarDatosDeMatching(datos: DatosDeMatching): void {
    this.datosDeMatching = datos;
  }

  // =========================================================================
  // Alta, edición y estados (solo el dueño)
  // =========================================================================

  /** 422 si el publicador no completó su perfil o si alguna tecnología o habilidad no existe. */
  async crear(
    usuario: UsuarioAutenticado,
    datos: DatosProyecto & { publicar: boolean },
  ): Promise<ProyectoDto> {
    const publicador = await this.perfiles.obtenerPublicador(usuario.idUsuario);
    await this.validarCatalogos(datos);
    const idProyecto = await this.repositorio.crear(publicador, datos, datos.publicar);
    if (datos.publicar) {
      await this.eventos.publicar('proyecto.publicado', { idProyecto, titulo: datos.titulo });
    }
    return this.obtener(idProyecto, usuario);
  }

  async editar(
    idProyecto: number,
    usuario: UsuarioAutenticado,
    datos: DatosProyecto,
  ): Promise<ProyectoDto> {
    await this.obtenerPropio(idProyecto, usuario);
    await this.validarCatalogos(datos);
    if (!(await this.repositorio.reemplazar(idProyecto, datos))) {
      throw new ErrorConflicto('Un proyecto finalizado, cancelado o suspendido no se puede editar');
    }
    await this.eventos.publicar('proyecto.actualizado', { idProyecto });
    return this.obtener(idProyecto, usuario);
  }

  async publicar(idProyecto: number, usuario: UsuarioAutenticado): Promise<ProyectoDto> {
    const proyecto = await this.obtenerPropio(idProyecto, usuario);
    const publicado =
      proyecto.estado === 'borrador' &&
      (await this.repositorio.cambiarEstado(idProyecto, 'borrador', 'publicado'));
    if (!publicado) throw new ErrorConflicto('Solo se puede publicar un proyecto en borrador');
    await this.eventos.publicar('proyecto.publicado', { idProyecto, titulo: proyecto.titulo });
    return this.obtener(idProyecto, usuario);
  }

  async cambiarEstado(
    idProyecto: number,
    usuario: UsuarioAutenticado,
    estadoNuevo: EstadoProyecto,
  ): Promise<ProyectoDto> {
    const proyecto = await this.obtenerPropio(idProyecto, usuario);
    if (!TRANSICIONES_DEL_DUENO[proyecto.estado]?.includes(estadoNuevo)) {
      throw new ErrorConflicto(
        `Un proyecto ${nombreEstado(proyecto.estado)} no puede pasar a ${nombreEstado(estadoNuevo)}`,
      );
    }
    await this.aplicarCambioDeEstado(proyecto, estadoNuevo);
    return this.obtener(idProyecto, usuario);
  }

  // =========================================================================
  // Consultas
  // =========================================================================

  /**
   * Un proyecto, completado para quien lo pide. Un borrador o un suspendido solo lo ven su
   * dueño y el administrador: para el resto no existe (404).
   */
  async obtener(idProyecto: number, solicitante: UsuarioAutenticado): Promise<ProyectoDto> {
    const [proyecto] = await this.obtenerVarios([idProyecto], solicitante);
    const oculto = proyecto && (proyecto.estado === 'borrador' || proyecto.estado === 'suspendido');
    if (!proyecto || (oculto && !esDuenoOAdmin(proyecto, solicitante))) {
      throw new ErrorNoEncontrado('El proyecto no existe');
    }
    return proyecto;
  }

  /** Los proyectos del publicador que llama. 422 si todavía no completó su perfil. */
  async listarMios(usuario: UsuarioAutenticado, estado?: EstadoProyecto): Promise<ProyectoDto[]> {
    const publicador = await this.perfiles.obtenerPublicador(usuario.idUsuario);
    const filas = await this.repositorio.listarDePublicador(publicador, estado);
    return this.armarDtos(filas, usuario);
  }

  /** `GET /proyectos`: búsqueda paginada entre los proyectos publicados. */
  async buscar(
    filtros: FiltrosBusqueda,
    solicitante: UsuarioAutenticado,
  ): Promise<Pagina<ProyectoDto>> {
    const paginacion = normalizarPaginacion(filtros);
    const { filas, total } = await this.repositorio.buscarPublicados(filtros, paginacion);
    return armarPagina(await this.armarDtos(filas, solicitante), total, paginacion);
  }

  /**
   * Los proyectos que existen entre los pedidos, en cualquier estado y sin controlar quién
   * los ve (eso lo decide quien llama). Con `solicitante` se completan como en `obtener`.
   */
  async obtenerVarios(
    ids: readonly number[],
    solicitante?: UsuarioAutenticado,
  ): Promise<ProyectoDto[]> {
    return this.armarDtos(await this.repositorio.buscarPorIds(ids), solicitante);
  }

  // =========================================================================
  // Administración (M5)
  // =========================================================================

  /** Todos los proyectos, con la cantidad de postulaciones (solo el administrador). */
  async listarTodos(estado: EstadoProyecto | undefined, admin: UsuarioAutenticado): Promise<ProyectoDto[]> {
    return this.armarDtos(await this.repositorio.listarTodos(estado), admin);
  }

  contarPorEstado(): Promise<Partial<Record<EstadoProyecto, number>>> {
    return this.repositorio.contarPorEstado();
  }

  /** La administración suspende un proyecto publicado o en curso: deja de mostrarse a los estudiantes. */
  async suspender(idProyecto: number, motivo: string, admin: UsuarioAutenticado): Promise<ProyectoDto> {
    const proyecto = await this.obtener(idProyecto, admin);
    if (proyecto.estado !== 'publicado' && proyecto.estado !== 'en_curso') {
      throw new ErrorConflicto('Solo se puede suspender un proyecto publicado o en curso');
    }
    await this.aplicarCambioDeEstado(proyecto, 'suspendido', motivo);
    return this.obtener(idProyecto, admin);
  }

  /** Un proyecto suspendido vuelve a estar publicado. */
  async reactivar(idProyecto: number, admin: UsuarioAutenticado): Promise<ProyectoDto> {
    const proyecto = await this.obtener(idProyecto, admin);
    if (proyecto.estado !== 'suspendido') {
      throw new ErrorConflicto('Solo se puede reactivar un proyecto suspendido');
    }
    await this.aplicarCambioDeEstado(proyecto, 'publicado');
    return this.obtener(idProyecto, admin);
  }

  /** Los proyectos que puntúa el motor: todos menos los borradores. */
  async listarParaMatching(): Promise<ProyectoDto[]> {
    return this.armarDtos(await this.repositorio.listarParaMatching());
  }

  // =========================================================================
  // Internos
  // =========================================================================

  /** El proyecto, si quien llama es su dueño (403 si es de otro, 404 si no lo puede ver). */
  private async obtenerPropio(idProyecto: number, usuario: UsuarioAutenticado): Promise<ProyectoDto> {
    const proyecto = await this.obtener(idProyecto, usuario);
    if (proyecto.publicador.idUsuario !== usuario.idUsuario) {
      throw new ErrorProhibido('Solo quien publicó el proyecto puede modificarlo');
    }
    return proyecto;
  }

  /** Cambia el estado si nadie lo cambió mientras tanto, y avisa con `proyecto.estado_cambiado`. */
  private async aplicarCambioDeEstado(
    proyecto: ProyectoDto,
    estadoNuevo: EstadoProyecto,
    motivo?: string,
  ): Promise<void> {
    if (!(await this.repositorio.cambiarEstado(proyecto.idProyecto, proyecto.estado, estadoNuevo))) {
      throw new ErrorConflicto('El proyecto cambió de estado mientras tanto. Recargue la página');
    }
    await this.eventos.publicar('proyecto.estado_cambiado', {
      idProyecto: proyecto.idProyecto,
      titulo: proyecto.titulo,
      idUsuarioPublicador: proyecto.publicador.idUsuario,
      estadoAnterior: proyecto.estado,
      estadoNuevo,
      motivo,
    });
  }

  private async validarCatalogos(datos: DatosProyecto): Promise<void> {
    const [tecnologias, habilidades] = await Promise.all([
      this.catalogos.obtenerTecnologias(datos.tecnologias.map((t) => t.idTecnologia)),
      this.catalogos.obtenerHabilidades(datos.habilidades),
    ]);
    const detalles: DetalleError[] = [];
    if (tecnologias.length !== datos.tecnologias.length) {
      detalles.push({ campo: 'tecnologias', mensaje: 'Alguna de las tecnologías no existe' });
    }
    if (habilidades.length !== datos.habilidades.length) {
      detalles.push({ campo: 'habilidades', mensaje: 'Alguna de las habilidades no existe' });
    }
    if (detalles.length > 0) {
      throw new ErrorReglaNegocio(
        detalles.length === 1 ? detalles[0].mensaje : 'El proyecto tiene datos que no existen',
        detalles,
      );
    }
  }

  /** Completa las filas con los nombres del publicador, las tecnologías y las habilidades. */
  private async armarDtos(
    filas: FilaProyecto[],
    solicitante?: UsuarioAutenticado,
  ): Promise<ProyectoDto[]> {
    if (filas.length === 0) return [];
    const [publicadores, tecnologias, habilidades] = await Promise.all([
      this.perfiles.obtenerPublicadores(
        filas.map((f) => ({ tipo: f.tipoPublicador, id: f.idPublicador })),
      ),
      this.catalogos.obtenerTecnologias(filas.flatMap((f) => f.tecnologias.map((t) => t.idTecnologia))),
      this.catalogos.obtenerHabilidades(filas.flatMap((f) => f.habilidades)),
    ]);
    const publicadorDe = new Map(publicadores.map((p) => [`${p.tipo}-${p.id}`, p]));
    const tecnologiaDe = new Map(tecnologias.map((t) => [t.idTecnologia, t]));
    const habilidadDe = new Map(habilidades.map((h) => [h.idHabilidad, h]));

    const proyectos: ProyectoDto[] = filas.map(
      ({ tipoPublicador, idPublicador, tecnologias, habilidades, ...datos }) => ({
        ...datos,
        publicador: publicadorDe.get(`${tipoPublicador}-${idPublicador}`)!,
        tecnologias: tecnologias.map(({ idTecnologia, obligatoria }) => ({
          idTecnologia,
          nombre: tecnologiaDe.get(idTecnologia)?.nombre ?? '',
          categoria: tecnologiaDe.get(idTecnologia)?.categoria ?? '',
          obligatoria,
        })),
        habilidades: habilidades.map((idHabilidad) => ({
          idHabilidad,
          nombre: habilidadDe.get(idHabilidad)?.nombre ?? '',
        })),
      }),
    );
    if (solicitante) await this.completarParaSolicitante(proyectos, solicitante);
    return proyectos;
  }

  /** `cantidadPostulaciones` para el dueño y el admin; `compatibilidad` para un estudiante con perfil. */
  private async completarParaSolicitante(
    proyectos: ProyectoDto[],
    solicitante: UsuarioAutenticado,
  ): Promise<void> {
    if (!this.datosDeMatching) return;
    const propios = proyectos.filter((p) => esDuenoOAdmin(p, solicitante));
    if (propios.length > 0) {
      const cantidades = await this.datosDeMatching.contarPostulaciones(
        propios.map((p) => p.idProyecto),
      );
      for (const p of propios) p.cantidadPostulaciones = cantidades.get(p.idProyecto) ?? 0;
    }
    if (solicitante.rol !== 'estudiante') return;
    const idEstudiante = await this.perfiles.obtenerIdEstudiante(solicitante.idUsuario);
    if (idEstudiante === null) return;
    const puntajes = await this.datosDeMatching.compatibilidades(
      idEstudiante,
      proyectos.map((p) => p.idProyecto),
    );
    for (const p of proyectos) {
      const puntaje = puntajes.get(p.idProyecto);
      if (puntaje !== undefined) p.compatibilidad = puntaje;
    }
  }
}

function esDuenoOAdmin(proyecto: ProyectoDto, usuario: UsuarioAutenticado): boolean {
  return usuario.rol === 'administrador' || proyecto.publicador.idUsuario === usuario.idUsuario;
}
