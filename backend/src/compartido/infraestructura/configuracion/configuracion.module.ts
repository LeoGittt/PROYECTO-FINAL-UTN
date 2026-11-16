import { Global, Module, type DynamicModule } from '@nestjs/common';
import { CONFIGURACION, type Configuracion } from './configuracion.js';

/** Hace disponible la `Configuracion` en toda la aplicación con el token `CONFIGURACION`. */
@Global()
@Module({})
export class ConfiguracionModule {
  static registrar(configuracion: Configuracion): DynamicModule {
    return {
      module: ConfiguracionModule,
      providers: [{ provide: CONFIGURACION, useValue: configuracion }],
      exports: [CONFIGURACION],
    };
  }
}
