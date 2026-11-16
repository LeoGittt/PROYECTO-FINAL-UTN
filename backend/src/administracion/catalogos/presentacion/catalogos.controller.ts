import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ParseIdPipe } from '../../../compartido/infraestructura/http/validacion.js';
import {
  Public,
  Roles,
} from '../../../compartido/infraestructura/seguridad/decoradores.js';
import { CatalogosService } from '../aplicacion/catalogos.service.js';
import type {
  CarreraDto,
  HabilidadDto,
  MateriaDto,
  TecnologiaDto,
} from '../dominio/catalogo.js';
import { MateriasConsultaDto, TecnologiaDatosDto } from './esquemas.js';

/** Lectura pública de los catálogos (docs/api/CONTRATO.md, sección 3). */
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Public()
  @Get('carreras')
  carreras(): Promise<CarreraDto[]> {
    return this.catalogos.listarCarreras();
  }

  @Public()
  @Get('materias')
  materias(@Query() consulta: MateriasConsultaDto): Promise<MateriaDto[]> {
    return this.catalogos.listarMaterias(consulta.idCarrera);
  }

  @Public()
  @Get('tecnologias')
  tecnologias(): Promise<TecnologiaDto[]> {
    return this.catalogos.listarTecnologias();
  }

  @Public()
  @Get('habilidades')
  habilidades(): Promise<HabilidadDto[]> {
    return this.catalogos.listarHabilidades();
  }
}

/** Alta y edición de tecnologías: solo el administrador (RF-06). */
@Controller('admin/tecnologias')
@Roles('administrador')
export class AdminTecnologiasController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Post()
  crear(@Body() datos: TecnologiaDatosDto): Promise<TecnologiaDto> {
    return this.catalogos.crearTecnologia(datos);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIdPipe) id: number,
    @Body() datos: TecnologiaDatosDto,
  ): Promise<TecnologiaDto> {
    return this.catalogos.actualizarTecnologia(id, datos);
  }
}
