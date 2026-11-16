/**
 * Tipos de la API de UTN Match.
 *
 * Reflejan docs/api/CONTRATO.md (sección por sección). Si el contrato cambia,
 * se cambian acá en el mismo commit. Los identificadores son números y los
 * puntajes van de 0 a 1.
 */

// ---------------------------------------------------------------------------
// Enumeraciones (coinciden con los tipos ENUM de backend/database/schema.sql)
// ---------------------------------------------------------------------------

export type Rol = "estudiante" | "empresa" | "docente" | "administrador";
/** Roles que se pueden elegir en el registro público. */
export type RolRegistrable = Exclude<Rol, "administrador">;
/** "Publicador" es una empresa o un docente. */
export type RolPublicador = "empresa" | "docente";

export type NivelTecnologia = "basico" | "intermedio" | "avanzado";
export type CategoriaTecnologia =
  | "lenguaje"
  | "frontend"
  | "backend"
  | "base_de_datos"
  | "devops"
  | "datos"
  | "mobile"
  | "hardware";

export type Modalidad = "remoto" | "presencial" | "hibrido";
export type TipoRetribucion = "remunerado" | "practica_profesional" | "certificado";
export type EstadoProyecto =
  | "borrador"
  | "publicado"
  | "en_curso"
  | "finalizado"
  | "cancelado"
  | "suspendido";
export type EstadoPostulacion =
  | "pendiente"
  | "en_revision"
  | "entrevista"
  | "aceptada"
  | "rechazada"
  | "retirada";
export type EstadoInvitacion = "pendiente" | "aceptada" | "rechazada";
export type TipoNotificacion =
  | "nuevo_match"
  | "invitacion"
  | "nueva_postulacion"
  | "cambio_estado_postulacion"
  | "cambio_estado_proyecto"
  | "mensaje_nuevo";

// ---------------------------------------------------------------------------
// Convenciones (sección 1)
// ---------------------------------------------------------------------------

export interface ErrorDetalle {
  campo: string;
  mensaje: string;
}

/** Cuerpo de error que devuelve el backend. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: ErrorDetalle[];
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface ParametrosPagina {
  pagina?: number;
  tamano?: number;
}

// ---------------------------------------------------------------------------
// Autenticación y perfiles (M1, sección 2)
// ---------------------------------------------------------------------------

export interface Usuario {
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  perfilCompleto: boolean;
}

export interface RegistroInput {
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
  rol: RolRegistrable;
}

export interface LoginInput {
  email: string;
  contrasena: string;
}

export interface AuthRespuesta {
  token: string;
  usuario: Usuario;
}

export interface CarreraResumen {
  idCarrera: number;
  nombre: string;
  duracionAnios: number;
}

export interface TecnologiaDePerfil {
  idTecnologia: number;
  nombre: string;
  categoria: CategoriaTecnologia;
  nivel: NivelTecnologia;
}

export interface HabilidadResumen {
  idHabilidad: number;
  nombre: string;
}

export interface MateriaAprobada {
  idMateria: number;
  nombre: string;
  anioPlan: number;
}

export interface PerfilEstudiante {
  idEstudiante: number;
  idCarrera: number;
  anioCursada: number;
  horasSemanales: number;
  descripcion: string | null;
  proyectosPrevios: string | null;
  cvUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  carrera: CarreraResumen;
  tecnologias: TecnologiaDePerfil[];
  habilidades: HabilidadResumen[];
  materiasAprobadas: MateriaAprobada[];
}

export interface PerfilEmpresa {
  idEmpresa: number;
  nombreEmpresa: string;
  sector: string;
  descripcion: string | null;
  contacto: string;
  sitioWeb: string | null;
}

export interface PerfilDocente {
  idDocente: number;
  catedra: string;
  areaInvestigacion: string | null;
  descripcion: string | null;
}

export type Perfil = PerfilEstudiante | PerfilEmpresa | PerfilDocente;

export function esPerfilEstudiante(perfil: Perfil | null | undefined): perfil is PerfilEstudiante {
  return !!perfil && "idEstudiante" in perfil;
}
export function esPerfilEmpresa(perfil: Perfil | null | undefined): perfil is PerfilEmpresa {
  return !!perfil && "idEmpresa" in perfil;
}
export function esPerfilDocente(perfil: Perfil | null | undefined): perfil is PerfilDocente {
  return !!perfil && "idDocente" in perfil;
}

/** `PUT /perfil` del estudiante: tecnologías con nivel, habilidades y materias por id. */
export interface PerfilEstudianteInput {
  idCarrera: number;
  anioCursada: number;
  horasSemanales: number;
  descripcion: string | null;
  proyectosPrevios: string | null;
  cvUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  tecnologias: { idTecnologia: number; nivel: NivelTecnologia }[];
  habilidades: number[];
  materiasAprobadas: number[];
}

export interface PerfilEmpresaInput {
  nombreEmpresa: string;
  sector: string;
  descripcion: string | null;
  contacto: string;
  sitioWeb: string | null;
}

export interface PerfilDocenteInput {
  catedra: string;
  areaInvestigacion: string | null;
  descripcion: string | null;
}

export type PerfilInput = PerfilEstudianteInput | PerfilEmpresaInput | PerfilDocenteInput;

/** `GET /auth/yo`. `perfil` es `null` si todavía no lo completó (o si es administrador). */
export interface SesionRespuesta {
  usuario: Usuario;
  perfil: Perfil | null;
}

/**
 * `GET /estudiantes/:idEstudiante`. El contrato dice "perfil del estudiante" y que el
 * `email` solo aparece si hay una postulación o invitación en un proyecto del publicador.
 * `nombre` y `apellido` no están especificados: se tipan como opcionales.
 */
export type EstudiantePublico = PerfilEstudiante & {
  nombre?: string;
  apellido?: string;
  email?: string;
};

// ---------------------------------------------------------------------------
// Catálogos (M5, sección 3)
// ---------------------------------------------------------------------------

export interface Carrera {
  idCarrera: number;
  nombre: string;
  duracionAnios: number;
}

export interface Materia {
  idMateria: number;
  idCarrera: number;
  nombre: string;
  anioPlan: number;
  cuatrimestre: number | null;
}

export interface Tecnologia {
  idTecnologia: number;
  nombre: string;
  categoria: CategoriaTecnologia;
  descripcion: string | null;
}

export interface Habilidad {
  idHabilidad: number;
  nombre: string;
  descripcion: string | null;
}

export interface TecnologiaInput {
  nombre: string;
  categoria: CategoriaTecnologia;
  descripcion?: string | null;
}

// ---------------------------------------------------------------------------
// Proyectos (M2, sección 4)
// ---------------------------------------------------------------------------

export interface PublicadorProyecto {
  tipo: RolPublicador;
  id: number;
  nombre: string;
  idUsuario: number;
}

export interface TecnologiaDeProyecto {
  idTecnologia: number;
  nombre: string;
  categoria: CategoriaTecnologia;
  obligatoria: boolean;
}

export interface ProyectoDto {
  idProyecto: number;
  titulo: string;
  descripcion: string;
  objetivos: string | null;
  perfilBuscado: string | null;
  duracionSemanas: number;
  horasSemanales: number;
  anioMinimo: number;
  cupos: number;
  modalidad: Modalidad;
  tipoRetribucion: TipoRetribucion;
  detalleRetribucion: string | null;
  estado: EstadoProyecto;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  publicador: PublicadorProyecto;
  tecnologias: TecnologiaDeProyecto[];
  habilidades: HabilidadResumen[];
  /** Solo para el publicador dueño y el administrador. */
  cantidadPostulaciones?: number;
  /** Solo cuando quien consulta es un estudiante con perfil completo (0 a 1). */
  compatibilidad?: number;
}

export interface ProyectoInput {
  titulo: string;
  descripcion: string;
  objetivos?: string | null;
  perfilBuscado?: string | null;
  duracionSemanas: number;
  horasSemanales: number;
  anioMinimo: number;
  cupos: number;
  modalidad: Modalidad;
  tipoRetribucion: TipoRetribucion;
  detalleRetribucion?: string | null;
  tecnologias: { idTecnologia: number; obligatoria: boolean }[];
  habilidades?: number[];
  /** Solo en el alta: `true` crea el proyecto directamente en `publicado`. */
  publicar?: boolean;
}

export interface CambioEstadoProyectoInput {
  estado: EstadoProyecto;
}

export interface BusquedaProyectosFiltros extends ParametrosPagina {
  /** Busca en título y descripción. */
  q?: string;
  /** Ids de tecnologías; alcanza con que el proyecto pida al menos una. */
  tecnologias?: number[];
  modalidad?: Modalidad;
  tipoRetribucion?: TipoRetribucion;
  horasMax?: number;
  /** Año mínimo del proyecto menor o igual a este valor. */
  anioMax?: number;
}

// ---------------------------------------------------------------------------
// Matching (M3, sección 5.1 a 5.3)
// ---------------------------------------------------------------------------

export interface PuntajesMatch {
  tecnologias: number | null;
  /** `null` cuando la configuración activa no usa texto (peso 0). */
  texto: number | null;
  contexto: number | null;
}

export interface PostulacionResumen {
  idPostulacion: number;
  estado: EstadoPostulacion;
}

export interface InvitacionPendienteResumen {
  idInvitacion: number;
}

export interface RecomendacionProyecto {
  proyecto: ProyectoDto;
  puntajeTotal: number;
  puntajes: PuntajesMatch;
  tecnologiasCoincidentes: string[];
  tecnologiasFaltantes: string[];
  postulacion: PostulacionResumen | null;
  invitacionPendiente: InvitacionPendienteResumen | null;
}

export interface EstudianteRecomendado {
  idEstudiante: number;
  nombre: string;
  apellido: string;
  carrera: string;
  anioCursada: number;
  horasSemanales: number;
  tecnologias: { nombre: string; nivel: NivelTecnologia }[];
}

export interface RecomendacionEstudiante {
  estudiante: EstudianteRecomendado;
  puntajeTotal: number;
  puntajes: PuntajesMatch;
  tecnologiasCoincidentes: string[];
  tecnologiasFaltantes: string[];
  idPostulacion: number | null;
  idInvitacion: number | null;
}

export interface ConfiguracionMotor {
  idConfiguracion: number;
  nombre: string;
  descripcion: string | null;
  pesoTecnologias: number;
  pesoTexto: number;
  pesoContexto: number;
  umbralRecomendacion: number;
  activa: boolean;
}

export interface ResultadoRecalculo {
  pares: number;
  milisegundos: number;
}

/**
 * `estudiante` y `proyecto` no están detallados en el contrato: se asumen como
 * etiquetas de texto (nombre del estudiante y título del proyecto).
 */
export interface MatchReferencia {
  idMatchReferencia: number;
  idEstudiante: number;
  estudiante: string;
  idProyecto: number;
  proyecto: string;
  esRelevante: boolean;
  observacion: string | null;
}

export interface MatchReferenciaInput {
  idEstudiante: number;
  idProyecto: number;
  esRelevante: boolean;
  observacion?: string | null;
}

export interface EvaluacionInput {
  idConfiguracion: number;
  /** Por defecto 5. */
  k?: number;
}

export interface Evaluacion {
  idEvaluacion: number;
  idConfiguracion: number;
  /** Nombre de la configuración evaluada (por ejemplo "v1"). */
  configuracion: string;
  fechaEjecucion: string;
  k: number;
  cantidadEstudiantes: number;
  precisionGlobal: number;
  recallGlobal: number;
  precisionTopK: number;
  observaciones: string | null;
}

// ---------------------------------------------------------------------------
// Postulaciones e invitaciones (M3, sección 5.4 y 5.5)
// ---------------------------------------------------------------------------

export interface HistorialPostulacion {
  estadoAnterior: EstadoPostulacion | null;
  estadoNuevo: EstadoPostulacion;
  fechaCambio: string;
}

export interface Postulacion {
  idPostulacion: number;
  estado: EstadoPostulacion;
  mensajePresentacion: string | null;
  fechaPostulacion: string;
  fechaActualizacion: string;
  proyecto: {
    idProyecto: number;
    titulo: string;
    estado: EstadoProyecto;
    publicador: string;
  };
  estudiante: {
    idEstudiante: number;
    nombre: string;
    apellido: string;
    /** Solo lo ven el publicador dueño y el administrador. */
    email?: string;
    carrera: string;
    anioCursada: number;
    tecnologias: { nombre: string; nivel: NivelTecnologia }[];
  };
  puntajeTotal: number | null;
  /** Solo viene en el detalle (`GET /postulaciones/:id`). */
  historial?: HistorialPostulacion[];
}

export interface PostulacionInput {
  idProyecto: number;
  mensajePresentacion?: string | null;
}

export interface CambioEstadoPostulacionInput {
  estado: EstadoPostulacion;
}

export interface Invitacion {
  idInvitacion: number;
  proyecto: { idProyecto: number; titulo: string; publicador: string };
  estudiante: { idEstudiante: number; nombre: string; apellido: string };
  mensaje: string | null;
  estado: EstadoInvitacion;
  fechaInvitacion: string;
  fechaRespuesta: string | null;
}

export interface InvitacionInput {
  idProyecto: number;
  idEstudiante: number;
  mensaje?: string | null;
}

export interface RespuestaInvitacion {
  invitacion: Invitacion;
  /** `null` si el estudiante rechazó la invitación. */
  postulacion: Postulacion | null;
}

// ---------------------------------------------------------------------------
// Comunicación (M4, sección 6)
// ---------------------------------------------------------------------------

export interface Notificacion {
  idNotificacion: number;
  tipo: TipoNotificacion;
  mensaje: string;
  urlReferencia: string | null;
  fecha: string;
  leida: boolean;
}

export interface NotificacionesRespuesta {
  items: Notificacion[];
  noLeidas: number;
}

export interface NotificacionesFiltros {
  soloNoLeidas?: boolean;
  limite?: number;
}

// ---------------------------------------------------------------------------
// Administración y reportes (M5, sección 7)
// ---------------------------------------------------------------------------

export interface UsuarioAdmin {
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  fechaRegistro: string;
  /** Número del perfil de estudiante; `null` si no es estudiante o no completó el perfil. */
  idEstudiante: number | null;
}

export interface UsuariosAdminFiltros extends ParametrosPagina {
  rol?: Rol;
  activo?: boolean;
  q?: string;
}

export interface ActualizarUsuarioInput {
  activo?: boolean;
  rol?: Rol;
}

export interface AdministradorInput {
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
}

export interface RestablecerContrasenaInput {
  contrasenaNueva: string;
}

export interface SuspenderProyectoInput {
  motivo: string;
}

export interface ResumenReportes {
  estudiantesActivos: number;
  empresasActivas: number;
  docentesActivos: number;
  proyectosPorEstado: Partial<Record<EstadoProyecto, number>>;
  postulacionesPorEstado: Partial<Record<EstadoPostulacion, number>>;
}

export interface DemandaTecnologia {
  idTecnologia: number;
  tecnologia: string;
  categoria: CategoriaTecnologia;
  cantidadProyectos: number;
  cantidadObligatoria: number;
}

export interface EvolucionTecnologia {
  /** Primer día del mes, ISO (por ejemplo "2026-09-01"). */
  mes: string;
  tecnologia: string;
  cantidadProyectos: number;
}

export interface MatchPorCarreraAnio {
  carrera: string;
  anioCursada: number;
  totalEstudiantes: number;
  conRecomendacion: number;
  conProyecto: number;
  pctConRecomendacion: number;
  pctConProyecto: number;
}

export interface TiempoPrimerProyecto {
  promedioDias: number | null;
  estudiantes: number;
}

export interface EmbudoMensual {
  mes: string;
  postulaciones: number;
  entrevistas: number;
  proyectosCerrados: number;
  pctPostulacionAEntrevista: number | null;
  pctEntrevistaACierre: number | null;
}

export interface EvaluacionMotorResumen {
  configuracion: string;
  precisionGlobal: number;
  recallGlobal: number;
  precisionTopK: number;
  k: number;
}

export interface Dashboard {
  tecnologiasDemandadas: {
    ranking: DemandaTecnologia[];
    evolucion: EvolucionTecnologia[];
  };
  matchPorCarreraAnio: MatchPorCarreraAnio[];
  tiempoPrimerProyecto: TiempoPrimerProyecto;
  embudo: EmbudoMensual[];
  evaluacionMotor: EvaluacionMotorResumen[];
}

export interface EstadisticasPublicas {
  estudiantes: number;
  proyectosPublicados: number;
  publicadores: number;
  postulaciones: number;
}

export interface Salud {
  estado: "ok" | string;
  baseDeDatos: "ok" | string;
}
