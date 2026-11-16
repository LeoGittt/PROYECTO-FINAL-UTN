import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdministracionModule } from './administracion/administracion.module.js';
import { CatalogosModule } from './administracion/catalogos/catalogos.module.js';
import { CompartidoModule } from './compartido/compartido.module.js';
import { ComunicacionModule } from './comunicacion/comunicacion.module.js';
import type { Configuracion } from './compartido/infraestructura/configuracion/configuracion.js';
import { GuardAcceso } from './compartido/infraestructura/seguridad/guard-acceso.js';
import { MatchingModule } from './matching/matching.module.js';
import { PerfilesModule } from './perfiles/perfiles.module.js';
import { ProyectosModule } from './proyectos/proyectos.module.js';

/**
 * Raíz de la aplicación. Los módulos de negocio se suman acá a medida que existen; cada uno
 * declara sus propias dependencias (ver la tabla de módulos de docs/entrega-2/ARQUITECTURA.md).
 */
@Module({})
export class AppModule {
  static registrar(configuracion: Configuracion): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CompartidoModule.registrar(configuracion),
        CatalogosModule,
        PerfilesModule,
        ProyectosModule,
        MatchingModule,
        ComunicacionModule,
        AdministracionModule,
      ],
      providers: [
        // Un único guard global: toda ruta exige sesión salvo las marcadas con `@Public()`.
        // El `ValidadorSesion` que necesita lo exporta `PerfilesModule`.
        { provide: APP_GUARD, useClass: GuardAcceso },
      ],
    };
  }
}
