import { pruebasDeContratoDb } from '../../../../test/ayudantes/contrato-db.js';
import { DbPglite } from './db-pglite.js';

pruebasDeContratoDb('DbPglite (contrato de Db sobre el esquema real)', async () => {
  const db = await DbPglite.abrir(null);
  return { db, cerrar: () => db.close() };
});
