import { Inject, Injectable } from '@nestjs/common';
import { ErrorConflicto } from '../compartido/dominio/errores.js';
import { DB, type Db } from '../compartido/infraestructura/db/db.js';
import { esViolacionUnica } from '../compartido/infraestructura/db/errores-db.js';
import { fijarUsuarioResponsable } from '../compartido/infraestructura/db/usuario-responsable.js';
import type { EstadoPostulacion } from './estado-postulacion.js';

export interface FilaPostulacion {
  idPostulacion: number;
  idEstudiante: number;
  idProyecto: number;
  estado: EstadoPostulacion;
  mensajePresentacion: string | null;
  fechaPostulacion: string;
  fechaActualizacion: string;
}

export interface FilaHistorial {
  estadoAnterior: EstadoPostulacion | null;
  estadoNuevo: EstadoPostulacion;
  fechaCambio: string;
}

export interface FilaInvitacion {
  idInvitacion: number;
  idProyecto: number;
  idEstudiante: number;
  mensaje: string | null;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fechaInvitacion: string;
  fechaRespuesta: string | null;
}

const SELECT_POSTULACION = `
  SELECT id_postulacion, id_estudiante, id_proyecto, estado, mensaje_presentacion,
         fecha_postulacion, fecha_actualizacion
    FROM postulacion`;

const SELECT_INVITACION = `
  SELECT id_invitacion, id_proyecto, id_estudiante, mensaje, estado, fecha_invitacion,
         fecha_respuesta
    FROM invitacion`;

const MENSAJE_YA_POSTULADO = 'Ya se postuló a este proyecto';

/** Repositorio de `postulacion`, `postulacion_historial` e `invitacion` (dueño: M3). */
@Injectable()
export class PostulacionesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // -------------------------------------------------------------------------
  // Postulaciones
  // -------------------------------------------------------------------------

  /** Crea la postulación en `pendiente`. 409 si el estudiante ya se postuló a ese proyecto. */
  crearPostulacion(datos: {
    idEstudiante: number;
    idProyecto: number;
    mensajePresentacion: string | null;
    idUsuarioResponsable: number;
  }): Promise<number> {
    return this.db.transaction((tx) => insertarPostulacion(tx, datos));
  }

  async buscarPostulacion(idPostulacion: number): Promise<FilaPostulacion | null> {
    const { rows } = await this.db.query<FilaPostulacion>(
      `${SELECT_POSTULACION} WHERE id_postulacion = $1`,
      [idPostulacion],
    );
    return rows[0] ?? null;
  }

  /** Las postulaciones de un estudiante o de un proyecto, las más nuevas primero. */
  async listarPostulaciones(filtro: {
    idEstudiante?: number;
    idProyecto?: number;
    estado?: EstadoPostulacion;
  }): Promise<FilaPostulacion[]> {
    const { rows } = await this.db.query<FilaPostulacion>(
      `${SELECT_POSTULACION}
        WHERE ($1::bigint IS NULL OR id_estudiante = $1)
          AND ($2::bigint IS NULL OR id_proyecto = $2)
          AND ($3::estado_postulacion IS NULL OR estado = $3)
        ORDER BY fecha_postulacion DESC, id_postulacion DESC`,
      [filtro.idEstudiante ?? null, filtro.idProyecto ?? null, filtro.estado ?? null],
    );
    return rows;
  }

  async historial(idPostulacion: number): Promise<FilaHistorial[]> {
    const { rows } = await this.db.query<FilaHistorial>(
      `SELECT estado_anterior, estado_nuevo, fecha_cambio FROM postulacion_historial
        WHERE id_postulacion = $1 ORDER BY fecha_cambio, id_historial`,
      [idPostulacion],
    );
    return rows;
  }

  /**
   * Cambia el estado solo si todavía es `desde`. El trigger del historial registra quién hizo
   * el cambio. Devuelve `false` si otra solicitud lo cambió antes.
   */
  cambiarEstado(
    idPostulacion: number,
    desde: EstadoPostulacion,
    hacia: EstadoPostulacion,
    idUsuarioResponsable: number,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await fijarUsuarioResponsable(tx, idUsuarioResponsable);
      const { rowCount } = await tx.query(
        `UPDATE postulacion SET estado = $3::estado_postulacion
          WHERE id_postulacion = $1 AND estado = $2::estado_postulacion`,
        [idPostulacion, desde, hacia],
      );
      return rowCount > 0;
    });
  }

  /** Cantidad de postulaciones de cada proyecto pedido (los que no tienen, no aparecen). */
  async contarPorEstado(): Promise<Partial<Record<EstadoPostulacion, number>>> {
    const { rows } = await this.db.query<{ estado: EstadoPostulacion; cantidad: number }>(
      'SELECT estado, count(*)::int AS cantidad FROM postulacion GROUP BY estado',
    );
    return Object.fromEntries(rows.map((r) => [r.estado, r.cantidad]));
  }

  async contarPorProyecto(idsProyecto: readonly number[]): Promise<Map<number, number>> {
    const { rows } = await this.db.query<{ idProyecto: number; cantidad: number }>(
      `SELECT id_proyecto, count(*)::int AS cantidad FROM postulacion
        WHERE id_proyecto = ANY($1::bigint[]) GROUP BY id_proyecto`,
      [idsProyecto],
    );
    return new Map(rows.map((r) => [r.idProyecto, r.cantidad]));
  }

  // -------------------------------------------------------------------------
  // Invitaciones
  // -------------------------------------------------------------------------

  /** 409 si el estudiante ya tiene una invitación a ese proyecto. */
  async crearInvitacion(datos: {
    idProyecto: number;
    idEstudiante: number;
    idUsuarioInvitador: number;
    mensaje: string | null;
  }): Promise<number> {
    try {
      const { rows } = await this.db.query<{ idInvitacion: number }>(
        `INSERT INTO invitacion (id_proyecto, id_estudiante, id_usuario_invitador, mensaje)
         VALUES ($1, $2, $3, $4) RETURNING id_invitacion`,
        [datos.idProyecto, datos.idEstudiante, datos.idUsuarioInvitador, datos.mensaje],
      );
      return rows[0].idInvitacion;
    } catch (error) {
      if (esViolacionUnica(error, 'uq_invitacion_proyecto_estudiante')) {
        throw new ErrorConflicto('El estudiante ya tiene una invitación a este proyecto');
      }
      throw error;
    }
  }

  async buscarInvitacion(idInvitacion: number): Promise<FilaInvitacion | null> {
    const { rows } = await this.db.query<FilaInvitacion>(
      `${SELECT_INVITACION} WHERE id_invitacion = $1`,
      [idInvitacion],
    );
    return rows[0] ?? null;
  }

  /** Las invitaciones de un estudiante o de un proyecto, las más nuevas primero. */
  async listarInvitaciones(filtro: {
    idEstudiante?: number;
    idProyecto?: number;
  }): Promise<FilaInvitacion[]> {
    const { rows } = await this.db.query<FilaInvitacion>(
      `${SELECT_INVITACION}
        WHERE ($1::bigint IS NULL OR id_estudiante = $1)
          AND ($2::bigint IS NULL OR id_proyecto = $2)
        ORDER BY fecha_invitacion DESC, id_invitacion DESC`,
      [filtro.idEstudiante ?? null, filtro.idProyecto ?? null],
    );
    return rows;
  }

  /**
   * Responde una invitación pendiente. Si el estudiante acepta, en la misma transacción se
   * crea su postulación en `pendiente`. Devuelve `null` si la invitación ya no estaba
   * pendiente (otra solicitud la respondió antes).
   */
  responderInvitacion(
    invitacion: FilaInvitacion,
    aceptar: boolean,
    idUsuarioResponsable: number,
  ): Promise<{ idPostulacion: number | null } | null> {
    return this.db.transaction(async (tx) => {
      const { rowCount } = await tx.query(
        `UPDATE invitacion SET estado = $2::estado_invitacion, fecha_respuesta = now()
          WHERE id_invitacion = $1 AND estado = 'pendiente'`,
        [invitacion.idInvitacion, aceptar ? 'aceptada' : 'rechazada'],
      );
      if (rowCount === 0) return null;
      if (!aceptar) return { idPostulacion: null };
      const idPostulacion = await insertarPostulacion(tx, {
        idEstudiante: invitacion.idEstudiante,
        idProyecto: invitacion.idProyecto,
        mensajePresentacion: null,
        idUsuarioResponsable,
      });
      return { idPostulacion };
    });
  }

  // -------------------------------------------------------------------------
  // Relación entre un estudiante y los proyectos
  // -------------------------------------------------------------------------

  /** Los proyectos en los que el estudiante tiene una postulación o una invitación. */
  async proyectosConRelacion(idEstudiante: number): Promise<number[]> {
    const { rows } = await this.db.query<{ idProyecto: number }>(
      `SELECT id_proyecto FROM postulacion WHERE id_estudiante = $1
       UNION
       SELECT id_proyecto FROM invitacion WHERE id_estudiante = $1`,
      [idEstudiante],
    );
    return rows.map((r) => r.idProyecto);
  }
}

/** El INSERT de la postulación, dentro de una transacción ya abierta (`tx`). */
async function insertarPostulacion(
  tx: Db,
  datos: {
    idEstudiante: number;
    idProyecto: number;
    mensajePresentacion: string | null;
    idUsuarioResponsable: number;
  },
): Promise<number> {
  // Para que el trigger guarde en el historial quién creó la postulación.
  await fijarUsuarioResponsable(tx, datos.idUsuarioResponsable);
  try {
    const { rows } = await tx.query<{ idPostulacion: number }>(
      `INSERT INTO postulacion (id_estudiante, id_proyecto, mensaje_presentacion)
       VALUES ($1, $2, $3) RETURNING id_postulacion`,
      [datos.idEstudiante, datos.idProyecto, datos.mensajePresentacion],
    );
    return rows[0].idPostulacion;
  } catch (error) {
    if (esViolacionUnica(error, 'uq_postulacion_estudiante_proyecto')) {
      throw new ErrorConflicto(MENSAJE_YA_POSTULADO);
    }
    throw error;
  }
}
