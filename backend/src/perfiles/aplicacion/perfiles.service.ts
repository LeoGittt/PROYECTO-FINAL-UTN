import { Inject, Injectable } from '@nestjs/common';
import { CatalogosService } from '../../administracion/catalogos/aplicacion/catalogos.service.js';
import {
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorReglaNegocio,
} from '../../compartido/dominio/errores.js';
import {
  EVENTO_PERFIL_ACTUALIZADO,
  PUBLICADOR_EVENTOS,
  type PublicadorEventos,
} from '../../compartido/dominio/eventos.js';
import type { Pagina } from '../../compartido/dominio/paginacion.js';
import type { Rol, UsuarioAutenticado } from '../../compartido/dominio/seguridad.js';
import {
  construirPerfilEstudianteDto,
  type DatosPerfilDocente,
  type DatosPerfilEmpresa,
  type DatosPerfilEstudiante,
  type EstudiantePublicoDto,
  type EstudianteResumenDto,
  type PerfilDto,
  type PerfilEstudianteDto,
  type PerfilMatchingDto,
  type PublicadorDto,
  type RegistroEstudiante,
} from '../dominio/perfil.js';
import {
  PERFIL_REPOSITORY,
  USUARIO_REPOSITORY,
  type FuenteVisibilidadContacto,
  type PerfilRepository,
  type UsuarioRepository,
} from '../dominio/puertos.js';
import { validarReglasPerfilEstudiante } from '../dominio/reglas-perfil.js';
import type {
  FiltroUsuarios,
  UsuarioDto,
  UsuarioListadoDto,
} from '../dominio/usuario.js';
import { AutenticacionService } from './autenticacion.service.js';

/**
 * API de M1 (`PerfilesApi` en ARQUITECTURA.md, 4.1). Es lo único que los demás módulos
 * pueden usar de la identidad y los perfiles: nadie lee las tablas de M1.
 *
 * Nunca devuelve filas de la base ni el hash de la contraseña: solo DTO.
 */
@Injectable()
export class PerfilesService {
  private readonly fuentesVisibilidad: FuenteVisibilidadContacto[] = [];

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(PERFIL_REPOSITORY) private readonly perfiles: PerfilRepository,
    @Inject(PUBLICADOR_EVENTOS) private readonly eventos: PublicadorEventos,
    private readonly catalogos: CatalogosService,
    private readonly autenticacion: AutenticacionService,
  ) {}

  // =========================================================================
  // Usuarios
  // =========================================================================

  async obtenerUsuario(idUsuario: number): Promise<UsuarioDto> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');
    return usuario;
  }

  /** Los usuarios que existen, entre los pedidos (por ejemplo, para armar notificaciones). */
  obtenerUsuarios(idsUsuario: readonly number[]): Promise<UsuarioDto[]> {
    return this.usuarios.buscarPorIds(idsUsuario);
  }

  listarUsuarios(filtro: FiltroUsuarios): Promise<Pagina<UsuarioListadoDto>> {
    return this.usuarios.listar(filtro);
  }

  async contarEstudiantesActivos(): Promise<number> {
    return (await this.usuarios.contarActivosPorRol()).estudiante;
  }

  /** Usuarios activos por rol (para los reportes de M5). */
  contarUsuariosActivosPorRol(): Promise<Record<Rol, number>> {
    return this.usuarios.contarActivosPorRol();
  }

  async desactivarUsuario(idUsuario: number): Promise<void> {
    await this.cambiarActivo(idUsuario, false);
  }

  /**
   * Un estudiante inactivo no se puntúa: al reactivarlo se avisa como si hubiera actualizado su
   * perfil, para que el motor lo calcule con los proyectos publicados mientras no estaba.
   */
  async activarUsuario(idUsuario: number): Promise<void> {
    await this.cambiarActivo(idUsuario, true);
    const idEstudiante = await this.obtenerIdEstudiante(idUsuario);
    if (idEstudiante !== null) {
      await this.eventos.publicar(EVENTO_PERFIL_ACTUALIZADO, { idUsuario, rol: 'estudiante', idEstudiante });
    }
  }

  /**
   * Cambia el rol de un usuario. Solo se puede mientras no haya completado su perfil: los
   * perfiles son de un rol y cambiarlo dejaría datos que no le corresponden (409).
   */
  async cambiarRol(idUsuario: number, rol: Rol): Promise<void> {
    const usuario = await this.obtenerUsuario(idUsuario);
    if (usuario.rol === rol) return;
    // Un administrador no tiene perfil, pero quitarle el rol podría dejar la plataforma sin nadie
    // que la administre.
    if (usuario.rol === 'administrador') {
      throw new ErrorConflicto('No se puede cambiar el rol de un administrador');
    }
    if (await this.usuarios.tienePerfil(idUsuario)) {
      throw new ErrorConflicto(
        'No se puede cambiar el rol de un usuario que ya completó su perfil',
      );
    }
    await this.usuarios.actualizarRol(idUsuario, rol);
  }

  /** Reemplaza la contraseña de un usuario aplicando la política de contraseñas. */
  restablecerContrasena(idUsuario: number, contrasenaNueva: string): Promise<void> {
    return this.autenticacion.restablecerContrasena(idUsuario, contrasenaNueva);
  }

  /** Alta de un administrador (RF-01): solo la hace otro administrador, desde M5. 409 si el email existe. */
  crearAdministrador(datos: {
    nombre: string;
    apellido: string;
    email: string;
    contrasena: string;
  }): Promise<UsuarioDto> {
    return this.autenticacion.crearCuenta({ ...datos, rol: 'administrador' });
  }

  // =========================================================================
  // Publicadores
  // =========================================================================

  /**
   * El publicador (empresa o docente) de un usuario. 422 si todavía no completó su perfil:
   * sin él no puede publicar proyectos.
   */
  async obtenerPublicador(idUsuario: number): Promise<PublicadorDto> {
    const publicador = await this.perfiles.obtenerPublicadorPorUsuario(idUsuario);
    if (!publicador) {
      throw new ErrorReglaNegocio('Debe completar su perfil antes de publicar proyectos');
    }
    return publicador;
  }

  /** Los publicadores que existen, entre los perfiles pedidos (por ejemplo, para mostrar el nombre en los proyectos). */
  obtenerPublicadores(
    referencias: ReadonlyArray<{ tipo: 'empresa' | 'docente'; id: number }>,
  ): Promise<PublicadorDto[]> {
    return this.perfiles.obtenerPublicadoresPorPerfil(referencias);
  }

  // =========================================================================
  // Estudiantes (para el motor y para otros módulos)
  // =========================================================================

  /** El `idEstudiante` del usuario, o `null` si no tiene perfil de estudiante. */
  async obtenerIdEstudiante(idUsuario: number): Promise<number | null> {
    const [registro] = await this.perfiles.listarEstudiantes({ idUsuario });
    return registro?.idEstudiante ?? null;
  }

  /** Resumen de los estudiantes que existen, entre los pedidos (incluye el email: quien llama decide si lo muestra). */
  async obtenerEstudiantes(
    idsEstudiante: readonly number[],
  ): Promise<EstudianteResumenDto[]> {
    if (idsEstudiante.length === 0) return [];
    const registros = await this.perfiles.listarEstudiantes({
      idsEstudiante,
      incluir: { tecnologias: true },
    });
    const [carreras, tecnologias] = await Promise.all([
      this.catalogos.listarCarreras(),
      this.catalogos.obtenerTecnologias(
        registros.flatMap((r) => r.tecnologias.map((t) => t.idTecnologia)),
      ),
    ]);
    const carreraPorId = new Map(carreras.map((c) => [c.idCarrera, c.nombre]));
    const nombreTecnologia = new Map(tecnologias.map((t) => [t.idTecnologia, t.nombre]));
    return registros.map((r) => ({
      idEstudiante: r.idEstudiante,
      idUsuario: r.idUsuario,
      nombre: r.nombre,
      apellido: r.apellido,
      email: r.email,
      idCarrera: r.idCarrera,
      carrera: carreraPorId.get(r.idCarrera) ?? '',
      anioCursada: r.anioCursada,
      horasSemanales: r.horasSemanales,
      tecnologias: r.tecnologias.map((t) => ({
        idTecnologia: t.idTecnologia,
        nombre: nombreTecnologia.get(t.idTecnologia) ?? '',
        nivel: t.nivel,
      })),
    }));
  }

  /**
   * Los perfiles de los estudiantes ACTIVOS con lo que usa el motor: año, horas semanales,
   * tecnologías con nivel y el texto del perfil. Con `idsEstudiante` trae solo esos.
   */
  async listarPerfilesParaMatching(filtro?: {
    idsEstudiante?: number[];
  }): Promise<PerfilMatchingDto[]> {
    if (filtro?.idsEstudiante && filtro.idsEstudiante.length === 0) return [];
    const registros = await this.perfiles.listarEstudiantes({
      idsEstudiante: filtro?.idsEstudiante,
      soloActivos: true,
      incluir: { tecnologias: true },
    });
    const tecnologias = await this.catalogos.obtenerTecnologias(
      registros.flatMap((r) => r.tecnologias.map((t) => t.idTecnologia)),
    );
    const nombrePorId = new Map(tecnologias.map((t) => [t.idTecnologia, t.nombre]));
    return registros.map((r) => ({
      idEstudiante: r.idEstudiante,
      idUsuario: r.idUsuario,
      anioCursada: r.anioCursada,
      horasSemanales: r.horasSemanales,
      tecnologias: r.tecnologias.map((t) => ({
        idTecnologia: t.idTecnologia,
        nombre: nombrePorId.get(t.idTecnologia) ?? '',
        nivel: t.nivel,
      })),
      descripcion: r.descripcion,
      proyectosPrevios: r.proyectosPrevios,
    }));
  }

  // =========================================================================
  // Perfil propio (GET / PUT /perfil)
  // =========================================================================

  /** El perfil del usuario según su rol, o `null` si todavía no lo completó (o es administrador). */
  async obtenerPerfilPropio(usuario: UsuarioAutenticado): Promise<PerfilDto | null> {
    switch (usuario.rol) {
      case 'estudiante': {
        const [registro] = await this.perfiles.listarEstudiantes({
          idUsuario: usuario.idUsuario,
          incluir: { tecnologias: true, habilidades: true, materias: true },
        });
        return registro ? this.armarPerfilEstudiante(registro) : null;
      }
      case 'empresa':
        return this.perfiles.obtenerEmpresaPorUsuario(usuario.idUsuario);
      case 'docente':
        return this.perfiles.obtenerDocentePorUsuario(usuario.idUsuario);
      default:
        return null;
    }
  }

  /** `GET /auth/yo`: el usuario y su perfil (`null` si no lo completó). */
  async obtenerSesionActual(
    usuarioAutenticado: UsuarioAutenticado,
  ): Promise<{ usuario: UsuarioDto; perfil: PerfilDto | null }> {
    const [usuario, perfil] = await Promise.all([
      this.obtenerUsuario(usuarioAutenticado.idUsuario),
      this.obtenerPerfilPropio(usuarioAutenticado),
    ]);
    return { usuario, perfil };
  }

  /**
   * Crea o reemplaza el perfil de estudiante (upsert). 422 si no cumple las reglas de
   * negocio (año de cursada, materias de la carrera, tecnologías y habilidades existentes).
   * Al guardar, emite `perfil.actualizado`.
   */
  async guardarPerfilEstudiante(
    idUsuario: number,
    datos: DatosPerfilEstudiante,
  ): Promise<PerfilEstudianteDto> {
    const [carrera, materias, tecnologias, habilidades] = await Promise.all([
      this.catalogos.obtenerCarrera(datos.idCarrera),
      this.catalogos.obtenerMaterias(datos.materiasAprobadas),
      this.catalogos.obtenerTecnologias(datos.tecnologias.map((t) => t.idTecnologia)),
      this.catalogos.obtenerHabilidades(datos.habilidades),
    ]);
    const detalles = validarReglasPerfilEstudiante(datos, {
      carrera,
      materias,
      idsTecnologiasExistentes: new Set(tecnologias.map((t) => t.idTecnologia)),
      idsHabilidadesExistentes: new Set(habilidades.map((h) => h.idHabilidad)),
    });
    if (detalles.length > 0) {
      throw new ErrorReglaNegocio(
        detalles.length === 1
          ? detalles[0].mensaje
          : 'El perfil tiene datos que no cumplen las reglas del sistema',
        detalles,
      );
    }

    const idEstudiante = await this.perfiles.guardarEstudiante(idUsuario, datos);
    await this.eventos.publicar(EVENTO_PERFIL_ACTUALIZADO, {
      idUsuario,
      rol: 'estudiante',
      idEstudiante,
    });
    const perfil = await this.obtenerPerfilPropio({ idUsuario, rol: 'estudiante' });
    return perfil as PerfilEstudianteDto;
  }

  async guardarPerfilEmpresa(
    idUsuario: number,
    datos: DatosPerfilEmpresa,
  ): Promise<PerfilDto> {
    await this.perfiles.guardarEmpresa(idUsuario, datos);
    await this.eventos.publicar(EVENTO_PERFIL_ACTUALIZADO, {
      idUsuario,
      rol: 'empresa',
      idEstudiante: null,
    });
    return (await this.perfiles.obtenerEmpresaPorUsuario(idUsuario)) as PerfilDto;
  }

  async guardarPerfilDocente(
    idUsuario: number,
    datos: DatosPerfilDocente,
  ): Promise<PerfilDto> {
    await this.perfiles.guardarDocente(idUsuario, datos);
    await this.eventos.publicar(EVENTO_PERFIL_ACTUALIZADO, {
      idUsuario,
      rol: 'docente',
      idEstudiante: null,
    });
    return (await this.perfiles.obtenerDocentePorUsuario(idUsuario)) as PerfilDto;
  }

  // =========================================================================
  // Perfil de un estudiante visto por un publicador o el administrador
  // =========================================================================

  /**
   * `GET /estudiantes/:id`. El administrador ve todo; un publicador ve el perfil y, solo si el
   * estudiante tiene una postulación o invitación en un proyecto suyo, también el email.
   * Un estudiante desactivado solo lo ve el administrador (404 para el resto).
   */
  async obtenerEstudiantePublico(
    idEstudiante: number,
    solicitante: UsuarioAutenticado,
  ): Promise<EstudiantePublicoDto> {
    const [registro] = await this.perfiles.listarEstudiantes({
      idsEstudiante: [idEstudiante],
      incluir: { tecnologias: true, habilidades: true, materias: true },
    });
    const esAdministrador = solicitante.rol === 'administrador';
    if (!registro || (!registro.activo && !esAdministrador)) {
      throw new ErrorNoEncontrado('El estudiante no existe');
    }

    const verEmail =
      esAdministrador ||
      (await this.tieneRelacionConEstudiante(solicitante.idUsuario, idEstudiante));
    const perfil = await this.armarPerfilEstudiante(registro);
    return {
      ...perfil,
      nombre: registro.nombre,
      apellido: registro.apellido,
      ...(verEmail ? { email: registro.email } : {}),
    };
  }

  /**
   * Punto de extensión: M3 registra acá cómo saber si un publicador tiene una postulación o
   * invitación del estudiante (ver `FuenteVisibilidadContacto`). Se llama una vez al iniciar.
   */
  registrarFuenteVisibilidadContacto(fuente: FuenteVisibilidadContacto): void {
    this.fuentesVisibilidad.push(fuente);
  }

  // =========================================================================
  // Internos
  // =========================================================================

  private async tieneRelacionConEstudiante(
    idUsuario: number,
    idEstudiante: number,
  ): Promise<boolean> {
    for (const fuente of this.fuentesVisibilidad) {
      if (await fuente.publicadorTieneRelacionConEstudiante(idUsuario, idEstudiante)) {
        return true;
      }
    }
    return false;
  }

  private async cambiarActivo(idUsuario: number, activo: boolean): Promise<void> {
    if (!(await this.usuarios.actualizarActivo(idUsuario, activo))) {
      throw new ErrorNoEncontrado('El usuario no existe');
    }
  }

  private async armarPerfilEstudiante(
    registro: RegistroEstudiante,
  ): Promise<PerfilEstudianteDto> {
    const [carrera, tecnologias, habilidades, materias] = await Promise.all([
      this.catalogos.obtenerCarrera(registro.idCarrera),
      this.catalogos.obtenerTecnologias(registro.tecnologias.map((t) => t.idTecnologia)),
      this.catalogos.obtenerHabilidades(registro.habilidades),
      this.catalogos.obtenerMaterias(registro.materiasAprobadas),
    ]);
    if (!carrera) throw new ErrorNoEncontrado('La carrera del perfil no existe');
    return construirPerfilEstudianteDto(registro, {
      carrera,
      tecnologias,
      habilidades,
      materias,
    });
  }
}
