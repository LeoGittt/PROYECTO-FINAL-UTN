// Reinicia la base de datos: borra los objetos de UTN Match y vuelve a cargar
// `database/schema.sql` y `database/seed.sql`.
//
// Uso (desde backend/):  npm run db:reset
//
// - Sin DATABASE_URL reinicia la base local de PGlite (PGLITE_DATA_DIR, por defecto backend/.data/pglite).
// - Con DATABASE_URL (PostgreSQL o Supabase) pide `--confirmar`: borra los datos de esa base.
//
// Usa el código compilado (`dist/`), por eso el script de npm compila antes.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';

const compilado = new URL('../dist/compartido/infraestructura/', import.meta.url);
if (!existsSync(new URL('configuracion/configuracion.js', compilado))) {
  console.error('No se encontró el código compilado. Ejecute `npm run build` y vuelva a intentar.');
  process.exit(1);
}

const { cargarArchivoEnv, cargarConfiguracion } = await import(
  new URL('configuracion/configuracion.js', compilado)
);
const { crearDb } = await import(new URL('db/crear-db.js', compilado));
const { reiniciarBase } = await import(new URL('db/inicializador.js', compilado));

cargarArchivoEnv();
// Este script no firma tokens: si falta JWT_SECRET (obligatorio en producción) se usa uno descartable.
const configuracion = cargarConfiguracion({
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET ?? randomBytes(32).toString('hex'),
});
const { baseDeDatos } = configuracion;

if (baseDeDatos.url && !process.argv.includes('--confirmar')) {
  console.error(
    'DATABASE_URL está definida: este comando BORRA los datos de esa base y los reemplaza por el seed.\n' +
      'Si es lo que quiere, repita el comando con --confirmar:\n' +
      '  npm run db:reset -- --confirmar',
  );
  process.exit(1);
}

const destino = baseDeDatos.url
  ? 'PostgreSQL (DATABASE_URL)'
  : `PGlite (${baseDeDatos.directorioPglite ?? 'en memoria'})`;
console.log(`Reiniciando la base de datos: ${destino}`);

const db = await crearDb(baseDeDatos);
try {
  await reiniciarBase(db);
  const { rows } = await db.query('SELECT count(*) AS total FROM usuario');
  console.log(`Listo: esquema y datos de ejemplo cargados (${rows[0].total} usuarios).`);
} catch (error) {
  console.error(`No se pudo reiniciar la base: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
