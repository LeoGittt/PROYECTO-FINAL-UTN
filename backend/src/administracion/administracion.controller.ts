import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { Pagina } from '../compartido/dominio/paginacion.js';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { ParseIdPipe } from '../compartido/infraestructura/http/validacion.js';
import { Public, Roles, UsuarioActual } from '../compartido/infraestructura/seguridad/decoradores.js';
import type { UsuarioListadoDto } from '../perfiles/dominio/usuario.js';
import { ProyectosService, type ProyectoDto } from '../proyectos/proyectos.service.js';
import { AdministracionService } from './administracion.service.js';
import {
  ActualizarUsuarioDto,
  CrearAdministradorDto,
  ListarUsuariosQuery,
  ProyectosAdminQuery,
  RestablecerContrasenaDto,
  SuspenderProyectoDto,
} from './esquemas.js';

/** Panel de administración: usuarios y moderación de proyectos (docs/api/CONTRATO.md, sección 7). */
@Controller('admin')
@Roles('administrador')
export class AdminController {
  constructor(
    private readonly administracion: AdministracionService,
    private readonly proyectos: ProyectosService,
  ) {}

  @Get('usuarios')
  usuarios(@Query() filtro: ListarUsuariosQuery): Promise<Pagina<UsuarioListadoDto>> {
    return this.administracion.listarUsuarios(filtro);
  }

  @Patch('usuarios/:id')
  actualizarUsuario(
    @Param('id', ParseIdPipe) id: number,
    @Body() cambios: ActualizarUsuarioDto,
    @UsuarioActual() admin: UsuarioAutenticado,
  ): Promise<UsuarioListadoDto> {
    return this.administracion.actualizarUsuario(id, cambios, admin);
  }

  @Post('administradores')
  crearAdministrador(@Body() datos: CrearAdministradorDto): Promise<UsuarioListadoDto> {
    return this.administracion.crearAdministrador(datos);
  }

  @Post('usuarios/:id/restablecer-contrasena')
  @HttpCode(204)
  restablecerContrasena(
    @Param('id', ParseIdPipe) id: number,
    @Body() datos: RestablecerContrasenaDto,
  ): Promise<void> {
    return this.administracion.restablecerContrasena(id, datos.contrasenaNueva);
  }

  @Get('proyectos')
  listarProyectos(
    @Query() query: ProyectosAdminQuery,
    @UsuarioActual() admin: UsuarioAutenticado,
  ): Promise<ProyectoDto[]> {
    return this.proyectos.listarTodos(query.estado, admin);
  }

  @Post('proyectos/:id/suspender')
  @HttpCode(200)
  suspender(
    @Param('id', ParseIdPipe) id: number,
    @Body() datos: SuspenderProyectoDto,
    @UsuarioActual() admin: UsuarioAutenticado,
  ): Promise<ProyectoDto> {
    return this.proyectos.suspender(id, datos.motivo, admin);
  }

  @Post('proyectos/:id/reactivar')
  @HttpCode(200)
  reactivar(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() admin: UsuarioAutenticado,
  ): Promise<ProyectoDto> {
    return this.proyectos.reactivar(id, admin);
  }
}

/** Reportes del administrador: RF-07 y RF-11. */
@Controller('reportes')
@Roles('administrador')
export class ReportesController {
  constructor(private readonly administracion: AdministracionService) {}

  @Get('resumen')
  resumen() {
    return this.administracion.resumen();
  }

  @Get('dashboard')
  dashboard() {
    return this.administracion.dashboard();
  }
}

/** Datos para la portada, sin sesión. */
@Controller('publico')
export class PublicoController {
  constructor(private readonly administracion: AdministracionService) {}

  @Public()
  @Get('estadisticas')
  estadisticas() {
    return this.administracion.estadisticasPublicas();
  }
}
