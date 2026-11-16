import type { Pagina } from '../../compartido/dominio/paginacion.js';
import type { Rol } from '../../compartido/dominio/seguridad.js';
import type {
  DatosPerfilDocente,
  DatosPerfilEmpresa,
  DatosPerfilEstudiante,
  PerfilDocenteDto,
  PerfilEmpresaDto,
  PublicadorDto,
  RegistroEstudiante,
} from './perfil.js';
import type {
  DatosNuevoUsuario,
  FiltroUsuarios,
  UsuarioConCredenciales,
  UsuarioDto,
  UsuarioListadoDto,
} from './usuario.js';

/** Persistencia de `usuario`. */
export interface UsuarioRepository {
  buscarPorId(idUsuario: number): Promise<UsuarioDto | null>;
  buscarPorIds(idsUsuario: readonly number[]): Promise<UsuarioDto[]>;
  /** Sin distinguir mayúsculas. Trae el hash para poder autenticar. */
  buscarPorEmail(email: string): Promise<UsuarioConCredenciales | null>;
  /** Lanza `ErrorConflicto` si el email ya está registrado. */
  crear(datos: DatosNuevoUsuario): Promise<UsuarioDto>;
  /** Cada actualización devuelve `false` si el usuario no existe. */
  actualizarActivo(idUsuario: number, activo: boolean): Promise<boolean>;
  actualizarRol(idUsuario: number, rol: Rol): Promise<boolean>;
  actualizarContrasena(idUsuario: number, contrasenaHash: string): Promise<boolean>;
  /** `true` si el usuario ya tiene alguna fila en `perfil_estudiante`, `perfil_empresa` o `perfil_docente`. */
  tienePerfil(idUsuario: number): Promise<boolean>;
  listar(filtro: FiltroUsuarios): Promise<Pagina<UsuarioListadoDto>>;
  contarActivosPorRol(): Promise<Record<Rol, number>>;
}
export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface FiltroEstudiantes {
  idsEstudiante?: readonly number[];
  idUsuario?: number;
  soloActivos?: boolean;
  /** Qué listas traer junto con el perfil (por defecto, ninguna). */
  incluir?: { tecnologias?: boolean; habilidades?: boolean; materias?: boolean };
}

/** Persistencia de los perfiles y sus tablas relacionadas (`estudiante_*`, `materia_aprobada`). */
export interface PerfilRepository {
  listarEstudiantes(filtro: FiltroEstudiantes): Promise<RegistroEstudiante[]>;
  /** Crea o reemplaza el perfil (y sus listas) en una transacción. Devuelve `idEstudiante`. */
  guardarEstudiante(idUsuario: number, datos: DatosPerfilEstudiante): Promise<number>;

  obtenerEmpresaPorUsuario(idUsuario: number): Promise<PerfilEmpresaDto | null>;
  guardarEmpresa(idUsuario: number, datos: DatosPerfilEmpresa): Promise<void>;
  obtenerDocentePorUsuario(idUsuario: number): Promise<PerfilDocenteDto | null>;
  guardarDocente(idUsuario: number, datos: DatosPerfilDocente): Promise<void>;

  obtenerPublicadorPorUsuario(idUsuario: number): Promise<PublicadorDto | null>;
  obtenerPublicadoresPorPerfil(
    referencias: ReadonlyArray<{ tipo: 'empresa' | 'docente'; id: number }>,
  ): Promise<PublicadorDto[]>;
}
export const PERFIL_REPOSITORY = Symbol('PERFIL_REPOSITORY');

/** Cifrado de contraseñas (bcrypt). Un solo lugar para hashear y comparar. */
export interface HasheadorContrasenas {
  hashear(contrasena: string): Promise<string>;
  comparar(contrasena: string, hash: string): Promise<boolean>;
}
export const HASHEADOR_CONTRASENAS = Symbol('HASHEADOR_CONTRASENAS');

/** Emisión y verificación de tokens de sesión (JWT). */
export interface ServicioTokens {
  emitir(usuario: { idUsuario: number; rol: Rol }): Promise<string>;
  /** Devuelve el `idUsuario` del token. Lanza `ErrorNoAutenticado` si es inválido o venció. */
  verificar(token: string): Promise<number>;
}
export const SERVICIO_TOKENS = Symbol('SERVICIO_TOKENS');

/**
 * Punto de extensión de la regla de visibilidad del email de un estudiante
 * (`GET /estudiantes/:id`): el email solo lo ve un publicador si el estudiante tiene una
 * postulación o una invitación en uno de sus proyectos. Esas tablas son de M3, que depende de
 * M1 y no al revés; por eso M3 se registra acá con `PerfilesService.registrarFuenteVisibilidadContacto`.
 * Mientras no haya ninguna fuente registrada, la respuesta es "no".
 */
export interface FuenteVisibilidadContacto {
  publicadorTieneRelacionConEstudiante(
    idUsuarioPublicador: number,
    idEstudiante: number,
  ): Promise<boolean>;
}
