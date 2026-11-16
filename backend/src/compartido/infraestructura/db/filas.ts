import type { Fila } from './db.js';

const cacheDeClaves = new Map<string, string>();

/** `id_usuario` -> `idUsuario`. Las claves sin guion bajo quedan igual. */
export function aCamelCase(clave: string): string {
  let resultado = cacheDeClaves.get(clave);
  if (resultado === undefined) {
    resultado = clave.replace(/_+([a-z0-9])/g, (_, letra: string) =>
      letra.toUpperCase(),
    );
    cacheDeClaves.set(clave, resultado);
  }
  return resultado;
}

/**
 * Convierte las claves de una fila a camelCase. Es la única función de mapeo de filas del
 * proyecto: la usan las dos implementaciones de `Db`.
 */
export function filaACamelCase<T extends object>(fila: Record<string, unknown>): T {
  const resultado: Fila = {};
  for (const clave of Object.keys(fila)) {
    resultado[aCamelCase(clave)] = fila[clave];
  }
  return resultado as T;
}
