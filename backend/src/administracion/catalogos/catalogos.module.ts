import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../compartido/infraestructura/db/database.module.js';
import { CatalogosService } from './aplicacion/catalogos.service.js';
import { CATALOGOS_REPOSITORY } from './dominio/catalogo.js';
import { CatalogosRepositorySql } from './infraestructura/catalogos.repository.sql.js';
import {
  AdminTecnologiasController,
  CatalogosController,
} from './presentacion/catalogos.controller.js';

/** M5 / catálogos. No depende de ningún otro módulo y exporta `CatalogosService`. */
@Module({
  imports: [DatabaseModule],
  controllers: [CatalogosController, AdminTecnologiasController],
  providers: [
    { provide: CATALOGOS_REPOSITORY, useClass: CatalogosRepositorySql },
    CatalogosService,
  ],
  exports: [CatalogosService],
})
export class CatalogosModule {}
