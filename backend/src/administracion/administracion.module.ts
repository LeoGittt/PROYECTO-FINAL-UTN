import { Module } from '@nestjs/common';
import { DatabaseModule } from '../compartido/infraestructura/db/database.module.js';
import { MatchingModule } from '../matching/matching.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { ProyectosModule } from '../proyectos/proyectos.module.js';
import { AdminController, PublicoController, ReportesController } from './administracion.controller.js';
import { AdministracionService } from './administracion.service.js';
import { ReportesRepository } from './reportes.repository.js';

/** M5 (sin los catálogos, que tienen su propio módulo): administración, reportes y datos públicos. */
@Module({
  imports: [DatabaseModule, PerfilesModule, ProyectosModule, MatchingModule],
  controllers: [AdminController, ReportesController, PublicoController],
  providers: [AdministracionService, ReportesRepository],
})
export class AdministracionModule {}
