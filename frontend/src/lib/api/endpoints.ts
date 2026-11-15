import { request } from "./client";
import type {
  ActualizarUsuarioInput,
  AdministradorInput,
  AuthRespuesta,
  BusquedaProyectosFiltros,
  Carrera,
  ConfiguracionMotor,
  Dashboard,
  EstadisticasPublicas,
  EstadoPostulacion,
  EstadoProyecto,
  EstudiantePublico,
  Evaluacion,
  EvaluacionInput,
  Habilidad,
  Invitacion,
  InvitacionInput,
  LoginInput,
  Materia,
  MatchReferencia,
  MatchReferenciaInput,
  NotificacionesFiltros,
  NotificacionesRespuesta,
  Pagina,
  Perfil,
  PerfilInput,
  Postulacion,
  PostulacionInput,
  ProyectoDto,
  ProyectoInput,
  RecomendacionEstudiante,
  RecomendacionProyecto,
  RegistroInput,
  ResultadoRecalculo,
  ResumenReportes,
  RespuestaInvitacion,
  RestablecerContrasenaInput,
  Salud,
  SesionRespuesta,
  Tecnologia,
  TecnologiaInput,
  UsuarioAdmin,
  UsuariosAdminFiltros,
} from "./types";

/**
 * Una función por endpoint de docs/api/CONTRATO.md. Todas aceptan un `signal`
 * opcional para cancelar la llamada (lo usa `useApiQuery`).
 */
type Opciones = { signal?: AbortSignal };

// --- 2. Autenticación y perfiles (M1) --------------------------------------

export const auth = {
  /** `POST /auth/registro`. 401 no aplica acá: no redirige. */
  registro: (body: RegistroInput, o: Opciones = {}) =>
    request<AuthRespuesta>("/auth/registro", { method: "POST", body, redirigirSi401: false, ...o }),
  /** `POST /auth/login`. Un 401 significa credenciales inválidas, no sesión vencida. */
  login: (body: LoginInput, o: Opciones = {}) =>
    request<AuthRespuesta>("/auth/login", { method: "POST", body, redirigirSi401: false, ...o }),
  /** `GET /auth/yo`. Se usa también para detectar un token vencido, por eso no redirige solo. */
  yo: (o: Opciones & { redirigirSi401?: boolean } = {}) =>
    request<SesionRespuesta>("/auth/yo", { redirigirSi401: false, ...o }),
};

export const perfil = {
  /** `GET /perfil`: 404 si todavía no existe. */
  obtener: (o: Opciones = {}) => request<Perfil>("/perfil", o),
  /** `PUT /perfil`: crea o reemplaza el perfil propio (upsert). */
  guardar: (body: PerfilInput, o: Opciones = {}) =>
    request<Perfil>("/perfil", { method: "PUT", body, ...o }),
  /** `GET /estudiantes/:idEstudiante` (publicador o administrador). */
  estudiante: (idEstudiante: number, o: Opciones = {}) =>
    request<EstudiantePublico>(`/estudiantes/${idEstudiante}`, o),
};

// --- 3. Catálogos (M5) ------------------------------------------------------

export const catalogos = {
  carreras: (o: Opciones = {}) => request<Carrera[]>("/catalogos/carreras", o),
  materias: (idCarrera?: number, o: Opciones = {}) =>
    request<Materia[]>("/catalogos/materias", { query: { idCarrera }, ...o }),
  tecnologias: (o: Opciones = {}) => request<Tecnologia[]>("/catalogos/tecnologias", o),
  habilidades: (o: Opciones = {}) => request<Habilidad[]>("/catalogos/habilidades", o),
  /** `POST /admin/tecnologias` (administrador). 409 si el nombre ya existe. */
  crearTecnologia: (body: TecnologiaInput, o: Opciones = {}) =>
    request<Tecnologia>("/admin/tecnologias", { method: "POST", body, ...o }),
  /** `PUT /admin/tecnologias/:id` (administrador). */
  actualizarTecnologia: (id: number, body: TecnologiaInput, o: Opciones = {}) =>
    request<Tecnologia>(`/admin/tecnologias/${id}`, { method: "PUT", body, ...o }),
};

// --- 4. Proyectos (M2) ------------------------------------------------------

export const proyectos = {
  /** `POST /proyectos`: borrador, o publicado si `publicar` es `true`. */
  crear: (body: ProyectoInput, o: Opciones = {}) =>
    request<ProyectoDto>("/proyectos", { method: "POST", body, ...o }),
  /** `GET /proyectos/mios?estado=` */
  mios: (estado?: EstadoProyecto, o: Opciones = {}) =>
    request<ProyectoDto[]>("/proyectos/mios", { query: { estado }, ...o }),
  /** `GET /proyectos/:id` */
  obtener: (id: number, o: Opciones = {}) => request<ProyectoDto>(`/proyectos/${id}`, o),
  /** `PUT /proyectos/:id`: reemplaza tecnologías y habilidades. 409 si ya no se puede editar. */
  actualizar: (id: number, body: ProyectoInput, o: Opciones = {}) =>
    request<ProyectoDto>(`/proyectos/${id}`, { method: "PUT", body, ...o }),
  /** `POST /proyectos/:id/publicar`: borrador a publicado. */
  publicar: (id: number, o: Opciones = {}) =>
    request<ProyectoDto>(`/proyectos/${id}/publicar`, { method: "POST", ...o }),
  /** `PATCH /proyectos/:id/estado`. Transiciones inválidas dan 409. */
  cambiarEstado: (id: number, estado: EstadoProyecto, o: Opciones = {}) =>
    request<ProyectoDto>(`/proyectos/${id}/estado`, { method: "PATCH", body: { estado }, ...o }),
  /** `POST /proyectos/:id/duplicar` (deseable). */
  duplicar: (id: number, o: Opciones = {}) =>
    request<ProyectoDto>(`/proyectos/${id}/duplicar`, { method: "POST", ...o }),
  /** `GET /proyectos`: búsqueda de proyectos publicados, paginada. */
  buscar: (filtros: BusquedaProyectosFiltros = {}, o: Opciones = {}) =>
    request<Pagina<ProyectoDto>>("/proyectos", { query: { ...filtros }, ...o }),
};

// --- 5. Matching, postulaciones e invitaciones (M3) -------------------------

export const matching = {
  /** `GET /matching/recomendaciones?limite=` (estudiante con perfil). */
  recomendaciones: (limite?: number, o: Opciones = {}) =>
    request<RecomendacionProyecto[]>("/matching/recomendaciones", { query: { limite }, ...o }),
  /** `GET /matching/proyectos/:idProyecto/recomendados?limite=` (dueño del proyecto). */
  recomendados: (idProyecto: number, limite?: number, o: Opciones = {}) =>
    request<RecomendacionEstudiante[]>(`/matching/proyectos/${idProyecto}/recomendados`, {
      query: { limite },
      ...o,
    }),
  /** `GET /matching/configuraciones` (administrador). */
  configuraciones: (o: Opciones = {}) =>
    request<ConfiguracionMotor[]>("/matching/configuraciones", o),
  /** `POST /matching/configuraciones/:id/activar`: activa y recalcula todos los puntajes. */
  activarConfiguracion: (id: number, o: Opciones = {}) =>
    request<ResultadoRecalculo>(`/matching/configuraciones/${id}/activar`, { method: "POST", ...o }),
  /** `POST /matching/recalcular`: recalcula todos los pares con la configuración activa. */
  recalcular: (o: Opciones = {}) =>
    request<ResultadoRecalculo>("/matching/recalcular", { method: "POST", ...o }),
  /** `GET /matching/referencia` (administrador). */
  referencia: (o: Opciones = {}) => request<MatchReferencia[]>("/matching/referencia", o),
  /** `PUT /matching/referencia` (upsert). */
  guardarReferencia: (body: MatchReferenciaInput, o: Opciones = {}) =>
    request<MatchReferencia>("/matching/referencia", { method: "PUT", body, ...o }),
  /** `DELETE /matching/referencia/:id` (204). */
  eliminarReferencia: (id: number, o: Opciones = {}) =>
    request<void>(`/matching/referencia/${id}`, { method: "DELETE", ...o }),
  /** `POST /matching/evaluaciones`: calcula con la configuración indicada, guarda y devuelve. */
  evaluar: (body: EvaluacionInput, o: Opciones = {}) =>
    request<Evaluacion>("/matching/evaluaciones", { method: "POST", body, ...o }),
  /** `GET /matching/evaluaciones`: historial, la más reciente primero. */
  evaluaciones: (o: Opciones = {}) => request<Evaluacion[]>("/matching/evaluaciones", o),
};

export const postulaciones = {
  /** `POST /postulaciones`. 409 si ya se postuló. */
  crear: (body: PostulacionInput, o: Opciones = {}) =>
    request<Postulacion>("/postulaciones", { method: "POST", body, ...o }),
  /** `GET /postulaciones/mias?estado=` */
  mias: (estado?: EstadoPostulacion, o: Opciones = {}) =>
    request<Postulacion[]>("/postulaciones/mias", { query: { estado }, ...o }),
  /** `GET /proyectos/:idProyecto/postulaciones?estado=` (dueño o administrador). */
  delProyecto: (idProyecto: number, estado?: EstadoPostulacion, o: Opciones = {}) =>
    request<Postulacion[]>(`/proyectos/${idProyecto}/postulaciones`, { query: { estado }, ...o }),
  /** `GET /postulaciones/:id`: detalle con historial. */
  obtener: (id: number, o: Opciones = {}) => request<Postulacion>(`/postulaciones/${id}`, o),
  /** `PATCH /postulaciones/:id/estado`. Transiciones inválidas dan 409. */
  cambiarEstado: (id: number, estado: EstadoPostulacion, o: Opciones = {}) =>
    request<Postulacion>(`/postulaciones/${id}/estado`, { method: "PATCH", body: { estado }, ...o }),
};

export const invitaciones = {
  /** `POST /invitaciones` (dueño del proyecto). */
  crear: (body: InvitacionInput, o: Opciones = {}) =>
    request<Invitacion>("/invitaciones", { method: "POST", body, ...o }),
  /** `GET /invitaciones/mias` */
  mias: (o: Opciones = {}) => request<Invitacion[]>("/invitaciones/mias", o),
  /** `GET /proyectos/:idProyecto/invitaciones` (dueño). */
  delProyecto: (idProyecto: number, o: Opciones = {}) =>
    request<Invitacion[]>(`/proyectos/${idProyecto}/invitaciones`, o),
  /** `POST /invitaciones/:id/responder`: si acepta, se crea la postulación en `pendiente`. */
  responder: (id: number, aceptar: boolean, o: Opciones = {}) =>
    request<RespuestaInvitacion>(`/invitaciones/${id}/responder`, {
      method: "POST",
      body: { aceptar },
      ...o,
    }),
};

// --- 6. Comunicación (M4) ---------------------------------------------------

export const notificaciones = {
  /** `GET /notificaciones?soloNoLeidas=&limite=` */
  listar: (filtros: NotificacionesFiltros = {}, o: Opciones = {}) =>
    request<NotificacionesRespuesta>("/notificaciones", { query: { ...filtros }, ...o }),
  /** `POST /notificaciones/:id/leer` (204). */
  leer: (id: number, o: Opciones = {}) =>
    request<void>(`/notificaciones/${id}/leer`, { method: "POST", ...o }),
  /** `POST /notificaciones/leer-todas` (204). */
  leerTodas: (o: Opciones = {}) =>
    request<void>("/notificaciones/leer-todas", { method: "POST", ...o }),
};

// --- 7. Administración y reportes (M5) --------------------------------------

export const admin = {
  /** `GET /admin/usuarios` (paginada). */
  usuarios: (filtros: UsuariosAdminFiltros = {}, o: Opciones = {}) =>
    request<Pagina<UsuarioAdmin>>("/admin/usuarios", { query: { ...filtros }, ...o }),
  /** `PATCH /admin/usuarios/:id`. Un administrador no puede desactivarse ni cambiarse el rol (409). */
  actualizarUsuario: (id: number, body: ActualizarUsuarioInput, o: Opciones = {}) =>
    request<UsuarioAdmin>(`/admin/usuarios/${id}`, { method: "PATCH", body, ...o }),
  /** `POST /admin/administradores` (201). */
  crearAdministrador: (body: AdministradorInput, o: Opciones = {}) =>
    request<UsuarioAdmin>("/admin/administradores", { method: "POST", body, ...o }),
  /** `POST /admin/usuarios/:id/restablecer-contrasena` (204). */
  restablecerContrasena: (id: number, body: RestablecerContrasenaInput, o: Opciones = {}) =>
    request<void>(`/admin/usuarios/${id}/restablecer-contrasena`, { method: "POST", body, ...o }),
  /** `GET /admin/proyectos?estado=` */
  proyectos: (estado?: EstadoProyecto, o: Opciones = {}) =>
    request<ProyectoDto[]>("/admin/proyectos", { query: { estado }, ...o }),
  /** `POST /admin/proyectos/:id/suspender`. Solo desde `publicado` o `en_curso`. */
  suspenderProyecto: (id: number, motivo: string, o: Opciones = {}) =>
    request<ProyectoDto>(`/admin/proyectos/${id}/suspender`, {
      method: "POST",
      body: { motivo },
      ...o,
    }),
  /** `POST /admin/proyectos/:id/reactivar`: `suspendido` a `publicado`. */
  reactivarProyecto: (id: number, o: Opciones = {}) =>
    request<ProyectoDto>(`/admin/proyectos/${id}/reactivar`, { method: "POST", ...o }),
};

export const reportes = {
  /** `GET /reportes/resumen` (RF-07). */
  resumen: (o: Opciones = {}) => request<ResumenReportes>("/reportes/resumen", o),
  /** `GET /reportes/dashboard` (RF-11). */
  dashboard: (o: Opciones = {}) => request<Dashboard>("/reportes/dashboard", o),
};

export const publico = {
  /** `GET /publico/estadisticas`: números de la portada. No requiere sesión. */
  estadisticas: (o: Opciones = {}) =>
    request<EstadisticasPublicas>("/publico/estadisticas", { redirigirSi401: false, ...o }),
  /** `GET /health` */
  salud: (o: Opciones = {}) => request<Salud>("/health", { redirigirSi401: false, ...o }),
};

/** Punto de entrada único: `api.proyectos.buscar(...)`, `api.postulaciones.crear(...)`. */
export const api = {
  auth,
  perfil,
  catalogos,
  proyectos,
  matching,
  postulaciones,
  invitaciones,
  notificaciones,
  admin,
  reportes,
  publico,
};
