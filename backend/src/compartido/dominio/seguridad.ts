/** Roles de la plataforma (RF-01). Coinciden con el tipo enumerado `rol_usuario`. */
export const ROLES = [
  'estudiante',
  'empresa',
  'docente',
  'administrador',
] as const;
export type Rol = (typeof ROLES)[number];

/** Roles que se pueden elegir en el registro público (el administrador lo da de alta otro administrador). */
export const ROLES_REGISTRABLES = ['estudiante', 'empresa', 'docente'] as const;
export type RolRegistrable = (typeof ROLES_REGISTRABLES)[number];

/** "Publicador" es una empresa o un docente. */
export const ROLES_PUBLICADORES = ['empresa', 'docente'] as const;
export type RolPublicador = (typeof ROLES_PUBLICADORES)[number];

export function esPublicador(rol: Rol): rol is RolPublicador {
  return (ROLES_PUBLICADORES as readonly Rol[]).includes(rol);
}

/** Quién hace la solicitud, ya autenticado. */
export interface UsuarioAutenticado {
  idUsuario: number;
  rol: Rol;
}

/**
 * Regla del `@Roles()`: sin roles declarados alcanza con estar autenticado;
 * con roles declarados, el rol del usuario tiene que ser uno de ellos.
 */
export function rolAutorizado(
  rolesPermitidos: readonly Rol[] | undefined,
  rol: Rol,
): boolean {
  if (!rolesPermitidos || rolesPermitidos.length === 0) return true;
  return rolesPermitidos.includes(rol);
}

/**
 * Puerto que valida el token de sesión. Lo implementa el módulo de perfiles (M1), que es
 * el dueño de la identidad: verifica la firma y comprueba que el usuario siga activo.
 * Lanza `ErrorNoAutenticado` si la sesión no es válida.
 */
export interface ValidadorSesion {
  validar(token: string): Promise<UsuarioAutenticado>;
}
export const VALIDADOR_SESION = Symbol('VALIDADOR_SESION');
