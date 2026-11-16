import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ErrorNoEncontrado } from '../../compartido/dominio/errores.js';
import type { UsuarioAutenticado } from '../../compartido/dominio/seguridad.js';
import { validar, ParseIdPipe } from '../../compartido/infraestructura/http/validacion.js';
import {
  Roles,
  UsuarioActual,
} from '../../compartido/infraestructura/seguridad/decoradores.js';
import { PerfilesService } from '../aplicacion/perfiles.service.js';
import type { EstudiantePublicoDto, PerfilDto } from '../dominio/perfil.js';
import {
  perfilDocenteEsquema,
  perfilEmpresaEsquema,
  perfilEstudianteEsquema,
} from './esquemas.js';

/** Perfil propio de estudiante, empresa o docente (docs/api/CONTRATO.md, sección 2). */
@Controller('perfil')
@Roles('estudiante', 'empresa', 'docente')
export class PerfilController {
  constructor(private readonly perfiles: PerfilesService) {}

  @Get()
  async obtener(@UsuarioActual() usuario: UsuarioAutenticado): Promise<PerfilDto> {
    const perfil = await this.perfiles.obtenerPerfilPropio(usuario);
    if (!perfil) throw new ErrorNoEncontrado('Todavía no completó su perfil');
    return perfil;
  }

  /** Crea o reemplaza el perfil propio. El cuerpo esperado depende del rol de quien llama. */
  @Put()
  guardar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() cuerpo: unknown,
  ): Promise<PerfilDto> {
    switch (usuario.rol) {
      case 'estudiante':
        return this.perfiles.guardarPerfilEstudiante(
          usuario.idUsuario,
          validar(perfilEstudianteEsquema, cuerpo ?? {}),
        );
      case 'empresa':
        return this.perfiles.guardarPerfilEmpresa(
          usuario.idUsuario,
          validar(perfilEmpresaEsquema, cuerpo ?? {}),
        );
      default:
        return this.perfiles.guardarPerfilDocente(
          usuario.idUsuario,
          validar(perfilDocenteEsquema, cuerpo ?? {}),
        );
    }
  }
}

/** Perfil de un estudiante visto por quien publica proyectos o por el administrador. */
@Controller('estudiantes')
@Roles('empresa', 'docente', 'administrador')
export class EstudiantesController {
  constructor(private readonly perfiles: PerfilesService) {}

  @Get(':idEstudiante')
  obtener(
    @Param('idEstudiante', ParseIdPipe) idEstudiante: number,
    @UsuarioActual() solicitante: UsuarioAutenticado,
  ): Promise<EstudiantePublicoDto> {
    return this.perfiles.obtenerEstudiantePublico(idEstudiante, solicitante);
  }
}
