/**
 * Acceso a datos. Los módulos hablan con la base solo a través de esta interfaz, que tiene
 * dos implementaciones: `pg` (PostgreSQL / Supabase, cuando hay `DATABASE_URL`) y PGlite
 * (PostgreSQL embebido, para desarrollo local y pruebas).
 *
 * Contrato común a las dos implementaciones:
 *  - Las consultas son siempre parametrizadas (`$1`, `$2`...). Nunca se arma SQL concatenando
 *    datos del usuario.
 *  - Las columnas `bigint` y `numeric` llegan como `number`, `timestamptz` como texto ISO 8601
 *    y `date` como `YYYY-MM-DD`.
 *  - Los nombres de columna llegan en camelCase (`id_usuario` -> `idUsuario`), así que un
 *    repositorio no necesita mapear filas a mano.
 */
export type Fila = Record<string, unknown>;

export interface ResultadoConsulta<T extends object = Fila> {
  rows: T[];
  /** Filas devueltas (SELECT) o afectadas (INSERT / UPDATE / DELETE). */
  rowCount: number;
}

export interface Db {
  query<T extends object = Fila>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<ResultadoConsulta<T>>;

  /**
   * Ejecuta `fn` en una transacción: confirma si termina bien y revierte si lanza.
   * Dentro de `fn` hay que usar SIEMPRE el `tx` recibido y no el `Db` de afuera (con PGlite,
   * usar el de afuera espera a que termine la transacción y se traba). Si se llama
   * `transaction` sobre un `tx`, se une a la transacción en curso.
   */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;

  /** Ejecuta un script con varias sentencias y sin parámetros. Se usa solo al inicializar la base. */
  ejecutarScript(sql: string): Promise<void>;

  /** Cierra la conexión o el pool. */
  close(): Promise<void>;
}

/** Token de inyección de `Db`. */
export const DB = Symbol('DB');
