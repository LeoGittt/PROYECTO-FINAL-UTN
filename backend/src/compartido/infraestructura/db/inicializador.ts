import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Logger } from '@nestjs/common';
import type { Db } from './db.js';

/** Carpeta `backend/database/` (funciona igual desde `src/` y desde `dist/`). */
export function directorioDeScripts(): string {
  return fileURLToPath(new URL('../../../../database/', import.meta.url));
}

export type ResultadoInicializacion = 'inicializada' | 'existente';

/**
 * Primer arranque: si la base no tiene el esquema (no existe la tabla `usuario`), aplica
 * `schema.sql` y después `seed.sql`. Si ya lo tiene, no toca nada. Si falla a mitad de
 * camino, deja la base vacía para que el próximo arranque reintente.
 */
export async function inicializarBaseSiEstaVacia(
  db: Db,
  directorio: string = directorioDeScripts(),
): Promise<ResultadoInicializacion> {
  const logger = new Logger('Base de datos');
  const { rows } = await db.query<{ existe: boolean }>(
    `SELECT to_regclass('usuario') IS NOT NULL AS existe`,
  );
  if (rows[0]?.existe) return 'existente';

  logger.log('Base vacía: aplicando schema.sql y seed.sql');
  try {
    await db.ejecutarScript(await readFile(`${directorio}schema.sql`, 'utf8'));
    await db.ejecutarScript(await readFile(`${directorio}seed.sql`, 'utf8'));
  } catch (error) {
    await vaciarBase(db, directorio).catch(() => undefined);
    throw error;
  }
  return 'inicializada';
}

/**
 * Sentencias que borran todo lo que crea `schema.sql` (vistas, tablas, funciones y tipos) y
 * nada más. Se deducen del propio script para que no puedan quedar desactualizadas.
 */
export function sentenciasDeLimpieza(schemaSql: string): string[] {
  const sinComentarios = schemaSql.replace(/--.*$/gm, '');
  const nombres = (tipo: string): string[] =>
    [...sinComentarios.matchAll(new RegExp(`CREATE\\s+${tipo}\\s+(\\w+)`, 'gi'))]
      .map((coincidencia) => coincidencia[1])
      .reverse();
  return [
    ...nombres('VIEW').map((n) => `DROP VIEW IF EXISTS ${n} CASCADE`),
    ...nombres('TABLE').map((n) => `DROP TABLE IF EXISTS ${n} CASCADE`),
    ...nombres('FUNCTION').map((n) => `DROP FUNCTION IF EXISTS ${n} CASCADE`),
    ...nombres('TYPE').map((n) => `DROP TYPE IF EXISTS ${n} CASCADE`),
  ];
}

/** Borra los objetos de UTN Match de la base (no toca nada que no haya creado `schema.sql`). */
export async function vaciarBase(
  db: Db,
  directorio: string = directorioDeScripts(),
): Promise<void> {
  const schema = await readFile(`${directorio}schema.sql`, 'utf8');
  await db.ejecutarScript(`${sentenciasDeLimpieza(schema).join(';\n')};`);
}

/** `db:reset`: vacía la base y vuelve a cargar esquema y datos de ejemplo. */
export async function reiniciarBase(
  db: Db,
  directorio: string = directorioDeScripts(),
): Promise<void> {
  await vaciarBase(db, directorio);
  const resultado = await inicializarBaseSiEstaVacia(db, directorio);
  if (resultado !== 'inicializada') {
    throw new Error('No se pudo reiniciar la base: el esquema sigue presente');
  }
}
