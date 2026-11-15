import type { Rol } from '../../compartido/dominio/seguridad.js';

/** El usuario tal como lo ven los demás módulos y el frontend (`usuario` de docs/api/CONTRATO.md, sección 2). */
export interface UsuarioDto {
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  /**
   * `true` cuando el usuario ya tiene el perfil que le corresponde por su rol. El
   * administrador no tiene perfil y siempre figura como completo.
   */
  perfilCompleto: boolean;
}

/** Alias que usa ARQUITECTURA.md (`UsuarioResumenDto`). */
export type UsuarioResumenDto = UsuarioDto;

/** Un renglón del listado de usuarios del administrador. */
export interface UsuarioListadoDto {
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  fechaRegistro: string;
}

/** Solo para autenticar: incluye el hash, que nunca sale de M1. */
export interface UsuarioConCredenciales extends UsuarioDto {
  contrasenaHash: string;
}

export interface DatosNuevoUsuario {
  nombre: string;
  apellido: string;
  email: string;
  contrasenaHash: string;
  rol: Rol;
}

export interface FiltroUsuarios {
  rol?: Rol;
  activo?: boolean;
  /** Texto a buscar en nombre, apellido o email. */
  q?: string;
  pagina?: number;
  tamano?: number;
}

/** Respuesta de registro e inicio de sesión. */
export interface SesionDto {
  token: string;
  usuario: UsuarioDto;
}
