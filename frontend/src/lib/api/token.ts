/**
 * Almacenamiento del JWT en el navegador.
 *
 * localStorage puede no estar disponible (ventana privada, datos bloqueados) o
 * lanzar una excepción, por eso cada acceso va en try/catch y hay una copia en
 * memoria: la sesión sigue funcionando mientras la pestaña esté abierta.
 */

export const TOKEN_STORAGE_KEY = "utnmatch.token";

let tokenEnMemoria: string | null = null;

export function getToken(): string | null {
  try {
    const guardado = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (guardado) return guardado;
  } catch {
    // Sin acceso a localStorage: se usa la copia en memoria.
  }
  return tokenEnMemoria;
}

export function setToken(token: string): void {
  tokenEnMemoria = token;
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Se mantiene solo en memoria.
  }
}

export function clearToken(): void {
  tokenEnMemoria = null;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Nada para limpiar.
  }
}
