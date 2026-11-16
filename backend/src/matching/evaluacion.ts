// Métricas de la evaluación del motor (RF-10). Funciones puras: no dependen de NestJS ni de la base.
import type { PuntajeDePar } from './motor.js';

/** Un par del conjunto de referencia (`match_referencia`). */
export interface ParEtiquetado {
  idEstudiante: number;
  idProyecto: number;
  esRelevante: boolean;
}

/** Lo que se usa de cada puntaje calculado por el motor. */
type PuntajeCalculado = Pick<PuntajeDePar, 'idEstudiante' | 'idProyecto' | 'total'>;

export interface Metricas {
  cantidadEstudiantes: number;
  precisionGlobal: number;
  recallGlobal: number;
  precisionTopK: number;
}

const clave = (idEstudiante: number, idProyecto: number) => `${idEstudiante}-${idProyecto}`;
const dividir = (a: number, b: number) => (b === 0 ? 0 : a / b);
// La tabla guarda NUMERIC(5,4).
const redondear = (valor: number) => Math.round(valor * 10_000) / 10_000;

/**
 * Las tres métricas de `evaluacion_motor`, calculadas solo sobre los pares etiquetados (ver
 * schema.sql). Un proyecto está recomendado a un estudiante si su puntaje alcanza el umbral, y el
 * top-k de un estudiante son sus k recomendados de mayor puntaje.
 * - Precisión global: recomendados relevantes / recomendados etiquetados.
 * - Recall global: recomendados relevantes / relevantes etiquetados.
 * - Precisión en el top-k: promedio, entre los estudiantes con algún etiquetado en su top-k, de
 *   la proporción de relevantes entre esos etiquetados.
 */
export function calcularMetricas(
  puntajes: readonly PuntajeCalculado[],
  referencia: readonly ParEtiquetado[],
  umbral: number,
  k: number,
): Metricas {
  const puntajePorPar = new Map(puntajes.map((p) => [clave(p.idEstudiante, p.idProyecto), p.total]));
  const relevantePorPar = new Map(referencia.map((r) => [clave(r.idEstudiante, r.idProyecto), r.esRelevante]));
  // Un par sin puntaje (por ejemplo, un proyecto en borrador) no está recomendado.
  const recomendado = (r: ParEtiquetado) => (puntajePorPar.get(clave(r.idEstudiante, r.idProyecto)) ?? 0) >= umbral;

  const recomendadosEtiquetados = referencia.filter(recomendado);
  const relevantesRecomendados = recomendadosEtiquetados.filter((r) => r.esRelevante).length;
  const relevantes = referencia.filter((r) => r.esRelevante).length;

  const estudiantes = [...new Set(referencia.map((r) => r.idEstudiante))];
  const precisiones: number[] = [];
  for (const idEstudiante of estudiantes) {
    const topK = puntajes
      .filter((p) => p.idEstudiante === idEstudiante && p.total >= umbral)
      .sort((a, b) => b.total - a.total || a.idProyecto - b.idProyecto)
      .slice(0, k);
    const etiquetados = topK
      .map((p) => relevantePorPar.get(clave(idEstudiante, p.idProyecto)))
      .filter((esRelevante) => esRelevante !== undefined);
    if (etiquetados.length > 0) {
      precisiones.push(etiquetados.filter(Boolean).length / etiquetados.length);
    }
  }

  return {
    cantidadEstudiantes: estudiantes.length,
    precisionGlobal: redondear(dividir(relevantesRecomendados, recomendadosEtiquetados.length)),
    recallGlobal: redondear(dividir(relevantesRecomendados, relevantes)),
    precisionTopK: redondear(dividir(precisiones.reduce((suma, p) => suma + p, 0), precisiones.length)),
  };
}
