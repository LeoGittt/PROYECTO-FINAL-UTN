import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../compartido/infraestructura/db/db.js';
import type { ConfiguracionMotor } from './motor.js';
import type { Metricas, ParEtiquetado } from './evaluacion.js';

/** docs/api/CONTRATO.md, sección 5.3. */
export interface ConfiguracionDto extends ConfiguracionMotor {
  descripcion: string | null;
  activa: boolean;
}

export interface FilaReferencia extends ParEtiquetado {
  idMatchReferencia: number;
  observacion: string | null;
}

export interface EvaluacionDto extends Metricas {
  idEvaluacion: number;
  idConfiguracion: number;
  /** Nombre de la configuración evaluada. */
  configuracion: string;
  fechaEjecucion: string;
  k: number;
  observaciones: string | null;
}

const COLUMNAS_EVALUACION = `e.id_evaluacion, e.id_configuracion, c.nombre AS configuracion,
  e.fecha_ejecucion, e.k, e.cantidad_estudiantes, e.precision_global, e.recall_global,
  e.precision_top_k, e.observaciones`;

/** Repositorio de `configuracion_motor`, `match_referencia` y `evaluacion_motor` (dueño: M3). */
@Injectable()
export class EvaluacionRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listarConfiguraciones(): Promise<ConfiguracionDto[]> {
    const { rows } = await this.db.query<ConfiguracionDto>(
      `SELECT id_configuracion, nombre, descripcion, peso_tecnologias, peso_texto, peso_contexto,
              umbral_recomendacion, activa
         FROM configuracion_motor ORDER BY id_configuracion`,
    );
    return rows;
  }

  /**
   * Deja activa solo la configuración indicada. Son dos sentencias porque el índice único
   * `uq_configuracion_activa` no admite, ni por un instante, dos filas activas.
   */
  async activarConfiguracion(idConfiguracion: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.query('UPDATE configuracion_motor SET activa = false WHERE activa AND id_configuracion <> $1', [
        idConfiguracion,
      ]);
      await tx.query('UPDATE configuracion_motor SET activa = true WHERE id_configuracion = $1', [idConfiguracion]);
    });
  }

  async listarReferencia(): Promise<FilaReferencia[]> {
    const { rows } = await this.db.query<FilaReferencia>(
      `SELECT id_match_referencia, id_estudiante, id_proyecto, es_relevante, observacion
         FROM match_referencia ORDER BY id_match_referencia DESC`,
    );
    return rows;
  }

  /** Alta o reemplazo de la etiqueta de un par (único por estudiante y proyecto). */
  async guardarReferencia(
    par: ParEtiquetado & { observacion: string | null },
    idUsuarioEtiquetador: number,
  ): Promise<number> {
    const { rows } = await this.db.query<{ idMatchReferencia: number }>(
      `INSERT INTO match_referencia (id_estudiante, id_proyecto, es_relevante, observacion, id_usuario_etiquetador)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_estudiante, id_proyecto) DO UPDATE
          SET es_relevante = EXCLUDED.es_relevante, observacion = EXCLUDED.observacion,
              id_usuario_etiquetador = EXCLUDED.id_usuario_etiquetador, fecha_etiquetado = now()
       RETURNING id_match_referencia`,
      [par.idEstudiante, par.idProyecto, par.esRelevante, par.observacion, idUsuarioEtiquetador],
    );
    return rows[0].idMatchReferencia;
  }

  async borrarReferencia(idMatchReferencia: number): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM match_referencia WHERE id_match_referencia = $1', [
      idMatchReferencia,
    ]);
    return rowCount > 0;
  }

  async guardarEvaluacion(idConfiguracion: number, k: number, metricas: Metricas): Promise<EvaluacionDto> {
    const { rows } = await this.db.query<EvaluacionDto>(
      `WITH nueva AS (
         INSERT INTO evaluacion_motor
           (id_configuracion, k, cantidad_estudiantes, precision_global, recall_global, precision_top_k)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *)
       SELECT ${COLUMNAS_EVALUACION} FROM nueva e JOIN configuracion_motor c USING (id_configuracion)`,
      [
        idConfiguracion,
        k,
        metricas.cantidadEstudiantes,
        metricas.precisionGlobal,
        metricas.recallGlobal,
        metricas.precisionTopK,
      ],
    );
    return rows[0];
  }

  /** El historial, la más reciente primero. */
  async listarEvaluaciones(): Promise<EvaluacionDto[]> {
    const { rows } = await this.db.query<EvaluacionDto>(
      `SELECT ${COLUMNAS_EVALUACION} FROM evaluacion_motor e JOIN configuracion_motor c USING (id_configuracion)
        ORDER BY e.fecha_ejecucion DESC, e.id_evaluacion DESC`,
    );
    return rows;
  }

  /** La última evaluación de cada configuración (bloque `evaluacionMotor` del dashboard). */
  async ultimasEvaluaciones(): Promise<EvaluacionDto[]> {
    const { rows } = await this.db.query<EvaluacionDto>(
      `SELECT DISTINCT ON (e.id_configuracion) ${COLUMNAS_EVALUACION}
         FROM evaluacion_motor e JOIN configuracion_motor c USING (id_configuracion)
        ORDER BY e.id_configuracion, e.fecha_ejecucion DESC, e.id_evaluacion DESC`,
    );
    return rows;
  }
}
