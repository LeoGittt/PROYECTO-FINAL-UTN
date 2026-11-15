/**
 * Utilidades del puntaje de compatibilidad. El backend devuelve valores de 0 a 1;
 * la interfaz los muestra como porcentaje y los clasifica en bandas.
 */

export type BandaCompatibilidad = "alta" | "media" | "baja";

export const UMBRAL_ALTA = 0.75;
export const UMBRAL_MEDIA = 0.5;

/** Limita el puntaje a [0, 1]. Devuelve `null` si no hay dato (null, undefined, NaN, infinito). */
export function normalizarPuntaje(valor: number | null | undefined): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
  return Math.min(1, Math.max(0, valor));
}

/** Porcentaje entero de 0 a 100, o `null` si no hay dato. */
export function puntajeAPorcentaje(valor: number | null | undefined): number | null {
  const normalizado = normalizarPuntaje(valor);
  return normalizado === null ? null : Math.round(normalizado * 100);
}

export function bandaDePuntaje(valor: number | null | undefined): BandaCompatibilidad | null {
  const normalizado = normalizarPuntaje(valor);
  if (normalizado === null) return null;
  if (normalizado >= UMBRAL_ALTA) return "alta";
  if (normalizado >= UMBRAL_MEDIA) return "media";
  return "baja";
}
