import { Module } from '@nestjs/common';
import { DatabaseModule } from '../compartido/infraestructura/db/database.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { ProyectosModule } from '../proyectos/proyectos.module.js';
import {
  InvitacionesController,
  MatchingController,
  MotorController,
  PostulacionesController,
  PostulacionesDeProyectoController,
} from './matching.controller.js';
import { EvaluacionRepository } from './evaluacion.repository.js';
import { EvaluacionService } from './evaluacion.service.js';
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
    MotorController,
  ],
  providers: [
    MatchingRepository,
    PostulacionesRepository,
    EvaluacionRepository,
    MatchingService,
    PostulacionesService,
    EvaluacionService,
  ],
  exports: [MatchingService, PostulacionesService, EvaluacionService],
})
export class MatchingModule {}
