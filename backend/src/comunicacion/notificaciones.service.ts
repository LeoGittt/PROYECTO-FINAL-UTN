import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ErrorNoEncontrado } from '../compartido/dominio/errores.js';
import type { EventosDominio } from '../compartido/dominio/eventos.js';
import {
  CONFIGURACION,
  type Configuracion,
} from '../compartido/infraestructura/configuracion/configuracion.js';
import { PostulacionesService } from '../matching/postulaciones.service.js';
import { PerfilesService } from '../perfiles/aplicacion/perfiles.service.js';
import { EmailService } from './email.service.js';
import {
  NotificacionesRepository,
  type NotificacionDto,
  type TipoNotificacion,
} from './notificaciones.repository.js';

const LARGO_MAXIMO_MENSAJE = 300; // VARCHAR(300) de `notificacion.mensaje`

const ASUNTOS: Record<TipoNotificacion, string> = {
  nuevo_match: 'Hay un proyecto compatible con tu perfil',
  invitacion: 'Te invitaron a un proyecto',
  nueva_postulacion: 'Recibiste una postulación',
  cambio_estado_postulacion: 'Cambió el estado de una postulación',
  cambio_estado_proyecto: 'Cambió el estado de un proyecto',
};

const ETIQUETAS: Record<string, string> = { en_revision: 'en revisión', en_curso: 'en curso' };
const etiqueta = (estado: string) => ETIQUETAS[estado] ?? estado;

/**
 * M4: notificaciones en la plataforma y por email (RF-08), generadas a partir de los eventos del
 * dominio. Primero se guarda la notificación y después se intenta el email, sin esperarlo: si el
 * envío falla, la operación principal no se entera (RNF-04).
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger('Notificaciones');

  constructor(
    private readonly repositorio: NotificacionesRepository,
    private readonly email: EmailService,
    private readonly perfiles: PerfilesService,
    private readonly postulaciones: PostulacionesService,
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  async listar(
    idUsuario: number,
    soloNoLeidas: boolean,
    limite: number,
  ): Promise<{ items: NotificacionDto[]; noLeidas: number }> {
    const [items, noLeidas] = await Promise.all([
      this.repositorio.listar(idUsuario, soloNoLeidas, limite),
      this.repositorio.contarNoLeidas(idUsuario),
    ]);
    return { items, noLeidas };
  }

  /** 404 si la notificación no existe o es de otro usuario. */
  async marcarLeida(idNotificacion: number, idUsuario: number): Promise<void> {
    if (!(await this.repositorio.marcarLeida(idNotificacion, idUsuario))) {
      throw new ErrorNoEncontrado('La notificación no existe');
    }
  }

  marcarTodasLeidas(idUsuario: number): Promise<void> {
    return this.repositorio.marcarTodasLeidas(idUsuario);
  }

  // =========================================================================
  // Eventos del dominio
  // =========================================================================

  @OnEvent('match.nuevo')
  async alHaberMatchNuevo(evento: EventosDominio['match.nuevo']): Promise<void> {
    const porcentaje = Math.round(evento.puntajeTotal * 100);
    await this.notificar(
      evento.idUsuarioEstudiante,
      'nuevo_match',
      `Hay un proyecto nuevo compatible con tu perfil: «${evento.tituloProyecto}» (${porcentaje} %).`,
      `/proyectos/${evento.idProyecto}`,
    );
  }

  @OnEvent('invitacion.enviada')
  async alEnviarInvitacion(evento: EventosDominio['invitacion.enviada']): Promise<void> {
    await this.notificar(
      evento.idUsuarioEstudiante,
      'invitacion',
      `Te invitaron a postularte a «${evento.tituloProyecto}».`,
      '/invitaciones',
    );
  }

  @OnEvent('postulacion.creada')
  async alCrearPostulacion(evento: EventosDominio['postulacion.creada']): Promise<void> {
    await this.notificar(
      evento.idUsuarioPublicador,
      'nueva_postulacion',
      `Recibiste una postulación nueva en «${evento.tituloProyecto}».`,
      `/mis-proyectos/${evento.idProyecto}`,
    );
  }

  /** Al estudiante, salvo cuando él mismo la retira: entonces se avisa al publicador. */
  @OnEvent('postulacion.estado_cambiado')
  async alCambiarPostulacion(evento: EventosDominio['postulacion.estado_cambiado']): Promise<void> {
    if (evento.estadoNuevo === 'retirada') {
      await this.notificar(
        evento.idUsuarioPublicador,
        'cambio_estado_postulacion',
        `Un estudiante retiró su postulación a «${evento.tituloProyecto}».`,
        `/mis-proyectos/${evento.idProyecto}`,
      );
      return;
    }
    await this.notificar(
      evento.idUsuarioEstudiante,
      'cambio_estado_postulacion',
      `Tu postulación a «${evento.tituloProyecto}» pasó a «${etiqueta(evento.estadoNuevo)}».`,
      '/postulaciones',
    );
  }

  /**
   * A los estudiantes con una postulación activa. Si lo suspendió o lo reactivó la
   * administración, también al publicador (con el motivo de la suspensión).
   */
  @OnEvent('proyecto.estado_cambiado')
  async alCambiarProyecto(evento: EventosDominio['proyecto.estado_cambiado']): Promise<void> {
    const estudiantes = await this.postulaciones.usuariosConPostulacionActiva(evento.idProyecto);
    for (const idUsuario of estudiantes) {
      await this.notificar(
        idUsuario,
        'cambio_estado_proyecto',
        `El proyecto «${evento.titulo}» pasó a «${etiqueta(evento.estadoNuevo)}».`,
        '/postulaciones',
      );
    }
    const url = `/mis-proyectos/${evento.idProyecto}`;
    if (evento.estadoNuevo === 'suspendido') {
      await this.notificar(
        evento.idUsuarioPublicador,
        'cambio_estado_proyecto',
        `La administración suspendió «${evento.titulo}». Motivo: ${evento.motivo ?? 'sin motivo'}`,
        url,
      );
    } else if (evento.estadoAnterior === 'suspendido') {
      await this.notificar(
        evento.idUsuarioPublicador,
        'cambio_estado_proyecto',
        `La administración reactivó «${evento.titulo}».`,
        url,
      );
    }
  }

  // =========================================================================

  private async notificar(
    idUsuario: number,
    tipo: TipoNotificacion,
    mensaje: string,
    urlReferencia: string,
  ): Promise<void> {
    const texto =
      mensaje.length > LARGO_MAXIMO_MENSAJE ? `${mensaje.slice(0, LARGO_MAXIMO_MENSAJE - 1)}…` : mensaje;
    const idNotificacion = await this.repositorio.crear(idUsuario, tipo, texto, urlReferencia);
    void this.enviarEmail(idNotificacion, idUsuario, tipo, texto, urlReferencia);
  }

  /** Nunca lanza: un email que no sale queda en el log y la notificación, sin marcar como enviada. */
  private async enviarEmail(
    idNotificacion: number,
    idUsuario: number,
    tipo: TipoNotificacion,
    mensaje: string,
    urlReferencia: string,
  ): Promise<void> {
    try {
      const [usuario] = await this.perfiles.obtenerUsuarios([idUsuario]);
      if (!usuario?.activo) return;
      await this.email.enviar({
        para: usuario.email,
        asunto: `UTN Match: ${ASUNTOS[tipo]}`,
        texto: `Hola, ${usuario.nombre}:\n\n${mensaje}\n\nVer en UTN Match: ${this.configuracion.email.urlAplicacion}${urlReferencia}`,
      });
      await this.repositorio.marcarEnviadaPorEmail(idNotificacion);
    } catch (error) {
      this.logger.warn(`No se pudo enviar el email de la notificación ${idNotificacion}: ${String(error)}`);
    }
  }
}
