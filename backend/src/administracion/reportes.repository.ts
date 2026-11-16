import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../compartido/infraestructura/db/db.js';

// Bloques de `GET /reportes/dashboard` (docs/api/CONTRATO.md, sección 7) que salen de las vistas.
export interface DemandaTecnologia {
  idTecnologia: number;
  tecnologia: string;
  categoria: string;
  cantidadProyectos: number;
  cantidadObligatoria: number;
}
export interface EvolucionTecnologia {
  mes: string;
  tecnologia: string;
  cantidadProyectos: number;
}
export interface MatchPorCarreraAnio {
  carrera: string;
  anioCursada: number;
  totalEstudiantes: number;
  conRecomendacion: number;
  conProyecto: number;
  pctConRecomendacion: number;
  pctConProyecto: number;
}
export interface EmbudoMensual {
  mes: string;
  postulaciones: number;
  entrevistas: number;
  proyectosCerrados: number;
  pctPostulacionAEntrevista: number;
  pctEntrevistaACierre: number | null;
}

/**
 * Lectura de las cuatro vistas `vw_*` de schema.sql: es la única lectura directa entre módulos
 * que admite la arquitectura (las vistas declaran qué columnas de otros módulos leen).
 */
@Injectable()
export class ReportesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Tecnologías más pedidas en todo el período, de la más pedida a la menos pedida. */
  async rankingTecnologias(): Promise<DemandaTecnologia[]> {
    const { rows } = await this.db.query<DemandaTecnologia>(
      `SELECT id_tecnologia, tecnologia, categoria,
              sum(cantidad_proyectos)::int AS cantidad_proyectos,
              sum(cantidad_obligatoria)::int AS cantidad_obligatoria
         FROM vw_tecnologias_demandadas
        GROUP BY id_tecnologia, tecnologia, categoria
        ORDER BY cantidad_proyectos DESC, tecnologia`,
    );
    return rows;
  }

  async evolucionTecnologias(): Promise<EvolucionTecnologia[]> {
    const { rows } = await this.db.query<EvolucionTecnologia>(
      `SELECT to_char(mes, 'YYYY-MM-DD') AS mes, tecnologia, cantidad_proyectos::int AS cantidad_proyectos
         FROM vw_tecnologias_demandadas ORDER BY mes, tecnologia`,
    );
    return rows;
  }

  async matchPorCarreraAnio(): Promise<MatchPorCarreraAnio[]> {
    const { rows } = await this.db.query<MatchPorCarreraAnio>(
      `SELECT carrera, anio_cursada, total_estudiantes::int AS total_estudiantes,
              con_recomendacion::int AS con_recomendacion, con_proyecto::int AS con_proyecto,
              pct_con_recomendacion, pct_con_proyecto
         FROM vw_match_por_carrera_anio ORDER BY carrera, anio_cursada`,
    );
    return rows;
  }

  /** Promedio de días entre el registro y la primera postulación aceptada. `null` si nadie llegó. */
  async tiempoPrimerProyecto(): Promise<{ promedioDias: number | null; estudiantes: number }> {
    const { rows } = await this.db.query<{ promedioDias: number | null; estudiantes: number }>(
      `SELECT round(avg(dias_hasta_primer_proyecto), 1) AS promedio_dias, count(*)::int AS estudiantes
         FROM vw_tiempo_primer_proyecto`,
    );
    return rows[0];
  }

  async embudo(): Promise<EmbudoMensual[]> {
    const { rows } = await this.db.query<EmbudoMensual>(
      `SELECT to_char(mes, 'YYYY-MM-DD') AS mes, postulaciones::int AS postulaciones,
              entrevistas::int AS entrevistas, proyectos_cerrados::int AS proyectos_cerrados,
              pct_postulacion_a_entrevista, pct_entrevista_a_cierre
         FROM vw_embudo_postulaciones ORDER BY mes`,
    );
    return rows;
  }
}
