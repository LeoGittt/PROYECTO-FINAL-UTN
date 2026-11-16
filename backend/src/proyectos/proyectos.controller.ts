import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import type { Pagina } from '../compartido/dominio/paginacion.js';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { ParseIdPipe } from '../compartido/infraestructura/http/validacion.js';
import { Roles, UsuarioActual } from '../compartido/infraestructura/seguridad/decoradores.js';
import {
  BuscarProyectosQuery,
  CambiarEstadoProyectoDto,
  CrearProyectoDto,
  EditarProyectoDto,
  ProyectosPropiosQuery,
} from './esquemas.js';
import { ProyectosService, type ProyectoDto } from './proyectos.service.js';

/** Proyectos (docs/api/CONTRATO.md, sección 4). Todas las rutas exigen sesión. */
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectos: ProyectosService) {}

  @Post()
  @Roles('empresa', 'docente')
  crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: CrearProyectoDto,
  ): Promise<ProyectoDto> {
    return this.proyectos.crear(usuario, cuerpo);
  }

  // Va antes de `:id` para que "mios" no se tome como un identificador.
  @Get('mios')
  @Roles('empresa', 'docente')
  listarMios(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: ProyectosPropiosQuery,
  ): Promise<ProyectoDto[]> {
    return this.proyectos.listarMios(usuario, query.estado);
  }

  @Get()
  buscar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: BuscarProyectosQuery,
  ): Promise<Pagina<ProyectoDto>> {
    return this.proyectos.buscar(query, usuario);
  }

  @Get(':id')
  obtener(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ProyectoDto> {
    return this.proyectos.obtener(id, usuario);
  }

  @Put(':id')
  @Roles('empresa', 'docente')
  editar(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: EditarProyectoDto,
  ): Promise<ProyectoDto> {
    return this.proyectos.editar(id, usuario, cuerpo);
  }

  @Post(':id/publicar')
  @HttpCode(200)
  @Roles('empresa', 'docente')
  publicar(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ProyectoDto> {
    return this.proyectos.publicar(id, usuario);
  }

  @Patch(':id/estado')
  @Roles('empresa', 'docente')
  cambiarEstado(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: CambiarEstadoProyectoDto,
  ): Promise<ProyectoDto> {
    return this.proyectos.cambiarEstado(id, usuario, cuerpo.estado);
  }
}
