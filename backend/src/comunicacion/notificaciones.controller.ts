import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { booleanoQuery } from '../compartido/infraestructura/http/esquemas-comunes.js';
import { crearDto, ParseIdPipe } from '../compartido/infraestructura/http/validacion.js';
import { UsuarioActual } from '../compartido/infraestructura/seguridad/decoradores.js';
import type { NotificacionDto } from './notificaciones.repository.js';
import { NotificacionesService } from './notificaciones.service.js';

class ListarNotificacionesQuery extends crearDto(
  z.object({
    soloNoLeidas: booleanoQuery.default(false),
    limite: z.coerce.number().int().min(1).max(100).default(30),
  }),
) {}

/** Notificaciones del usuario que inició sesión, cualquiera sea su rol (docs/api/CONTRATO.md, sección 6). */
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  listar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: ListarNotificacionesQuery,
  ): Promise<{ items: NotificacionDto[]; noLeidas: number }> {
    return this.notificaciones.listar(usuario.idUsuario, query.soloNoLeidas, query.limite);
  }

  @Post('leer-todas')
  @HttpCode(204)
  leerTodas(@UsuarioActual() usuario: UsuarioAutenticado): Promise<void> {
    return this.notificaciones.marcarTodasLeidas(usuario.idUsuario);
  }

  @Post(':id/leer')
  @HttpCode(204)
  leer(@Param('id', ParseIdPipe) id: number, @UsuarioActual() usuario: UsuarioAutenticado): Promise<void> {
    return this.notificaciones.marcarLeida(id, usuario.idUsuario);
  }
}
