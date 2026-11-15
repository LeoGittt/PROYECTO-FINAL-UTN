import { mkdirSync } from 'node:fs';
import { PGlite, types } from '@electric-sql/pglite';
import type { Db, Fila, ResultadoConsulta } from './db.js';
import { filaACamelCase } from './filas.js';
import { aNumero, fechaAIso } from './tipos.js';

/** Lo que tienen en común `PGlite` y la `Transaction` que PGlite entrega dentro de una transacción. */
interface ConexionPglite {
  query<T>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number; affectedRows?: number }>;
  exec(sql: string): Promise<unknown>;
}

/**
 * `Db` sobre PGlite (PostgreSQL compilado a WebAssembly). Es una sola conexión: las consultas
 * de distintas solicitudes se encolan, lo cual alcanza para desarrollo local y pruebas.
 */
export class DbPglite implements Db {
  private constructor(
    private readonly conexion: ConexionPglite,
    private readonly raiz: PGlite | null,
  ) {}

  /** Abre PGlite en `directorio` (persistente) o en memoria si es `null`. */
  static async abrir(directorio: string | null): Promise<DbPglite> {
    if (directorio) mkdirSync(directorio, { recursive: true });
    const parsers = {
      [types.INT8]: aNumero,
      [types.NUMERIC]: aNumero,
      [types.TIMESTAMPTZ]: (valor: string) =>
        fechaAIso(types.parsers[types.TIMESTAMPTZ](valor)),
      [types.DATE]: (valor: string) => valor,
    };
    const pglite = directorio
      ? new PGlite(directorio, { parsers })
      : new PGlite({ parsers });
    await pglite.waitReady;
    return new DbPglite(pglite, pglite);
  }

  async query<T extends object = Fila>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<ResultadoConsulta<T>> {
    const resultado = await this.conexion.query<Record<string, unknown>>(sql, [
      ...params,
    ]);
    const rows = resultado.rows.map((fila) => filaACamelCase<T>(fila));
    return { rows, rowCount: resultado.rowCount ?? rows.length };
  }

  async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    // Dentro de una transacción en curso no hay raíz: se une a ella.
    if (!this.raiz) return fn(this);
    return this.raiz.transaction((tx) =>
      fn(new DbPglite(tx as unknown as ConexionPglite, null)),
    );
  }

  async ejecutarScript(sql: string): Promise<void> {
    await this.conexion.exec(sql);
  }

  async close(): Promise<void> {
    await this.raiz?.close();
  }
}
