import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { ParseIdPipe } from '../compartido/infraestructura/http/validacion.js';
import { Roles, UsuarioActual } from '../compartido/infraestructura/seguridad/decoradores.js';
import {
  CambiarEstadoPostulacionDto,
  CrearInvitacionDto,
  CrearPostulacionDto,
  EstadoPostulacionQuery,
  LimiteQuery,
  ResponderInvitacionDto,
} from './esquemas.js';
import {
  MatchingService,
  type RecomendacionEstudianteDto,
  type RecomendacionProyectoDto,
} from './matching.service.js';
import {
  PostulacionesService,
  type InvitacionDto,
  type PostulacionDto,
} from './postulaciones.service.js';

/** Recomendaciones (docs/api/CONTRATO.md, sección 5.1). */
@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('recomendaciones')
  @Roles('estudiante')
  recomendaciones(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: LimiteQuery,
  ): Promise<RecomendacionProyectoDto[]> {
    return this.matching.recomendacionesParaEstudiante(usuario, query.limite);
  }

  @Get('proyectos/:idProyecto/recomendados')
  @Roles('empresa', 'docente')
  recomendados(
    @Param('idProyecto', ParseIdPipe) idProyecto: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: LimiteQuery,
  ): Promise<RecomendacionEstudianteDto[]> {
    return this.matching.recomendadosParaProyecto(idProyecto, usuario, query.limite);
  }
}

/** Postulaciones (docs/api/CONTRATO.md, sección 5.4). */
@Controller('postulaciones')
export class PostulacionesController {
  constructor(private readonly postulaciones: PostulacionesService) {}

  @Post()
  @Roles('estudiante')
  postularse(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: CrearPostulacionDto,
  ): Promise<PostulacionDto> {
    return this.postulaciones.postularse(usuario, cuerpo);
  }

  @Get('mias')
  @Roles('estudiante')
  listarMias(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: EstadoPostulacionQuery,
  ): Promise<PostulacionDto[]> {
    return this.postulaciones.listarMias(usuario, query.estado);
  }

  @Get(':id')
  obtener(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<PostulacionDto> {
    return this.postulaciones.obtener(id, usuario);
  }

  @Patch(':id/estado')
  @Roles('estudiante', 'empresa', 'docente')
  cambiarEstado(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: CambiarEstadoPostulacionDto,
  ): Promise<PostulacionDto> {
    return this.postulaciones.cambiarEstado(id, usuario, cuerpo.estado);
  }
}

/** Invitaciones (docs/api/CONTRATO.md, sección 5.5). */
@Controller('invitaciones')
export class InvitacionesController {
  constructor(private readonly postulaciones: PostulacionesService) {}

  @Post()
  @Roles('empresa', 'docente')
  invitar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: CrearInvitacionDto,
  ): Promise<InvitacionDto> {
    return this.postulaciones.invitar(usuario, cuerpo);
  }

  @Get('mias')
  @Roles('estudiante')
  listarMias(@UsuarioActual() usuario: UsuarioAutenticado): Promise<InvitacionDto[]> {
    return this.postulaciones.listarInvitacionesMias(usuario);
  }

  @Post(':id/responder')
  @HttpCode(200)
  @Roles('estudiante')
  responder(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: ResponderInvitacionDto,
  ): Promise<{ invitacion: InvitacionDto; postulacion: PostulacionDto | null }> {
    return this.postulaciones.responderInvitacion(id, usuario, cuerpo.aceptar);
  }
}

/** Postulaciones e invitaciones de un proyecto, vistas por su dueño. */
@Controller('proyectos')
export class PostulacionesDeProyectoController {
  constructor(private readonly postulaciones: PostulacionesService) {}

  @Get(':idProyecto/postulaciones')
  @Roles('empresa', 'docente', 'administrador')
  listarPostulaciones(
    @Param('idProyecto', ParseIdPipe) idProyecto: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: EstadoPostulacionQuery,
  ): Promise<PostulacionDto[]> {
    return this.postulaciones.listarDeProyecto(idProyecto, usuario, query.estado);
  }

  @Get(':idProyecto/invitaciones')
  @Roles('empresa', 'docente')
  listarInvitaciones(
    @Param('idProyecto', ParseIdPipe) idProyecto: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<InvitacionDto[]> {
    return this.postulaciones.listarInvitacionesDeProyecto(idProyecto, usuario);
  }
}
