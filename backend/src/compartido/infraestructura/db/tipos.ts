/**
 * Conversión de tipos de PostgreSQL a JavaScript, compartida por `pg` y PGlite:
 *  - bigint (int8) y numeric -> number
 *  - timestamptz -> texto ISO 8601 (UTC)
 *  - date -> texto `YYYY-MM-DD` (sin pasar por Date, para que no cambie con la zona horaria)
 *
 * Los OID son los de `pg_type`.
 */
export const OID = {
  INT8: 20,
  NUMERIC: 1700,
  DATE: 1082,
  TIMESTAMPTZ: 1184,
  ARREGLO_INT8: 1016,
  ARREGLO_NUMERIC: 1231,
} as const;

export function aNumero(valor: string): number {
  return Number(valor);
}

/** Convierte un `timestamptz` ya interpretado como `Date` al texto ISO. Conserva `infinity`. */
export function fechaAIso(valor: unknown): unknown {
  return valor instanceof Date && !Number.isNaN(valor.getTime())
    ? valor.toISOString()
    : valor;
}

/**
 * Interpreta un arreglo numérico de PostgreSQL, por ejemplo `{1,2,3}` o `{1.5,NULL}`.
 * Solo sirve para arreglos de enteros y decimales (sin comillas ni anidamiento).
 */
export function aArregloNumerico(valor: string): Array<number | null> {
  const contenido = valor.trim().slice(1, -1);
  if (contenido === '') return [];
  return contenido
    .split(',')
    .map((elemento) => (elemento === 'NULL' ? null : Number(elemento)));
}
