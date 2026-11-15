import { ErrorValidacion } from '../../compartido/dominio/errores.js';

/**
 * Política de contraseñas (docs/api/CONTRATO.md, sección 2): al menos 8 caracteres, con una
 * letra y un número. Se agrega el tope de 72 bytes porque bcrypt ignora lo que sigue.
 */
export const LARGO_MINIMO_CONTRASENA = 8;
export const BYTES_MAXIMOS_CONTRASENA = 72;

/** Devuelve los problemas de una contraseña (lista vacía si cumple la política). */
export function problemasDeContrasena(contrasena: string): string[] {
  const problemas: string[] = [];
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    problemas.push(`Debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres`);
  }
  if (!/\p{L}/u.test(contrasena)) problemas.push('Debe incluir al menos una letra');
  if (!/\d/.test(contrasena)) problemas.push('Debe incluir al menos un número');
  if (new TextEncoder().encode(contrasena).length > BYTES_MAXIMOS_CONTRASENA) {
    problemas.push(`No puede superar los ${BYTES_MAXIMOS_CONTRASENA} bytes`);
  }
  return problemas;
}

/** Lanza `ErrorValidacion` si la contraseña no cumple la política. */
export function exigirContrasenaValida(
  contrasena: string,
  campo = 'contrasena',
): void {
  const problemas = problemasDeContrasena(contrasena);
  if (problemas.length > 0) {
    throw new ErrorValidacion(
      'La contraseña no cumple los requisitos',
      problemas.map((mensaje) => ({ campo, mensaje })),
    );
  }
}
