import { Module } from '@nestjs/common';
import { CatalogosModule } from '../administracion/catalogos/catalogos.module.js';
import { DatabaseModule } from '../compartido/infraestructura/db/database.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { ProyectosController } from './proyectos.controller.js';
import { ProyectosRepository } from './proyectos.repository.js';
import { ProyectosService } from './proyectos.service.js';

/** M2: proyectos. Usa la API de M1 (publicadores) y los catálogos de M5; exporta `ProyectosService`. */
@Module({
  imports: [DatabaseModule, CatalogosModule, PerfilesModule],
  controllers: [ProyectosController],
  providers: [ProyectosRepository, ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}
