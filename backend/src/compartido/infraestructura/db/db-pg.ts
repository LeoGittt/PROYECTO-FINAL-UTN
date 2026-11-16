import { Logger } from '@nestjs/common';
import pg from 'pg';
import type { Db, Fila, ResultadoConsulta } from './db.js';
import { filaACamelCase } from './filas.js';
import { aArregloNumerico, aNumero, fechaAIso, OID } from './tipos.js';

const { Pool, types } = pg;

/** Intérpretes de tipos de `pg`: ver `tipos.ts`. El resto de los tipos usa el comportamiento por defecto. */
const parserTimestamptz = types.getTypeParser(OID.TIMESTAMPTZ, 'text');
const parsersPropios: Record<number, (valor: string) => unknown> = {
  [OID.INT8]: aNumero,
  [OID.NUMERIC]: aNumero,
  [OID.DATE]: (valor) => valor,
  [OID.TIMESTAMPTZ]: (valor) => fechaAIso(parserTimestamptz(valor)),
  [OID.ARREGLO_INT8]: aArregloNumerico,
  [OID.ARREGLO_NUMERIC]: aArregloNumerico,
};
const tiposPropios = {
  getTypeParser: ((oid: number, formato?: 'text' | 'binary') =>
    parsersPropios[oid] ?? types.getTypeParser(oid, formato)) as typeof types.getTypeParser,
};

type Ejecutor = Pick<pg.Pool | pg.PoolClient, 'query'>;

async function consultar<T extends object>(
  ejecutor: Ejecutor,
  sql: string,
  params: readonly unknown[],
): Promise<ResultadoConsulta<T>> {
  const resultado = await ejecutor.query(sql, [...params]);
  const rows = resultado.rows.map((fila: Record<string, unknown>) =>
    filaACamelCase<T>(fila),
  );
  return { rows, rowCount: resultado.rowCount ?? rows.length };
}

/** `Db` sobre un pool de `pg`. Sirve para PostgreSQL local, Supabase o cualquier servidor compatible. */
export class DbPg implements Db {
  private readonly logger = new Logger('DbPg');
  private readonly pool: pg.Pool;

  constructor(opciones: { url: string; ssl: boolean; maxConexiones?: number }) {
    this.pool = new Pool({
      connectionString: opciones.url,
      ssl: opciones.ssl ? { rejectUnauthorized: false } : undefined,
      max: opciones.maxConexiones ?? 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      types: tiposPropios,
    });
    // Un error en una conexión inactiva no debe tumbar el proceso.
    this.pool.on('error', (error) =>
      this.logger.error(`Error en una conexión inactiva: ${error.message}`),
    );
  }

  query<T extends object = Fila>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<ResultadoConsulta<T>> {
    return consultar<T>(this.pool, sql, params);
  }

  async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    let conexionRota = false;
    try {
      await cliente.query('BEGIN');
      const resultado = await fn(new TransaccionPg(cliente));
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      try {
        await cliente.query('ROLLBACK');
      } catch {
        conexionRota = true;
      }
      throw error;
    } finally {
      cliente.release(conexionRota);
    }
  }

  async ejecutarScript(sql: string): Promise<void> {
    const cliente = await this.pool.connect();
    let conexionRota = false;
    try {
      await cliente.query(sql);
    } catch (error) {
      // Si el script falla a mitad de una transacción, la conexión quedaría abortada.
      try {
        await cliente.query('ROLLBACK');
      } catch {
        conexionRota = true;
      }
      throw error;
    } finally {
      cliente.release(conexionRota);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/** Las consultas de una transacción viajan por la misma conexión. */
class TransaccionPg implements Db {
  constructor(private readonly cliente: pg.PoolClient) {}

  query<T extends object = Fila>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<ResultadoConsulta<T>> {
    return consultar<T>(this.cliente, sql, params);
  }

  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async ejecutarScript(sql: string): Promise<void> {
    await this.cliente.query(sql);
  }

  async close(): Promise<void> {
    // La conexión es de la transacción: la libera `DbPg.transaction`.
  }
}
