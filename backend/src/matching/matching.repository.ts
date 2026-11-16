import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../compartido/infraestructura/db/db.js';
import type { ConfiguracionMotor, PuntajeDePar } from './motor.js';

/** Un puntaje guardado en `match`. */
export interface FilaMatch {
  idEstudiante: number;
  idProyecto: number;
  puntajeTotal: number;
  puntajeTecnologias: number;
  puntajeTexto: number | null;
  puntajeContexto: number;
}

const COLUMNAS_MATCH = `id_estudiante, id_proyecto, puntaje_total, puntaje_tecnologias,
  puntaje_texto, puntaje_contexto`;

/** Repositorio de `configuracion_motor` y `match` (dueño: M3). */
@Injectable()
export class MatchingRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** La configuración que ven los usuarios. La base garantiza que hay a lo sumo una. */
  async configuracionActiva(): Promise<ConfiguracionMotor> {
    const { rows } = await this.db.query<ConfiguracionMotor>(
      `SELECT id_configuracion, nombre, peso_tecnologias, peso_texto, peso_contexto,
              umbral_recomendacion
         FROM configuracion_motor WHERE activa`,
    );
    if (!rows[0]) throw new Error('No hay ninguna configuración del motor activa');
    return rows[0];
  }

  async hayPuntajes(idConfiguracion: number): Promise<boolean> {
    const { rows } = await this.db.query<{ hay: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM match WHERE id_configuracion = $1) AS hay',
      [idConfiguracion],
    );
    return rows[0].hay;
  }

  /** Los puntajes de un estudiante, del más alto al más bajo, desde `minimo` si se indica. */
  async puntajesDeEstudiante(
    idConfiguracion: number,
    idEstudiante: number,
    minimo = 0,
  ): Promise<FilaMatch[]> {
    const { rows } = await this.db.query<FilaMatch>(
      `SELECT ${COLUMNAS_MATCH} FROM match
        WHERE id_configuracion = $1 AND id_estudiante = $2 AND puntaje_total >= $3
        ORDER BY puntaje_total DESC, id_proyecto`,
      [idConfiguracion, idEstudiante, minimo],
    );
    return rows;
  }

  /** Los puntajes de un proyecto, del más alto al más bajo, desde `minimo` si se indica. */
  async puntajesDeProyecto(
    idConfiguracion: number,
    idProyecto: number,
    minimo = 0,
  ): Promise<FilaMatch[]> {
    const { rows } = await this.db.query<FilaMatch>(
      `SELECT ${COLUMNAS_MATCH} FROM match
        WHERE id_configuracion = $1 AND id_proyecto = $2 AND puntaje_total >= $3
        ORDER BY puntaje_total DESC, id_estudiante`,
      [idConfiguracion, idProyecto, minimo],
    );
    return rows;
  }

  /** Los puntajes de los pares pedidos (`idsEstudiante[i]` con `idsProyecto[i]`). */
  async puntajesDePares(
    idConfiguracion: number,
    pares: ReadonlyArray<{ idEstudiante: number; idProyecto: number }>,
  ): Promise<FilaMatch[]> {
    if (pares.length === 0) return [];
    const { rows } = await this.db.query<FilaMatch>(
      `SELECT m.id_estudiante, m.id_proyecto, m.puntaje_total, m.puntaje_tecnologias,
              m.puntaje_texto, m.puntaje_contexto
         FROM match m
         JOIN unnest($2::bigint[], $3::bigint[]) AS par(id_estudiante, id_proyecto)
           ON par.id_estudiante = m.id_estudiante AND par.id_proyecto = m.id_proyecto
        WHERE m.id_configuracion = $1`,
      [idConfiguracion, pares.map((p) => p.idEstudiante), pares.map((p) => p.idProyecto)],
    );
    return rows;
  }

  /** Guarda los puntajes: inserta los pares nuevos y actualiza los que ya existían. */
  guardarPuntajes(idConfiguracion: number, pares: readonly PuntajeDePar[]): Promise<void> {
    return insertarPuntajes(this.db, idConfiguracion, pares);
  }

  /** Reemplaza todos los puntajes de una configuración (recálculo completo). */
  reemplazarPuntajes(idConfiguracion: number, pares: readonly PuntajeDePar[]): Promise<void> {
    return this.db.transaction(async (tx) => {
      await tx.query('DELETE FROM match WHERE id_configuracion = $1', [idConfiguracion]);
      await insertarPuntajes(tx, idConfiguracion, pares);
    });
  }
}

/** Un solo INSERT para todos los pares: cada columna viaja como un arreglo y `unnest` las arma en filas. */
async function insertarPuntajes(
  db: Db,
  idConfiguracion: number,
  pares: readonly PuntajeDePar[],
): Promise<void> {
  if (pares.length === 0) return;
  await db.query(
    `INSERT INTO match (id_configuracion, ${COLUMNAS_MATCH})
     SELECT $1, * FROM unnest($2::bigint[], $3::bigint[], $4::numeric[], $5::numeric[],
                              $6::numeric[], $7::numeric[])
     ON CONFLICT (id_estudiante, id_proyecto, id_configuracion) DO UPDATE
        SET puntaje_total = EXCLUDED.puntaje_total,
            puntaje_tecnologias = EXCLUDED.puntaje_tecnologias,
            puntaje_texto = EXCLUDED.puntaje_texto,
            puntaje_contexto = EXCLUDED.puntaje_contexto,
            fecha_calculo = now()`,
    [
      idConfiguracion,
      pares.map((p) => p.idEstudiante),
      pares.map((p) => p.idProyecto),
      pares.map((p) => p.total),
      pares.map((p) => p.tecnologias),
      pares.map((p) => p.texto),
      pares.map((p) => p.contexto),
    ],
  );
}
