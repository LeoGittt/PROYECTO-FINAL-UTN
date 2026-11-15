import { Logger } from '@nestjs/common';
import type { Configuracion } from '../configuracion/configuracion.js';
import type { Db } from './db.js';
import { DbPg } from './db-pg.js';
import { DbPglite } from './db-pglite.js';
import { inicializarBaseSiEstaVacia } from './inicializador.js';

/** Abre la conexión que corresponde: `pg` si hay `DATABASE_URL`, PGlite si no. */
export async function crearDb(
  config: Configuracion['baseDeDatos'],
): Promise<Db> {
  if (config.url) return new DbPg({ url: config.url, ssl: config.ssl });
  return DbPglite.abrir(config.directorioPglite);
}

/** Abre la conexión y, si `DB_AUTO_INIT` lo permite, carga esquema y datos en una base vacía. */
export async function crearDbLista(
  config: Configuracion['baseDeDatos'],
): Promise<Db> {
  const logger = new Logger('Base de datos');
  const db = await crearDb(config);
  try {
    logger.log(
      config.url
        ? 'Motor: PostgreSQL (DATABASE_URL)'
        : `Motor: PGlite (${config.directorioPglite ?? 'en memoria'})`,
    );
    if (config.autoInicializar) await inicializarBaseSiEstaVacia(db);
  } catch (error) {
    await db.close().catch(() => undefined);
    throw error;
  }
  return db;
}
