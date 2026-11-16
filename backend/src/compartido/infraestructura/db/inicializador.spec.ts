import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from './db.js';
import { DbPglite } from './db-pglite.js';
import {
  directorioDeScripts,
  inicializarBaseSiEstaVacia,
  reiniciarBase,
  sentenciasDeLimpieza,
  vaciarBase,
} from './inicializador.js';

const contar = async (db: Db, tabla: string): Promise<number> => {
  const { rows } = await db.query<{ total: number }>(`SELECT count(*) AS total FROM ${tabla}`);
  return rows[0].total;
};

describe('sentenciasDeLimpieza', () => {
  it('borra vistas, tablas, funciones y tipos, en ese orden, ignorando los comentarios', () => {
    const sentencias = sentenciasDeLimpieza(`
      -- CREATE TABLE comentada (id int);
      CREATE TYPE color AS ENUM ('rojo');
      CREATE FUNCTION fn_algo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
      CREATE TABLE padre (id int);
      CREATE TABLE hijo (id int);
      CREATE UNIQUE INDEX uq_padre ON padre (id);
      CREATE VIEW vw_padre AS SELECT * FROM padre;
    `);
    expect(sentencias).toEqual([
      'DROP VIEW IF EXISTS vw_padre CASCADE',
      'DROP TABLE IF EXISTS hijo CASCADE',
      'DROP TABLE IF EXISTS padre CASCADE',
      'DROP FUNCTION IF EXISTS fn_algo CASCADE',
      'DROP TYPE IF EXISTS color CASCADE',
    ]);
  });

  it('cubre lo que crea el schema.sql real y borra las vistas antes que las tablas', () => {
    const real = sentenciasDeLimpieza(
      readFileSync(`${directorioDeScripts()}schema.sql`, 'utf8'),
    );
    expect(real).toContain('DROP TABLE IF EXISTS usuario CASCADE');
    expect(real).toContain('DROP VIEW IF EXISTS vw_embudo_postulaciones CASCADE');
    expect(real).toContain('DROP FUNCTION IF EXISTS fn_registrar_historial_postulacion CASCADE');
    expect(real).toContain('DROP TYPE IF EXISTS rol_usuario CASCADE');
    expect(real.findIndex((s) => s.startsWith('DROP VIEW'))).toBeLessThan(
      real.findIndex((s) => s.startsWith('DROP TABLE')),
    );
  });
});

describe('inicialización de la base', () => {
  let db: Db;

  beforeAll(async () => {
    db = await DbPglite.abrir(null);
  });
  afterAll(async () => {
    await db.close();
  });

  it('en una base vacía aplica schema.sql y seed.sql', async () => {
    expect(await inicializarBaseSiEstaVacia(db)).toBe('inicializada');

    expect(await contar(db, 'usuario')).toBe(29);
    expect(await contar(db, 'carrera')).toBe(3);
    expect(await contar(db, 'tecnologia')).toBe(43);
    expect(await contar(db, 'habilidad')).toBe(8);
    expect(await contar(db, 'proyecto')).toBe(14);
    expect(await contar(db, 'postulacion')).toBe(24);
    // El seed no trae puntajes inventados: los calcula el motor.
    expect(await contar(db, 'match')).toBe(0);
    const { rows } = await db.query<{ nombre: string }>(
      `SELECT nombre FROM configuracion_motor WHERE activa`,
    );
    expect(rows.map((fila) => fila.nombre)).toEqual(['v1-tags-contexto']);
  });

  it('si el esquema ya existe no toca nada', async () => {
    await db.query(`INSERT INTO habilidad (nombre) VALUES ('Dato propio')`);
    expect(await inicializarBaseSiEstaVacia(db)).toBe('existente');
    expect(await contar(db, 'usuario')).toBe(29);
    expect(await contar(db, 'habilidad')).toBe(9);
  });

  it('reiniciarBase deja la base como recién cargada', async () => {
    await reiniciarBase(db);
    expect(await contar(db, 'habilidad')).toBe(8);
    expect(await contar(db, 'usuario')).toBe(29);
  });

  it('vaciarBase borra tablas, vistas, funciones y tipos de UTN Match', async () => {
    await vaciarBase(db);
    const objetos = await db.query<{ total: number }>(`
      SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public')
           + (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
               WHERE n.nspname = 'public' AND t.typtype = 'e')
           + (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'public') AS total`);
    expect(objetos.rows[0].total).toBe(0);
    // Y se puede volver a cargar.
    expect(await inicializarBaseSiEstaVacia(db)).toBe('inicializada');
  });

  it('si el seed falla, deja la base vacía para que el próximo arranque reintente', async () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'utn-match-init-'));
    try {
      copyFileSync(`${directorioDeScripts()}schema.sql`, join(carpeta, 'schema.sql'));
      writeFileSync(join(carpeta, 'seed.sql'), 'INSERT INTO tabla_inexistente VALUES (1);');
      const otra = await DbPglite.abrir(null);
      try {
        await expect(inicializarBaseSiEstaVacia(otra, `${carpeta}/`)).rejects.toThrow(
          /tabla_inexistente/,
        );
        const { rows } = await otra.query<{ existe: boolean }>(
          `SELECT to_regclass('usuario') IS NOT NULL AS existe`,
        );
        expect(rows[0].existe).toBe(false);
      } finally {
        await otra.close();
      }
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});
