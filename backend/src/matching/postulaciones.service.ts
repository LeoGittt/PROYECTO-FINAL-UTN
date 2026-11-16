import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorProhibido,
  ErrorReglaNegocio,
} from '../compartido/dominio/errores.js';
import { PUBLICADOR_EVENTOS, type PublicadorEventos } from '../compartido/dominio/eventos.js';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { PerfilesService } from '../perfiles/aplicacion/perfiles.service.js';
import { ProyectosService, type ProyectoDto } from '../proyectos/proyectos.service.js';
import { evaluarTransicion, type EstadoPostulacion } from './estado-postulacion.js';
import { MatchingRepository } from './matching.repository.js';
import {
  PostulacionesRepository,
  type FilaHistorial,
  type FilaInvitacion,
  type FilaPostulacion,
} from './postulaciones.repository.js';

/** docs/api/CONTRATO.md, sección 5.4. */
export interface PostulacionDto {
  idPostulacion: number;
  estado: EstadoPostulacion;
  mensajePresentacion: string | null;
  fechaPostulacion: string;
  fechaActualizacion: string;
  proyecto: { idProyecto: number; titulo: string; estado: string; publicador: string };
  estudiante: {
    idEstudiante: number;
    nombre: string;
    apellido: string;
    /** Solo para el publicador dueño y el administrador. */
    email?: string;
    carrera: string;
    anioCursada: number;
    tecnologias: Array<{ nombre: string; nivel: string }>;
  };
  puntajeTotal: number | null;
  /** Solo en el detalle. */
  historial?: FilaHistorial[];
}

/** docs/api/CONTRATO.md, sección 5.5. */
export interface InvitacionDto {
  idInvitacion: number;
  proyecto: { idProyecto: number; titulo: string; publicador: string };
  estudiante: { idEstudiante: number; nombre: string; apellido: string };
  mensaje: string | null;
  estado: FilaInvitacion['estado'];
  fechaInvitacion: string;
  fechaRespuesta: string | null;
}

const NO_RECIBE_POSTULACIONES = 'El proyecto no está recibiendo postulaciones';

const esDueno = (proyecto: ProyectoDto, usuario: UsuarioAutenticado) =>
  proyecto.publicador.idUsuario === usuario.idUsuario;

/** M3: postulaciones (con su máquina de estados) e invitaciones. */
@Injectable()
export class PostulacionesService implements OnModuleInit {
  constructor(
    private readonly repositorio: PostulacionesRepository,
    private readonly matching: MatchingRepository,
    private readonly proyectos: ProyectosService,
    private readonly perfiles: PerfilesService,
    @Inject(PUBLICADOR_EVENTOS) private readonly eventos: PublicadorEventos,
  ) {}

  /**
   * M1 muestra el email de un estudiante a un publicador solo si el estudiante tiene una
   * postulación o una invitación en un proyecto suyo. Esa información es de M3.
   */
  onModuleInit(): void {
    this.perfiles.registrarFuenteVisibilidadContacto({
      publicadorTieneRelacionConEstudiante: async (idUsuarioPublicador, idEstudiante) => {
        const ids = await this.repositorio.proyectosConRelacion(idEstudiante);
        const proyectos = await this.proyectos.obtenerVarios(ids);
        return proyectos.some((p) => p.publicador.idUsuario === idUsuarioPublicador);
      },
    });
  }

  // =========================================================================
  // Postulaciones
  // =========================================================================

  async postularse(
    usuario: UsuarioAutenticado,
    datos: { idProyecto: number; mensajePresentacion: string | null },
  ): Promise<PostulacionDto> {
    const idEstudiante = await this.idEstudianteConPerfil(usuario, 'Complete su perfil antes de postularse');
    const proyecto = await this.proyectos.obtener(datos.idProyecto, usuario);
    if (proyecto.estado !== 'publicado') throw new ErrorReglaNegocio(NO_RECIBE_POSTULACIONES);
    // Si lo invitaron, tiene que responder la invitación: aceptarla ya crea la postulación.
    const invitaciones = await this.repositorio.listarInvitaciones({
      idEstudiante,
      idProyecto: proyecto.idProyecto,
    });
    if (invitaciones.some((i) => i.estado === 'pendiente')) {
      throw new ErrorConflicto('Ya tiene una invitación a este proyecto: respóndala desde Invitaciones');
    }
    const idPostulacion = await this.repositorio.crearPostulacion({
      idEstudiante,
      idProyecto: proyecto.idProyecto,
      mensajePresentacion: datos.mensajePresentacion,
      idUsuarioResponsable: usuario.idUsuario,
    });
    await this.avisarPostulacionCreada(idPostulacion, proyecto, usuario.idUsuario);
    return this.obtener(idPostulacion, usuario);
  }

  /** Las postulaciones del estudiante que llama (vacío si todavía no tiene perfil). */
  async listarMias(usuario: UsuarioAutenticado, estado?: EstadoPostulacion): Promise<PostulacionDto[]> {
    const idEstudiante = await this.perfiles.obtenerIdEstudiante(usuario.idUsuario);
    if (idEstudiante === null) return [];
    const filas = await this.repositorio.listarPostulaciones({ idEstudiante, estado });
    return this.armarPostulaciones(filas, usuario);
  }

  /** Para los reportes de M5. */
  contarPorEstado(): Promise<Partial<Record<EstadoPostulacion, number>>> {
    return this.repositorio.contarPorEstado();
  }

  /**
   * Para M4: los usuarios de los estudiantes con una postulación activa (ni rechazada ni
   * retirada) en el proyecto, a quienes se avisa cuando el proyecto cambia de estado.
   */
  async usuariosConPostulacionActiva(idProyecto: number): Promise<number[]> {
    const filas = await this.repositorio.listarPostulaciones({ idProyecto });
    const activas = filas.filter((f) => f.estado !== 'rechazada' && f.estado !== 'retirada');
    const estudiantes = await this.perfiles.obtenerEstudiantes(activas.map((f) => f.idEstudiante));
    return estudiantes.map((e) => e.idUsuario);
  }

  /** Las postulaciones de un proyecto: solo para su dueño y el administrador. */
  async listarDeProyecto(
    idProyecto: number,
    usuario: UsuarioAutenticado,
    estado?: EstadoPostulacion,
  ): Promise<PostulacionDto[]> {
    const proyecto = await this.proyectos.obtener(idProyecto, usuario);
    if (!esDueno(proyecto, usuario) && usuario.rol !== 'administrador') {
      throw new ErrorProhibido('Solo quien publicó el proyecto puede ver sus postulaciones');
    }
    const filas = await this.repositorio.listarPostulaciones({ idProyecto, estado });
    return this.armarPostulaciones(filas, usuario);
  }

  /** El detalle, con el historial: para el estudiante, el dueño del proyecto o el administrador. */
  async obtener(idPostulacion: number, usuario: UsuarioAutenticado): Promise<PostulacionDto> {
    const { fila, proyecto, actor } = await this.buscarConActor(idPostulacion, usuario);
    if (!actor && usuario.rol !== 'administrador') {
      throw new ErrorProhibido('No tiene permiso para ver esta postulación');
    }
    const [postulacion] = await this.armarPostulaciones([fila], usuario, [proyecto]);
    return { ...postulacion, historial: await this.repositorio.historial(idPostulacion) };
  }

  /**
   * Cambia el estado según la máquina de estados: el estudiante solo puede retirarse y el
   * publicador del proyecto mueve los demás estados. 403 si no le corresponde, 409 si la
   * transición no existe.
   */
  async cambiarEstado(
    idPostulacion: number,
    usuario: UsuarioAutenticado,
    estadoNuevo: EstadoPostulacion,
  ): Promise<PostulacionDto> {
    const { fila, proyecto, actor } = await this.buscarConActor(idPostulacion, usuario);
    if (!actor) {
      throw new ErrorProhibido('Solo el estudiante o quien publicó el proyecto pueden cambiar esta postulación');
    }
    const resultado = evaluarTransicion({ desde: fila.estado, hacia: estadoNuevo, actor });
    if (!resultado.ok && resultado.motivo === 'actor_no_autorizado') {
      throw new ErrorProhibido(
        actor === 'estudiante'
          ? 'El estudiante solo puede retirar su postulación'
          : 'Solo el estudiante puede retirar su postulación',
      );
    }
    if (!resultado.ok) {
      throw new ErrorConflicto(
        `Una postulación ${fila.estado.replace('_', ' ')} no puede pasar a ${estadoNuevo.replace('_', ' ')}`,
      );
    }
    const cambiado = await this.repositorio.cambiarEstado(
      idPostulacion,
      fila.estado,
      estadoNuevo,
      usuario.idUsuario,
    );
    if (!cambiado) throw new ErrorConflicto('La postulación cambió de estado mientras tanto. Recargue la página');

    const [estudiante] = await this.perfiles.obtenerEstudiantes([fila.idEstudiante]);
    await this.eventos.publicar('postulacion.estado_cambiado', {
      idPostulacion,
      idProyecto: proyecto.idProyecto,
      tituloProyecto: proyecto.titulo,
      idUsuarioEstudiante: estudiante.idUsuario,
      idUsuarioPublicador: proyecto.publicador.idUsuario,
      estadoAnterior: fila.estado,
      estadoNuevo,
    });
    return this.obtener(idPostulacion, usuario);
  }

  // =========================================================================
  // Invitaciones
  // =========================================================================

  /** El dueño de un proyecto publicado invita a un estudiante activo. */
  async invitar(
    usuario: UsuarioAutenticado,
    datos: { idProyecto: number; idEstudiante: number; mensaje: string | null },
  ): Promise<InvitacionDto> {
    const proyecto = await this.proyectos.obtener(datos.idProyecto, usuario);
    if (!esDueno(proyecto, usuario)) {
      throw new ErrorProhibido('Solo quien publicó el proyecto puede invitar estudiantes');
    }
    if (proyecto.estado !== 'publicado') {
      throw new ErrorReglaNegocio('Solo se puede invitar a un proyecto publicado');
    }
    const [estudiante] = await this.perfiles.listarPerfilesParaMatching({
      idsEstudiante: [datos.idEstudiante],
    });
    if (!estudiante) throw new ErrorNoEncontrado('El estudiante no existe');
    const relacionados = await this.repositorio.proyectosConRelacion(datos.idEstudiante);
    if (relacionados.includes(proyecto.idProyecto)) {
      throw new ErrorConflicto('El estudiante ya tiene una postulación o una invitación en este proyecto');
    }

    const idInvitacion = await this.repositorio.crearInvitacion({
      ...datos,
      idUsuarioInvitador: usuario.idUsuario,
    });
    await this.eventos.publicar('invitacion.enviada', {
      idInvitacion,
      idProyecto: proyecto.idProyecto,
      tituloProyecto: proyecto.titulo,
      idUsuarioEstudiante: estudiante.idUsuario,
    });
    return this.obtenerInvitacion(idInvitacion);
  }

  /** Las invitaciones que recibió el estudiante que llama (vacío si todavía no tiene perfil). */
  async listarInvitacionesMias(usuario: UsuarioAutenticado): Promise<InvitacionDto[]> {
    const idEstudiante = await this.perfiles.obtenerIdEstudiante(usuario.idUsuario);
    if (idEstudiante === null) return [];
    return this.armarInvitaciones(await this.repositorio.listarInvitaciones({ idEstudiante }));
  }

  async listarInvitacionesDeProyecto(
    idProyecto: number,
    usuario: UsuarioAutenticado,
  ): Promise<InvitacionDto[]> {
    const proyecto = await this.proyectos.obtener(idProyecto, usuario);
    if (!esDueno(proyecto, usuario)) {
      throw new ErrorProhibido('Solo quien publicó el proyecto puede ver sus invitaciones');
    }
    return this.armarInvitaciones(await this.repositorio.listarInvitaciones({ idProyecto }));
  }

  /** Aceptar crea la postulación en `pendiente`, en la misma transacción. */
  async responderInvitacion(
    idInvitacion: number,
    usuario: UsuarioAutenticado,
    aceptar: boolean,
  ): Promise<{ invitacion: InvitacionDto; postulacion: PostulacionDto | null }> {
    const invitacion = await this.repositorio.buscarInvitacion(idInvitacion);
    if (!invitacion) throw new ErrorNoEncontrado('La invitación no existe');
    const idEstudiante = await this.perfiles.obtenerIdEstudiante(usuario.idUsuario);
    if (invitacion.idEstudiante !== idEstudiante) {
      throw new ErrorProhibido('Solo el estudiante invitado puede responder la invitación');
    }
    if (invitacion.estado !== 'pendiente') throw new ErrorConflicto('La invitación ya fue respondida');
    const [proyecto] = await this.proyectos.obtenerVarios([invitacion.idProyecto]);
    if (aceptar && proyecto.estado !== 'publicado') {
      throw new ErrorReglaNegocio(NO_RECIBE_POSTULACIONES);
    }

    const respuesta = await this.repositorio.responderInvitacion(invitacion, aceptar, usuario.idUsuario);
    if (!respuesta) throw new ErrorConflicto('La invitación ya fue respondida');
    let postulacion: PostulacionDto | null = null;
    if (respuesta.idPostulacion !== null) {
      await this.avisarPostulacionCreada(respuesta.idPostulacion, proyecto, usuario.idUsuario);
      postulacion = await this.obtener(respuesta.idPostulacion, usuario);
    }
    return { invitacion: await this.obtenerInvitacion(idInvitacion), postulacion };
  }

  // =========================================================================
  // Internos
  // =========================================================================

  private async idEstudianteConPerfil(usuario: UsuarioAutenticado, mensaje: string): Promise<number> {
    const idEstudiante = await this.perfiles.obtenerIdEstudiante(usuario.idUsuario);
    if (idEstudiante === null) throw new ErrorReglaNegocio(mensaje);
    return idEstudiante;
  }

  /**
   * La postulación, su proyecto y el papel de quien llama: `estudiante` si es su postulación,
   * `publicador` si es el dueño del proyecto, `null` si no es ninguno de los dos.
   */
  private async buscarConActor(idPostulacion: number, usuario: UsuarioAutenticado) {
    const fila = await this.repositorio.buscarPostulacion(idPostulacion);
    if (!fila) throw new ErrorNoEncontrado('La postulación no existe');
    const [proyecto] = await this.proyectos.obtenerVarios([fila.idProyecto]);
    let actor: 'estudiante' | 'publicador' | null = null;
    if (esDueno(proyecto, usuario)) actor = 'publicador';
    else if (
      usuario.rol === 'estudiante' &&
      (await this.perfiles.obtenerIdEstudiante(usuario.idUsuario)) === fila.idEstudiante
    ) {
      actor = 'estudiante';
    }
    return { fila, proyecto, actor };
  }

  private async avisarPostulacionCreada(
    idPostulacion: number,
    proyecto: ProyectoDto,
    idUsuarioEstudiante: number,
  ): Promise<void> {
    await this.eventos.publicar('postulacion.creada', {
      idPostulacion,
      idProyecto: proyecto.idProyecto,
      tituloProyecto: proyecto.titulo,
      idUsuarioPublicador: proyecto.publicador.idUsuario,
      idUsuarioEstudiante,
    });
  }

  /** Completa las filas con el proyecto, el estudiante y el puntaje de la configuración activa. */
  private async armarPostulaciones(
    filas: FilaPostulacion[],
    solicitante: UsuarioAutenticado,
    proyectosConocidos?: ProyectoDto[],
  ): Promise<PostulacionDto[]> {
    if (filas.length === 0) return [];
    const [proyectos, estudiantes, configuracion] = await Promise.all([
      proyectosConocidos ?? this.proyectos.obtenerVarios(filas.map((f) => f.idProyecto)),
      this.perfiles.obtenerEstudiantes(filas.map((f) => f.idEstudiante)),
      this.matching.configuracionActiva(),
    ]);
    const puntajes = await this.matching.puntajesDePares(configuracion.idConfiguracion, filas);

    return filas.map((fila) => {
      const proyecto = proyectos.find((p) => p.idProyecto === fila.idProyecto)!;
      const estudiante = estudiantes.find((e) => e.idEstudiante === fila.idEstudiante)!;
      const verEmail = solicitante.rol === 'administrador' || esDueno(proyecto, solicitante);
      const puntaje = puntajes.find(
        (p) => p.idEstudiante === fila.idEstudiante && p.idProyecto === fila.idProyecto,
      );
      return {
        idPostulacion: fila.idPostulacion,
        estado: fila.estado,
        mensajePresentacion: fila.mensajePresentacion,
        fechaPostulacion: fila.fechaPostulacion,
        fechaActualizacion: fila.fechaActualizacion,
        proyecto: {
          idProyecto: proyecto.idProyecto,
          titulo: proyecto.titulo,
          estado: proyecto.estado,
          publicador: proyecto.publicador.nombre,
        },
        estudiante: {
          idEstudiante: estudiante.idEstudiante,
          nombre: estudiante.nombre,
          apellido: estudiante.apellido,
          ...(verEmail ? { email: estudiante.email } : {}),
          carrera: estudiante.carrera,
          anioCursada: estudiante.anioCursada,
          tecnologias: estudiante.tecnologias.map(({ nombre, nivel }) => ({ nombre, nivel })),
        },
        puntajeTotal: puntaje?.puntajeTotal ?? null,
      };
    });
  }

  private async obtenerInvitacion(idInvitacion: number): Promise<InvitacionDto> {
    const fila = await this.repositorio.buscarInvitacion(idInvitacion);
    const [invitacion] = await this.armarInvitaciones([fila!]);
    return invitacion;
  }

  private async armarInvitaciones(filas: FilaInvitacion[]): Promise<InvitacionDto[]> {
    if (filas.length === 0) return [];
    const [proyectos, estudiantes] = await Promise.all([
      this.proyectos.obtenerVarios(filas.map((f) => f.idProyecto)),
      this.perfiles.obtenerEstudiantes(filas.map((f) => f.idEstudiante)),
    ]);
    return filas.map((fila) => {
      const proyecto = proyectos.find((p) => p.idProyecto === fila.idProyecto)!;
      const estudiante = estudiantes.find((e) => e.idEstudiante === fila.idEstudiante)!;
      return {
        idInvitacion: fila.idInvitacion,
        proyecto: {
          idProyecto: proyecto.idProyecto,
          titulo: proyecto.titulo,
          publicador: proyecto.publicador.nombre,
        },
        estudiante: {
          idEstudiante: estudiante.idEstudiante,
          nombre: estudiante.nombre,
          apellido: estudiante.apellido,
        },
        mensaje: fila.mensaje,
        estado: fila.estado,
        fechaInvitacion: fila.fechaInvitacion,
        fechaRespuesta: fila.fechaRespuesta,
      };
    });
  }
}
