import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../../src/compartido/infraestructura/db/db.js';
import { inicializarBaseSiEstaVacia } from '../../src/compartido/infraestructura/db/inicializador.js';
import { fijarUsuarioResponsable } from '../../src/compartido/infraestructura/db/usuario-responsable.js';

export interface DbAbierta {
  db: Db;
  cerrar(): Promise<void>;
}

/**
 * Pruebas del contrato de `Db` sobre el esquema real. Las corren todos los adaptadores
 * (PGlite y `pg`), así los módulos reciben exactamente lo mismo sin importar el motor.
 */
export function pruebasDeContratoDb(
  nombre: string,
  abrir: () => Promise<DbAbierta>,
): void {
  describe(nombre, () => {
    let db: Db;
    let cerrar: () => Promise<void>;

    beforeAll(async () => {
      ({ db, cerrar } = await abrir());
      await inicializarBaseSiEstaVacia(db);
    });
    afterAll(async () => {
      await cerrar();
    });

    describe('conversión de tipos', () => {
      it('devuelve bigint como number, incluso los de count(*)', async () => {
        const { rows } = await db.query<{ id: number; cantidad: number }>(
          `SELECT 9007199254740991::bigint AS id, count(*) AS cantidad FROM carrera`,
        );
        expect(rows[0].id).toBe(Number.MAX_SAFE_INTEGER);
        expect(rows[0].cantidad).toBe(3);
      });

      it('devuelve numeric como number', async () => {
        const { rows } = await db.query<{ pesoTecnologias: number; pesoContexto: number }>(
          `SELECT peso_tecnologias, peso_contexto FROM configuracion_motor WHERE activa`,
        );
        expect(rows[0]).toEqual({ pesoTecnologias: 0.7, pesoContexto: 0.3 });
      });

      it('devuelve timestamptz como texto ISO 8601 en UTC', async () => {
        const { rows } = await db.query<{ fechaRegistro: string }>(
          `SELECT fecha_registro FROM usuario WHERE email = 'admin@utnmatch.test'`,
        );
        // El seed la carga como 2026-02-01 09:00 en UTC-3.
        expect(rows[0].fechaRegistro).toBe('2026-02-01T12:00:00.000Z');
      });

      it('devuelve date como texto YYYY-MM-DD', async () => {
        const { rows } = await db.query<{ dia: string }>(`SELECT date '2026-03-01' AS dia`);
        expect(rows[0].dia).toBe('2026-03-01');
      });

      it('devuelve los arreglos de bigint y numeric con elementos number', async () => {
        const { rows } = await db.query<{ ids: number[]; pesos: number[] }>(
          `SELECT array_agg(id_carrera ORDER BY id_carrera) AS ids,
                  ARRAY[1.5, 2.25]::numeric[] AS pesos
             FROM carrera`,
        );
        expect(rows[0].ids).toEqual([1, 2, 3]);
        expect(rows[0].pesos).toEqual([1.5, 2.25]);
      });

      it('devuelve las columnas en camelCase', async () => {
        const { rows } = await db.query(
          `SELECT id_carrera, duracion_anios FROM carrera ORDER BY id_carrera LIMIT 1`,
        );
        expect(Object.keys(rows[0])).toEqual(['idCarrera', 'duracionAnios']);
      });
    });

    describe('consultas parametrizadas', () => {
      it('trata los parámetros como datos y nunca como SQL', async () => {
        const intento = `' OR 1=1 --`;
        const { rows } = await db.query(`SELECT 1 FROM usuario WHERE email = $1`, [intento]);
        expect(rows).toHaveLength(0);
      });

      it('acepta arreglos como parámetro', async () => {
        const { rows } = await db.query<{ idCarrera: number }>(
          `SELECT id_carrera FROM carrera WHERE id_carrera = ANY($1::bigint[]) ORDER BY 1`,
          [[1, 3, 99]],
        );
        expect(rows.map((fila) => fila.idCarrera)).toEqual([1, 3]);
      });

      it('acepta null y texto con comillas y acentos', async () => {
        const { rows } = await db.query<{ a: string | null; b: string }>(
          `SELECT $1::text AS a, $2::text AS b`,
          [null, `O'Brien "ñandú" ✓`],
        );
        expect(rows[0]).toEqual({ a: null, b: `O'Brien "ñandú" ✓` });
      });

      it('informa las filas afectadas por UPDATE y DELETE', async () => {
        const actualizar = await db.query(
          `UPDATE carrera SET nombre = nombre WHERE id_carrera <= 2`,
        );
        expect(actualizar.rowCount).toBe(2);
        const borrar = await db.query(`DELETE FROM habilidad WHERE id_habilidad = 99999`);
        expect(borrar.rowCount).toBe(0);
      });
    });

    describe('transacciones', () => {
      it('confirma los cambios cuando la función termina bien', async () => {
        await db.transaction(async (tx) => {
          await tx.query(`INSERT INTO habilidad (nombre) VALUES ('Habilidad confirmada')`);
        });
        const { rows } = await db.query(
          `SELECT 1 FROM habilidad WHERE nombre = 'Habilidad confirmada'`,
        );
        expect(rows).toHaveLength(1);
      });

      it('revierte todo cuando la función lanza y propaga el error', async () => {
        await expect(
          db.transaction(async (tx) => {
            await tx.query(`INSERT INTO habilidad (nombre) VALUES ('Habilidad revertida')`);
            throw new Error('falla a propósito');
          }),
        ).rejects.toThrow('falla a propósito');
        const { rows } = await db.query(
          `SELECT 1 FROM habilidad WHERE nombre = 'Habilidad revertida'`,
        );
        expect(rows).toHaveLength(0);
      });

      it('revierte la transacción cuando una consulta falla a mitad de camino', async () => {
        await expect(
          db.transaction(async (tx) => {
            await tx.query(`INSERT INTO habilidad (nombre) VALUES ('Habilidad a medias')`);
            await tx.query(`INSERT INTO habilidad (id_habilidad, nombre) VALUES (1, 'Repetida')`);
          }),
        ).rejects.toMatchObject({ code: expect.any(String) });
        const { rows } = await db.query(
          `SELECT 1 FROM habilidad WHERE nombre = 'Habilidad a medias'`,
        );
        expect(rows).toHaveLength(0);
        // Y la conexión sigue sirviendo.
        await expect(db.query(`SELECT 1 AS uno`)).resolves.toMatchObject({ rows: [{ uno: 1 }] });
      });

      it('una transacción anidada se une a la que está en curso', async () => {
        await expect(
          db.transaction(async (tx) => {
            await tx.transaction(async (interna) => {
              await interna.query(`INSERT INTO habilidad (nombre) VALUES ('Habilidad anidada')`);
            });
            throw new Error('revierte también la anidada');
          }),
        ).rejects.toThrow();
        const { rows } = await db.query(
          `SELECT 1 FROM habilidad WHERE nombre = 'Habilidad anidada'`,
        );
        expect(rows).toHaveLength(0);
      });

      it('un error de la base se propaga con su código SQLSTATE', async () => {
        await expect(
          db.query(
            `INSERT INTO usuario (nombre, apellido, email, contrasena_hash, rol)
             VALUES ('a', 'b', 'admin@utnmatch.test', $1, 'estudiante')`,
            ['x'.repeat(60)],
          ),
        ).rejects.toMatchObject({ code: '23505', constraint: 'uq_usuario_email' });
      });
    });

    describe('ejecutarScript', () => {
      it('ejecuta varias sentencias juntas', async () => {
        await db.ejecutarScript(`
          CREATE TEMP TABLE prueba_script (n int);
          INSERT INTO prueba_script VALUES (1), (2);
        `);
      });

      it('un script que falla propaga el error y deja la conexión utilizable', async () => {
        await expect(
          db.ejecutarScript(`SELECT 1; INSERT INTO tabla_que_no_existe VALUES (1);`),
        ).rejects.toThrow(/tabla_que_no_existe/);
        await expect(db.query(`SELECT 2 AS dos`)).resolves.toMatchObject({ rows: [{ dos: 2 }] });
      });
    });

    describe('fijarUsuarioResponsable', () => {
      it('el trigger del historial registra al responsable del cambio de estado', async () => {
        // Seed: el estudiante 1 tiene una postulación pendiente al proyecto 13.
        await db.transaction(async (tx) => {
          await fijarUsuarioResponsable(tx, 2);
          await tx.query(
            `UPDATE postulacion SET estado = 'en_revision' WHERE id_estudiante = 1 AND id_proyecto = 13`,
          );
        });
        const { rows } = await db.query<{
          estadoAnterior: string;
          estadoNuevo: string;
          idUsuarioResponsable: number;
        }>(
          `SELECT h.estado_anterior, h.estado_nuevo, h.id_usuario_responsable
             FROM postulacion_historial h
             JOIN postulacion p ON p.id_postulacion = h.id_postulacion
            WHERE p.id_estudiante = 1 AND p.id_proyecto = 13
            ORDER BY h.id_historial DESC LIMIT 1`,
        );
        expect(rows[0]).toEqual({
          estadoAnterior: 'pendiente',
          estadoNuevo: 'en_revision',
          idUsuarioResponsable: 2,
        });
      });

      it('el valor vale solo dentro de la transacción', async () => {
        await db.transaction(async (tx) => {
          await fijarUsuarioResponsable(tx, 7);
        });
        const { rows } = await db.query<{ valor: string | null }>(
          `SELECT current_setting('utn_match.id_usuario', true) AS valor`,
        );
        expect(rows[0].valor ?? '').toBe('');
      });
    });
  });
}
