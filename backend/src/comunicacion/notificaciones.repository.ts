import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../compartido/infraestructura/db/db.js';

export type TipoNotificacion =
  | 'nuevo_match'
  | 'invitacion'
  | 'nueva_postulacion'
  | 'cambio_estado_postulacion'
  | 'cambio_estado_proyecto';

/** docs/api/CONTRATO.md, sección 6. */
export interface NotificacionDto {
  idNotificacion: number;
  tipo: TipoNotificacion;
  mensaje: string;
  urlReferencia: string | null;
  fecha: string;
  leida: boolean;
}

/** Repositorio de `notificacion` (dueño: M4). */
@Injectable()
export class NotificacionesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async crear(idUsuario: number, tipo: TipoNotificacion, mensaje: string, urlReferencia: string): Promise<number> {
    const { rows } = await this.db.query<{ idNotificacion: number }>(
      `INSERT INTO notificacion (id_usuario, tipo, mensaje, url_referencia)
       VALUES ($1, $2, $3, $4) RETURNING id_notificacion`,
      [idUsuario, tipo, mensaje, urlReferencia],
    );
    return rows[0].idNotificacion;
  }

  async marcarEnviadaPorEmail(idNotificacion: number): Promise<void> {
    await this.db.query('UPDATE notificacion SET enviada_email = true WHERE id_notificacion = $1', [idNotificacion]);
  }

  /** Las notificaciones del usuario, la más nueva primero. */
  async listar(idUsuario: number, soloNoLeidas: boolean, limite: number): Promise<NotificacionDto[]> {
    const { rows } = await this.db.query<NotificacionDto>(
      `SELECT id_notificacion, tipo, mensaje, url_referencia, fecha, leida FROM notificacion
        WHERE id_usuario = $1 AND (NOT $2 OR NOT leida)
        ORDER BY fecha DESC, id_notificacion DESC LIMIT $3`,
      [idUsuario, soloNoLeidas, limite],
    );
    return rows;
  }

  async contarNoLeidas(idUsuario: number): Promise<number> {
    const { rows } = await this.db.query<{ cantidad: number }>(
      'SELECT count(*)::int AS cantidad FROM notificacion WHERE id_usuario = $1 AND NOT leida',
      [idUsuario],
    );
    return rows[0].cantidad;
  }

  /** `false` si la notificación no existe o es de otro usuario. */
  async marcarLeida(idNotificacion: number, idUsuario: number): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'UPDATE notificacion SET leida = true WHERE id_notificacion = $1 AND id_usuario = $2',
      [idNotificacion, idUsuario],
    );
    return rowCount > 0;
  }

  async marcarTodasLeidas(idUsuario: number): Promise<void> {
    await this.db.query('UPDATE notificacion SET leida = true WHERE id_usuario = $1 AND NOT leida', [idUsuario]);
  }
}
