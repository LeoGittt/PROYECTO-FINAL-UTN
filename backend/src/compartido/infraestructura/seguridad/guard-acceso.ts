import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ErrorNoAutenticado,
  ErrorProhibido,
} from '../../dominio/errores.js';
import {
  rolAutorizado,
  VALIDADOR_SESION,
  type Rol,
  type ValidadorSesion,
} from '../../dominio/seguridad.js';
import {
  CLAVE_PUBLICO,
  CLAVE_ROLES,
  type SolicitudAutenticada,
} from './decoradores.js';

/** Extrae el token de `Authorization: Bearer <token>`. */
export function extraerTokenBearer(cabecera: string | undefined): string | null {
  if (!cabecera) return null;
  const [esquema, token, ...resto] = cabecera.trim().split(/\s+/);
  if (esquema?.toLowerCase() !== 'bearer' || !token || resto.length > 0) {
    return null;
  }
  return token;
}

/**
 * Guard global de acceso. Un solo guard se encarga de las dos preguntas, en orden:
 *  1. ¿Quién es? Salvo en los endpoints `@Public()`, exige `Authorization: Bearer` y le pide
 *     el usuario al `ValidadorSesion` (401 si el token no sirve).
 *  2. ¿Puede hacerlo? Si el endpoint declara `@Roles(...)`, el rol tiene que estar entre ellos (403).
 * Tenerlos en uno evita depender del orden en que Nest ejecuta varios guards globales.
 */
@Injectable()
export class GuardAcceso implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(VALIDADOR_SESION) private readonly validador: ValidadorSesion,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const objetivos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, objetivos)) {
      return true;
    }

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const token = extraerTokenBearer(solicitud.headers.authorization);
    if (!token) throw new ErrorNoAutenticado();
    solicitud.usuario = await this.validador.validar(token);

    const roles = this.reflector.getAllAndOverride<Rol[]>(CLAVE_ROLES, objetivos);
    if (!rolAutorizado(roles, solicitud.usuario.rol)) throw new ErrorProhibido();
    return true;
  }
}
