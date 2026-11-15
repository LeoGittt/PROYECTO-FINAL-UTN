import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Rol, UsuarioAutenticado } from '../../dominio/seguridad.js';

export const CLAVE_PUBLICO = 'utn-match:publico';
export const CLAVE_ROLES = 'utn-match:roles';

/** Marca un endpoint (o un controlador) como accesible sin sesión. Por defecto todo exige sesión. */
export const Public = () => SetMetadata(CLAVE_PUBLICO, true);

/** Restringe un endpoint (o un controlador) a los roles indicados. */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

/** La solicitud, después de pasar por el guard de acceso. */
export interface SolicitudAutenticada extends Request {
  usuario?: UsuarioAutenticado;
}

/** Inyecta en el controlador el usuario autenticado: `@UsuarioActual() usuario: UsuarioAutenticado`. */
export const UsuarioActual = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext): UsuarioAutenticado | undefined =>
    contexto.switchToHttp().getRequest<SolicitudAutenticada>().usuario,
);
