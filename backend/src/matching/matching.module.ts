import { Module } from '@nestjs/common';
import { DatabaseModule } from '../compartido/infraestructura/db/database.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { ProyectosModule } from '../proyectos/proyectos.module.js';
import {
  InvitacionesController,
  MatchingController,
  PostulacionesController,
  PostulacionesDeProyectoController,
} from './matching.controller.js';
import { MatchingRepository } from './matching.repository.js';
import { MatchingService } from './matching.service.js';
import { PostulacionesRepository } from './postulaciones.repository.js';
import { PostulacionesService } from './postulaciones.service.js';

/**
 * M3: motor de recomendación, postulaciones e invitaciones. Usa las API de M1 (perfiles) y
 * de M2 (proyectos) y exporta sus servicios para M4 y M5.
 */
@Module({
  imports: [DatabaseModule, PerfilesModule, ProyectosModule],
  controllers: [
    MatchingController,
    PostulacionesController,
    InvitacionesController,
    PostulacionesDeProyectoController,
  ],
  providers: [MatchingRepository, PostulacionesRepository, MatchingService, PostulacionesService],
  exports: [MatchingService, PostulacionesService],
})
export class MatchingModule {}
