import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import {
  CONFIGURACION,
  type Configuracion,
} from '../../compartido/infraestructura/configuracion/configuracion.js';
import type { HasheadorContrasenas } from '../dominio/puertos.js';

/**
 * bcrypt en JavaScript puro (`bcryptjs`, sin compilación nativa: funciona igual en Windows,
 * Linux y en un contenedor). Es el único lugar del backend donde se hashean y comparan
 * contraseñas (RNF-03).
 */
@Injectable()
export class HasheadorBcrypt implements HasheadorContrasenas {
  private readonly costo: number;

  constructor(@Inject(CONFIGURACION) configuracion: Configuracion) {
    this.costo = configuracion.seguridad.costoBcrypt;
  }

  hashear(contrasena: string): Promise<string> {
    return bcrypt.hash(contrasena, this.costo);
  }

  comparar(contrasena: string, hash: string): Promise<boolean> {
    return bcrypt.compare(contrasena, hash);
  }
}
