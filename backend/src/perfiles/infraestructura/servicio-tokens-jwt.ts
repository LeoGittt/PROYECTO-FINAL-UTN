import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ErrorNoAutenticado } from '../../compartido/dominio/errores.js';
import type { Rol } from '../../compartido/dominio/seguridad.js';
import type { ServicioTokens } from '../dominio/puertos.js';

const ALGORITMO = 'HS256';

/**
 * Tokens de sesión: JWT firmado con HS256 que lleva `sub` (el `idUsuario`, como texto, según
 * el estándar) y `rol`. El vencimiento y el secreto salen de la configuración (`JwtModule`).
 */
@Injectable()
export class ServicioTokensJwt implements ServicioTokens {
  constructor(private readonly jwt: JwtService) {}

  emitir(usuario: { idUsuario: number; rol: Rol }): Promise<string> {
    return this.jwt.signAsync({ sub: String(usuario.idUsuario), rol: usuario.rol });
  }

  async verificar(token: string): Promise<number> {
    let sub: unknown;
    let exp: unknown;
    try {
      ({ sub, exp } = await this.jwt.verifyAsync<{ sub?: unknown; exp?: unknown }>(token, {
        algorithms: [ALGORITMO],
      }));
    } catch (error) {
      throw new ErrorNoAutenticado(
        (error as Error)?.name === 'TokenExpiredError'
          ? 'La sesión venció. Inicie sesión nuevamente'
          : 'La sesión no es válida',
      );
    }
    // `sub` debe ser un entero canónico ("12", no "1e1" ni "012") y el token debe vencer.
    if (typeof sub !== 'string' || !/^[1-9]\d{0,14}$/.test(sub) || typeof exp !== 'number') {
      throw new ErrorNoAutenticado('La sesión no es válida');
    }
    return Number(sub);
  }
}
