import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleInit,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ErrorProhibido, ErrorReglaNegocio } from '../compartido/dominio/errores.js';
import {
  PUBLICADOR_EVENTOS,
  type EventosDominio,
  type PublicadorEventos,
} from '../compartido/dominio/eventos.js';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { PerfilesService } from '../perfiles/aplicacion/perfiles.service.js';
import type { PerfilMatchingDto } from '../perfiles/dominio/perfil.js';
import { ProyectosService, type ProyectoDto } from '../proyectos/proyectos.service.js';
import type { EstadoPostulacion } from './estado-postulacion.js';
import { MatchingRepository, type FilaMatch } from './matching.repository.js';
import { analizarTecnologias, calcularPares } from './motor.js';
import { PostulacionesRepository } from './postulaciones.repository.js';

interface Puntajes {
  tecnologias: number;
  texto: number | null;
  contexto: number;
}

/** Un proyecto recomendado a un estudiante (docs/api/CONTRATO.md, sección 5.1). */
export interface RecomendacionProyectoDto {
  proyecto: ProyectoDto;
  puntajeTotal: number;
  puntajes: Puntajes;
  tecnologiasCoincidentes: string[];
  tecnologiasFaltantes: string[];
  postulacion: { idPostulacion: number; estado: EstadoPostulacion } | null;
  invitacionPendiente: { idInvitacion: number } | null;
}

/** Un estudiante recomendado para un proyecto (docs/api/CONTRATO.md, sección 5.1). */
export interface RecomendacionEstudianteDto {
  estudiante: {
    idEstudiante: number;
    nombre: string;
    apellido: string;
    carrera: string;
    anioCursada: number;
    horasSemanales: number;
    tecnologias: Array<{ nombre: string; nivel: string }>;
  };
  puntajeTotal: number;
  puntajes: Puntajes;
  tecnologiasCoincidentes: string[];
  tecnologiasFaltantes: string[];
  idPostulacion: number | null;
  idInvitacion: number | null;
}

const puntajesDe = (fila: FilaMatch): Puntajes => ({
  tecnologias: fila.puntajeTecnologias,
  texto: fila.puntajeTexto,
  contexto: fila.puntajeContexto,
});

/**
 * M3: el motor de recomendación. Guarda en `match` el puntaje de cada estudiante activo con
 * cada proyecto que no es borrador, y recomienda solo los proyectos publicados.
 *
 * Los puntajes se recalculan solos: al arrancar con la tabla vacía, al guardar un perfil de
 * estudiante y al publicar, editar o reactivar un proyecto (solo los pares afectados, RNF-06).
 */
@Injectable()
export class MatchingService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger('Matching');

  constructor(
    private readonly repositorio: MatchingRepository,
    private readonly postulaciones: PostulacionesRepository,
    private readonly proyectos: ProyectosService,
    private readonly perfiles: PerfilesService,
    @Inject(PUBLICADOR_EVENTOS) private readonly eventos: PublicadorEventos,
  ) {}

  /** Le da a M2 lo que necesita de M3 para completar el `ProyectoDto`. */
  onModuleInit(): void {
    this.proyectos.registrarDatosDeMatching({
      contarPostulaciones: (idsProyecto) => this.postulaciones.contarPorProyecto(idsProyecto),
      compatibilidades: async (idEstudiante, idsProyecto) => {
        const { idConfiguracion } = await this.repositorio.configuracionActiva();
        const puntajes = await this.repositorio.puntajesDeEstudiante(idConfiguracion, idEstudiante);
        return new Map(
          puntajes
            .filter((p) => idsProyecto.includes(p.idProyecto))
            .map((p) => [p.idProyecto, p.puntajeTotal]),
        );
      },
    });
  }

  /** El seed no trae puntajes (a propósito): en el primer arranque se calculan todos. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const { idConfiguracion } = await this.repositorio.configuracionActiva();
      if (await this.repositorio.hayPuntajes(idConfiguracion)) return;
      const { pares, milisegundos } = await this.recalcularTodo();
      this.logger.log(`Puntajes iniciales calculados: ${pares} pares en ${milisegundos} ms`);
    } catch (error) {
      // Sin puntajes la aplicación sigue andando; el administrador puede recalcular después.
      this.logger.error(`No se pudieron calcular los puntajes iniciales: ${String(error)}`);
    }
  }

  // =========================================================================
  // Recomendaciones
  // =========================================================================

  /** `GET /matching/recomendaciones`: los proyectos publicados con puntaje desde el umbral. */
  async recomendacionesParaEstudiante(
    usuario: UsuarioAutenticado,
    limite: number,
  ): Promise<RecomendacionProyectoDto[]> {
    const perfil = await this.perfilDeEstudiante(usuario.idUsuario);
    const configuracion = await this.repositorio.configuracionActiva();
    const puntajes = await this.repositorio.puntajesDeEstudiante(
      configuracion.idConfiguracion,
      perfil.idEstudiante,
      configuracion.umbralRecomendacion,
    );
    const proyectos = await this.proyectos.obtenerVarios(
      puntajes.map((p) => p.idProyecto),
      usuario,
    );
    const publicados = new Map(
      proyectos.filter((p) => p.estado === 'publicado').map((p) => [p.idProyecto, p]),
    );
    const [postulaciones, invitaciones] = await Promise.all([
      this.postulaciones.listarPostulaciones({ idEstudiante: perfil.idEstudiante }),
      this.postulaciones.listarInvitaciones({ idEstudiante: perfil.idEstudiante }),
    ]);
    const tecnologiasDelEstudiante = perfil.tecnologias.map((t) => t.idTecnologia);

    return puntajes
      .filter((p) => publicados.has(p.idProyecto))
      .slice(0, limite)
      .map((puntaje) => {
        const proyecto = publicados.get(puntaje.idProyecto)!;
        const postulacion = postulaciones.find((x) => x.idProyecto === proyecto.idProyecto);
        const invitacion = invitaciones.find(
          (x) => x.idProyecto === proyecto.idProyecto && x.estado === 'pendiente',
        );
        const { coincidentes, faltantes } = analizarTecnologias(tecnologiasDelEstudiante, proyecto);
        return {
          proyecto,
          puntajeTotal: puntaje.puntajeTotal,
          puntajes: puntajesDe(puntaje),
          tecnologiasCoincidentes: coincidentes,
          tecnologiasFaltantes: faltantes,
          postulacion: postulacion
            ? { idPostulacion: postulacion.idPostulacion, estado: postulacion.estado }
            : null,
          invitacionPendiente: invitacion ? { idInvitacion: invitacion.idInvitacion } : null,
        };
      });
  }

  /** `GET /matching/proyectos/:id/recomendados`: los estudiantes activos con puntaje desde el umbral. */
  async recomendadosParaProyecto(
    idProyecto: number,
    usuario: UsuarioAutenticado,
    limite: number,
  ): Promise<RecomendacionEstudianteDto[]> {
    const proyecto = await this.proyectos.obtener(idProyecto, usuario);
    if (proyecto.publicador.idUsuario !== usuario.idUsuario) {
      throw new ErrorProhibido('Solo quien publicó el proyecto puede ver sus estudiantes recomendados');
    }
    const configuracion = await this.repositorio.configuracionActiva();
    const puntajes = await this.repositorio.puntajesDeProyecto(
      configuracion.idConfiguracion,
      idProyecto,
      configuracion.umbralRecomendacion,
    );
    // Solo los estudiantes activos: el perfil de matching ya viene filtrado así.
    const activos = new Set(
      (
        await this.perfiles.listarPerfilesParaMatching({
          idsEstudiante: puntajes.map((p) => p.idEstudiante),
        })
      ).map((p) => p.idEstudiante),
    );
    const elegidos = puntajes.filter((p) => activos.has(p.idEstudiante)).slice(0, limite);
    const [estudiantes, postulaciones, invitaciones] = await Promise.all([
      this.perfiles.obtenerEstudiantes(elegidos.map((p) => p.idEstudiante)),
      this.postulaciones.listarPostulaciones({ idProyecto }),
      this.postulaciones.listarInvitaciones({ idProyecto }),
    ]);

    return elegidos.map((puntaje) => {
      const estudiante = estudiantes.find((e) => e.idEstudiante === puntaje.idEstudiante)!;
      const { coincidentes, faltantes } = analizarTecnologias(
        estudiante.tecnologias.map((t) => t.idTecnologia),
        proyecto,
      );
      return {
        estudiante: {
          idEstudiante: estudiante.idEstudiante,
          nombre: estudiante.nombre,
          apellido: estudiante.apellido,
          carrera: estudiante.carrera,
          anioCursada: estudiante.anioCursada,
          horasSemanales: estudiante.horasSemanales,
          tecnologias: estudiante.tecnologias.map(({ nombre, nivel }) => ({ nombre, nivel })),
        },
        puntajeTotal: puntaje.puntajeTotal,
        puntajes: puntajesDe(puntaje),
        tecnologiasCoincidentes: coincidentes,
        tecnologiasFaltantes: faltantes,
        idPostulacion:
          postulaciones.find((x) => x.idEstudiante === estudiante.idEstudiante)?.idPostulacion ?? null,
        idInvitacion:
          invitaciones.find((x) => x.idEstudiante === estudiante.idEstudiante)?.idInvitacion ?? null,
      };
    });
  }

  // =========================================================================
  // Recálculo
  // =========================================================================

  /** Recalcula todos los pares con la configuración activa. */
  async recalcularTodo(): Promise<{ pares: number; milisegundos: number }> {
    const inicio = Date.now();
    const configuracion = await this.repositorio.configuracionActiva();
    const [perfiles, proyectos] = await Promise.all([
      this.perfiles.listarPerfilesParaMatching(),
      this.proyectos.listarParaMatching(),
    ]);
    const pares = calcularPares(perfiles, proyectos, configuracion);
    await this.repositorio.reemplazarPuntajes(configuracion.idConfiguracion, pares);
    return { pares: pares.length, milisegundos: Date.now() - inicio };
  }

  /** Un estudiante guardó su perfil: se recalcula ese estudiante con todos los proyectos. */
  @OnEvent('perfil.actualizado')
  async alActualizarPerfil({ idEstudiante }: EventosDominio['perfil.actualizado']): Promise<void> {
    if (idEstudiante === null) return;
    const configuracion = await this.repositorio.configuracionActiva();
    const [perfiles, proyectos] = await Promise.all([
      this.perfiles.listarPerfilesParaMatching({ idsEstudiante: [idEstudiante] }),
      this.proyectos.listarParaMatching(),
    ]);
    await this.repositorio.guardarPuntajes(
      configuracion.idConfiguracion,
      calcularPares(perfiles, proyectos, configuracion),
    );
  }

  @OnEvent('proyecto.publicado')
  async alPublicarProyecto({ idProyecto }: EventosDominio['proyecto.publicado']): Promise<void> {
    await this.recalcularProyecto(idProyecto);
  }

  @OnEvent('proyecto.actualizado')
  async alEditarProyecto({ idProyecto }: EventosDominio['proyecto.actualizado']): Promise<void> {
    await this.recalcularProyecto(idProyecto);
  }

  /** Solo la reactivación (vuelve a `publicado`) cambia algo: los demás estados no cambian el puntaje. */
  @OnEvent('proyecto.estado_cambiado')
  async alCambiarEstadoProyecto({
    idProyecto,
    estadoNuevo,
  }: EventosDominio['proyecto.estado_cambiado']): Promise<void> {
    if (estadoNuevo === 'publicado') await this.recalcularProyecto(idProyecto);
  }

  /**
   * Recalcula un proyecto con todos los estudiantes activos. Si está publicado, avisa
   * (`match.nuevo`) a los estudiantes que recién ahora llegan al umbral.
   */
  private async recalcularProyecto(idProyecto: number): Promise<void> {
    const configuracion = await this.repositorio.configuracionActiva();
    const proyectos = await this.proyectos.listarParaMatching();
    const proyecto = proyectos.find((p) => p.idProyecto === idProyecto);
    if (!proyecto) return; // un borrador no se puntúa
    const [perfiles, anteriores] = await Promise.all([
      this.perfiles.listarPerfilesParaMatching(),
      this.repositorio.puntajesDeProyecto(configuracion.idConfiguracion, idProyecto),
    ]);
    // El corpus del texto son todos los proyectos, para que el puntaje no dependa de qué se recalculó.
    const pares = calcularPares(perfiles, [proyecto], configuracion, proyectos);
    await this.repositorio.guardarPuntajes(configuracion.idConfiguracion, pares);
    if (proyecto.estado !== 'publicado') return;

    const umbral = configuracion.umbralRecomendacion;
    const yaRecomendados = new Set(
      anteriores.filter((a) => a.puntajeTotal >= umbral).map((a) => a.idEstudiante),
    );
    for (const par of pares) {
      if (par.total < umbral || yaRecomendados.has(par.idEstudiante)) continue;
      const perfil = perfiles.find((p) => p.idEstudiante === par.idEstudiante)!;
      await this.eventos.publicar('match.nuevo', {
        idEstudiante: par.idEstudiante,
        idUsuarioEstudiante: perfil.idUsuario,
        idProyecto,
        tituloProyecto: proyecto.titulo,
        puntajeTotal: par.total,
      });
    }
  }

  // =========================================================================
  // Internos
  // =========================================================================

  /** El perfil del estudiante que llama. 422 si todavía no lo completó. */
  private async perfilDeEstudiante(idUsuario: number): Promise<PerfilMatchingDto> {
    const idEstudiante = await this.perfiles.obtenerIdEstudiante(idUsuario);
    const [perfil] =
      idEstudiante === null
        ? []
        : await this.perfiles.listarPerfilesParaMatching({ idsEstudiante: [idEstudiante] });
    if (!perfil) throw new ErrorReglaNegocio('Complete su perfil para recibir recomendaciones');
    return perfil;
  }
}
