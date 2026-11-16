import type { RolRegistrable } from "@/lib/api/types";

/** Validaciones de login y registro. Los mensajes están en español y se muestran tal cual. */

export type Errores<K extends string> = Partial<Record<K, string>>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const MIN_CONTRASENA = 8;

export function validarEmail(valor: string): string | undefined {
  const email = valor.trim();
  if (!email) return "Ingresá tu email.";
  if (!EMAIL.test(email)) return "Ingresá un email válido, por ejemplo nombre@dominio.com.";
  if (email.length > 160) return "El email no puede superar los 160 caracteres.";
  return undefined;
}

export interface ReglasContrasena {
  largo: boolean;
  letra: boolean;
  numero: boolean;
}

/** Reglas del contrato: al menos 8 caracteres, con una letra y un número. */
export function reglasContrasena(contrasena: string): ReglasContrasena {
  return {
    largo: contrasena.length >= MIN_CONTRASENA,
    letra: /\p{L}/u.test(contrasena),
    numero: /\d/.test(contrasena),
  };
}

export function contrasenaValida(contrasena: string): boolean {
  const r = reglasContrasena(contrasena);
  return r.largo && r.letra && r.numero;
}

// --- Login -------------------------------------------------------------------

export interface ValoresLogin {
  email: string;
  contrasena: string;
}

export function validarLogin(valores: ValoresLogin): Errores<keyof ValoresLogin> {
  const errores: Errores<keyof ValoresLogin> = {};
  const email = validarEmail(valores.email);
  if (email) errores.email = email;
  if (!valores.contrasena) errores.contrasena = "Ingresá tu contraseña.";
  return errores;
}

// --- Registro ----------------------------------------------------------------

export interface ValoresRegistro {
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
}

export function validarRegistro(valores: ValoresRegistro): Errores<keyof ValoresRegistro> {
  const errores: Errores<keyof ValoresRegistro> = {};

  const nombre = valores.nombre.trim();
  if (!nombre) errores.nombre = "Ingresá tu nombre.";
  else if (nombre.length > 80) errores.nombre = "El nombre no puede superar los 80 caracteres.";

  const apellido = valores.apellido.trim();
  if (!apellido) errores.apellido = "Ingresá tu apellido.";
  else if (apellido.length > 80) errores.apellido = "El apellido no puede superar los 80 caracteres.";

  const email = validarEmail(valores.email);
  if (email) errores.email = email;

  if (!valores.contrasena) errores.contrasena = "Elegí una contraseña.";
  else if (!contrasenaValida(valores.contrasena)) {
    errores.contrasena = "La contraseña debe tener al menos 8 caracteres, con una letra y un número.";
  }

  return errores;
}

export const MENSAJE_ROL = "Elegí cómo vas a usar la plataforma.";

export function esRolRegistrable(valor: string | null | undefined): valor is RolRegistrable {
  return valor === "estudiante" || valor === "empresa" || valor === "docente";
}
