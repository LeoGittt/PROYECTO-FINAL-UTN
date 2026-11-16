import { Module } from '@nestjs/common';
import { DatabaseModule } from '../compartido/infraestructura/db/database.module.js';
import { MatchingModule } from '../matching/matching.module.js';
import { PerfilesModule } from '../perfiles/perfiles.module.js';
import { EmailService } from './email.service.js';
import { NotificacionesController } from './notificaciones.controller.js';
import { NotificacionesRepository } from './notificaciones.repository.js';
import { NotificacionesService } from './notificaciones.service.js';

/** M4: notificaciones y email. Depende de M1 y M3; ningún módulo depende de M4. */
@Module({
  imports: [DatabaseModule, PerfilesModule, MatchingModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesRepository, NotificacionesService, EmailService],
})
export class ComunicacionModule {}
