/**
 * Reconocimiento de errores de PostgreSQL por su código SQLSTATE. Sirve igual para los
 * errores de `pg` y los de PGlite, que exponen `code` y `constraint`.
 */
interface ErrorPostgres {
  code: string;
  constraint?: string;
}

export const SQLSTATE = {
  VIOLACION_UNICA: '23505',
  VIOLACION_CLAVE_FORANEA: '23503',
  VIOLACION_RESTRICCION_CHECK: '23514',
  VIOLACION_NO_NULO: '23502',
} as const;

export function esErrorPostgres(error: unknown): error is ErrorPostgres {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[0-9A-Z]{5}$/.test(error.code)
  );
}

/** `true` si `error` es una violación de unicidad (opcionalmente, de una restricción concreta). */
export function esViolacionUnica(error: unknown, restriccion?: string): boolean {
  return (
    esErrorPostgres(error) &&
    error.code === SQLSTATE.VIOLACION_UNICA &&
    (restriccion === undefined || error.constraint === restriccion)
  );
}
