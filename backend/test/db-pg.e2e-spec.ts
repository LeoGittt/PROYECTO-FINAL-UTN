import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbPg } from '../src/compartido/infraestructura/db/db-pg.js';
import { pruebasDeContratoDb } from './ayudantes/contrato-db.js';

/**
 * `DbPg` (el adaptador que se usa con PostgreSQL y Supabase) contra un servidor que habla el
 * protocolo de PostgreSQL: PGlite detrás de un socket TCP local. Comprueba el adaptador de
 * punta a punta (pool, `pg`, intérpretes de tipos, transacciones), con las mismas pruebas que
 * el adaptador de PGlite. No reemplaza una prueba contra un PostgreSQL real.
 */
async function abrirServidor() {
  const pglite = await PGlite.create();
  const servidor = new PGLiteSocketServer({ db: pglite, port: 0, host: '127.0.0.1', maxConnections: 5 });
  await servidor.start();
  // `getServerConn()` devuelve "host:puerto".
  const db = new DbPg({
    url: `postgresql://postgres@${servidor.getServerConn()}/postgres`,
    ssl: false,
    maxConexiones: 3,
  });
  return {
    db,
    cerrar: async () => {
      await db.close();
      await servidor.stop();
      await pglite.close();
    },
  };
}

pruebasDeContratoDb('DbPg sobre el protocolo de PostgreSQL (contrato de Db)', abrirServidor);

describe('DbPg: comportamiento propio del pool', () => {
  let abierta: Awaited<ReturnType<typeof abrirServidor>>;

  beforeAll(async () => {
    abierta = await abrirServidor();
  });
  afterAll(async () => {
    await abierta.cerrar();
  });

  it('varias consultas seguidas reutilizan el pool sin perder resultados', async () => {
    const resultados = [];
    for (let i = 1; i <= 8; i += 1) {
      resultados.push(await abierta.db.query<{ n: number }>(`SELECT $1::bigint AS n`, [i]));
    }
    expect(resultados.map((r) => r.rows[0].n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('una transacción usa una sola conexión: ve sus propios cambios sin confirmar', async () => {
    await abierta.db.ejecutarScript(`CREATE TABLE IF NOT EXISTS tx_prueba (n int)`);
    await abierta.db.transaction(async (tx) => {
      await tx.query(`INSERT INTO tx_prueba VALUES (1)`);
      const { rows } = await tx.query<{ total: number }>(`SELECT count(*) AS total FROM tx_prueba`);
      expect(rows[0].total).toBe(1);
    });
    const { rows } = await abierta.db.query<{ total: number }>(`SELECT count(*) AS total FROM tx_prueba`);
    expect(rows[0].total).toBe(1);
  });
});
