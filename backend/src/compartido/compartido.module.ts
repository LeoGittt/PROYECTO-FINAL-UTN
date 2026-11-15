import { Global, Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { PUBLICADOR_EVENTOS } from './dominio/eventos.js';
import {
  type Configuracion,
} from './infraestructura/configuracion/configuracion.js';
import { ConfiguracionModule } from './infraestructura/configuracion/configuracion.module.js';
import { DatabaseModule } from './infraestructura/db/database.module.js';
import { PublicadorEventosNest } from './infraestructura/eventos/publicador-eventos-nest.js';
import { FiltroExcepciones } from './infraestructura/http/filtro-excepciones.js';
import { PipeValidacion } from './infraestructura/http/validacion.js';
import { SaludController } from './presentacion/salud.controller.js';

/**
 * Lo que comparten todos los módulos: configuración, bus de eventos, límite de pedidos,
 * filtro de errores y validación globales, y el endpoint de salud. Es global: los demás
 * módulos usan `CONFIGURACION` y `PUBLICADOR_EVENTOS` sin importarlo. `Db` no es global:
 * cada módulo importa `DatabaseModule`, como indica ARQUITECTURA.md.
 */
@Global()
@Module({})
export class CompartidoModule {
  static registrar(configuracion: Configuracion): DynamicModule {
    const { limiteAuth } = configuracion.seguridad;
    return {
      module: CompartidoModule,
      imports: [
        ConfiguracionModule.registrar(configuracion),
        DatabaseModule,
        EventEmitterModule.forRoot(),
        // Límite de pedidos por IP. Solo se aplica donde un controlador usa `ThrottlerGuard`
        // (hoy, `/auth/*`).
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: limiteAuth.ventanaMs, limit: limiteAuth.maximo }],
        }),
      ],
      controllers: [SaludController],
      providers: [
        { provide: PUBLICADOR_EVENTOS, useClass: PublicadorEventosNest },
        { provide: APP_FILTER, useClass: FiltroExcepciones },
        { provide: APP_PIPE, useClass: PipeValidacion },
      ],
      exports: [ConfiguracionModule, PUBLICADOR_EVENTOS, ThrottlerModule],
    };
  }
}
