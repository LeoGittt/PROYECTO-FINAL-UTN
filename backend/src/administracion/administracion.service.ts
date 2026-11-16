import { Injectable } from '@nestjs/common';
import { ErrorConflicto, ErrorNoEncontrado } from '../compartido/dominio/errores.js';
import type { Pagina } from '../compartido/dominio/paginacion.js';
import type { RolRegistrable, UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { EvaluacionService } from '../matching/evaluacion.service.js';
import { PostulacionesService } from '../matching/postulaciones.service.js';
import { PerfilesService } from '../perfiles/aplicacion/perfiles.service.js';
import type { FiltroUsuarios, UsuarioListadoDto } from '../perfiles/dominio/usuario.js';
import { ProyectosService } from '../proyectos/proyectos.service.js';
import { ReportesRepository } from './reportes.repository.js';

/**
 * M5: gestión de usuarios y reportes (RF-06, RF-07, RF-11). No tiene tablas propias para esto:
 * usa las API de M1, M2 y M3, y las vistas `vw_*` para el dashboard.
 */
@Injectable()
export class AdministracionService {
  constructor(
    private readonly perfiles: PerfilesService,
    private readonly proyectos: ProyectosService,
    private readonly postulaciones: PostulacionesService,
    private readonly evaluacion: EvaluacionService,
    private readonly reportes: ReportesRepository,
  ) {}

  listarUsuarios(filtro: FiltroUsuarios): Promise<Pagina<UsuarioListadoDto>> {
    return this.perfiles.listarUsuarios(filtro);
  }

  /**
   * Activa, desactiva o cambia el rol de un usuario. Un administrador no puede hacerlo consigo
   * mismo (409), para que nunca quede la plataforma sin nadie que la administre.
   */
  async actualizarUsuario(
    idUsuario: number,
    cambios: { activo?: boolean; rol?: RolRegistrable },
    admin: UsuarioAutenticado,
  ): Promise<UsuarioListadoDto> {
    if (idUsuario === admin.idUsuario && (cambios.activo === false || cambios.rol !== undefined)) {
      throw new ErrorConflicto('Un administrador no puede desactivarse ni cambiarse el rol a sí mismo');
    }
    if (cambios.rol !== undefined) await this.perfiles.cambiarRol(idUsuario, cambios.rol);
    if (cambios.activo === true) await this.perfiles.activarUsuario(idUsuario);
    if (cambios.activo === false) await this.perfiles.desactivarUsuario(idUsuario);
    return this.usuario(idUsuario);
  }

  async crearAdministrador(datos: {
    nombre: string;
    apellido: string;
    email: string;
    contrasena: string;
  }): Promise<UsuarioListadoDto> {
    const { idUsuario } = await this.perfiles.crearAdministrador(datos);
    return this.usuario(idUsuario);
  }

  async restablecerContrasena(idUsuario: number, contrasenaNueva: string): Promise<void> {
    await this.perfiles.restablecerContrasena(idUsuario, contrasenaNueva);
  }

  // =========================================================================
  // Reportes
  // =========================================================================

  /** RF-07. */
  async resumen() {
    const [usuarios, proyectosPorEstado, postulacionesPorEstado] = await Promise.all([
      this.perfiles.contarUsuariosActivosPorRol(),
      this.proyectos.contarPorEstado(),
      this.postulaciones.contarPorEstado(),
    ]);
    return {
      estudiantesActivos: usuarios.estudiante,
      empresasActivas: usuarios.empresa,
      docentesActivos: usuarios.docente,
      proyectosPorEstado,
      postulacionesPorEstado,
    };
  }

  /** RF-11: los cuatro bloques de las vistas y la última evaluación de cada configuración. */
  async dashboard() {
    const [ranking, evolucion, matchPorCarreraAnio, tiempoPrimerProyecto, embudo, evaluaciones] = await Promise.all([
      this.reportes.rankingTecnologias(),
      this.reportes.evolucionTecnologias(),
      this.reportes.matchPorCarreraAnio(),
      this.reportes.tiempoPrimerProyecto(),
      this.reportes.embudo(),
      this.evaluacion.ultimasEvaluaciones(),
    ]);
    return {
      tecnologiasDemandadas: { ranking, evolucion },
      matchPorCarreraAnio,
      tiempoPrimerProyecto,
      embudo,
      evaluacionMotor: evaluaciones.map((e) => ({
        configuracion: e.configuracion,
        precisionGlobal: e.precisionGlobal,
        recallGlobal: e.recallGlobal,
        precisionTopK: e.precisionTopK,
        k: e.k,
      })),
    };
  }

  /** Para la portada, sin sesión: solo totales. */
  async estadisticasPublicas() {
    const [usuarios, proyectosPorEstado, postulacionesPorEstado] = await Promise.all([
      this.perfiles.contarUsuariosActivosPorRol(),
      this.proyectos.contarPorEstado(),
      this.postulaciones.contarPorEstado(),
    ]);
    return {
      estudiantes: usuarios.estudiante,
      proyectosPublicados: proyectosPorEstado.publicado ?? 0,
      publicadores: usuarios.empresa + usuarios.docente,
      postulaciones: Object.values(postulacionesPorEstado).reduce((suma, n) => suma + n, 0),
    };
  }

  private async usuario(idUsuario: number): Promise<UsuarioListadoDto> {
    const [usuario] = (await this.perfiles.listarUsuarios({ idUsuario, tamano: 1 })).items;
    if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');
    return usuario;
  }
}
