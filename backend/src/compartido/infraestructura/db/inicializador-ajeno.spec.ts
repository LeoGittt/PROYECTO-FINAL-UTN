import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from './db.js';
import { DbPglite } from './db-pglite.js';
import { inicializarBaseSiEstaVacia } from './inicializador.js';

describe('inicialización sobre una base que ya tiene objetos de otra aplicación', () => {
  let db: Db;

  beforeAll(async () => {
    db = await DbPglite.abrir(null);
  });
  afterAll(async () => {
    await db.close();
  });

  it('si el esquema no se puede crear, no borra lo que ya había', async () => {
    // Una tabla y un tipo ajenos, con los mismos nombres que usa schema.sql.
    await db.ejecutarScript(`
      CREATE TABLE proyecto (id integer, titulo text);
      INSERT INTO proyecto VALUES (1, 'ajeno'), (2, 'ajeno'), (3, 'ajeno');
      CREATE TYPE modalidad AS ENUM ('otra');
    `);

    await expect(inicializarBaseSiEstaVacia(db)).rejects.toThrow(/modalidad/);

    const proyectos = await db.query<{ total: number }>('SELECT count(*) AS total FROM proyecto');
    expect(proyectos.rows[0].total).toBe(3);
    const tipo = await db.query<{ existe: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modalidad') AS existe`,
    );
    expect(tipo.rows[0].existe).toBe(true);
    // Y la base sigue usable después del fallo (no quedó una transacción abortada).
    await expect(db.query('SELECT 1')).resolves.toBeDefined();
  });
});
