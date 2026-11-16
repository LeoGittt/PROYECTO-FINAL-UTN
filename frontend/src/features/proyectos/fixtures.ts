import type {
  Invitacion,
  Postulacion,
  ProyectoDto,
  RecomendacionEstudiante,
  RecomendacionProyecto,
  Usuario,
} from "@/lib/api/types";

/**
 * Datos de prueba con la forma de docs/api/CONTRATO.md (secciones 4 y 5) para los tests de
 * proyectos, recomendaciones, postulaciones e invitaciones. No se importan desde código de producción.
 */

export const PROYECTO: ProyectoDto = {
  idProyecto: 1,
  titulo: "Sistema de turnos para un club",
  descripcion: "Aplicación web para reservar canchas y administrar socios del club de barrio.",
  objetivos: "Entregar un MVP funcional en dos meses.",
  perfilBuscado: "Estudiantes con ganas de aprender desarrollo web full stack.",
  duracionSemanas: 8,
  horasSemanales: 10,
  anioMinimo: 1,
  cupos: 2,
  modalidad: "remoto",
  tipoRetribucion: "remunerado",
  detalleRetribucion: "USD 300 por mes",
  estado: "publicado",
  fechaPublicacion: "2026-09-01T12:00:00Z",
  fechaCierre: null,
  publicador: { tipo: "empresa", id: 1, nombre: "Acme SA", idUsuario: 20 },
  tecnologias: [
    { idTecnologia: 3, nombre: "React", categoria: "frontend", obligatoria: true },
    { idTecnologia: 4, nombre: "Node.js", categoria: "backend", obligatoria: true },
    { idTecnologia: 5, nombre: "PostgreSQL", categoria: "base_de_datos", obligatoria: false },
  ],
  habilidades: [{ idHabilidad: 1, nombre: "Trabajo en equipo" }],
};

export function proyectoDe(extra: Partial<ProyectoDto> = {}): ProyectoDto {
  return { ...PROYECTO, ...extra };
}

export function usuarioDe(rol: Usuario["rol"], extra: Partial<Usuario> = {}): Usuario {
  return {
    idUsuario: rol === "estudiante" ? 7 : 20,
    nombre: rol === "estudiante" ? "Ana" : "Carla",
    apellido: rol === "estudiante" ? "Pérez" : "Gómez",
    email: rol === "estudiante" ? "ana@utn.edu.ar" : "carla@acme.com",
    rol,
    activo: true,
    perfilCompleto: true,
    ...extra,
  };
}

export const RECOMENDACION_PROYECTO: RecomendacionProyecto = {
  proyecto: proyectoDe({ compatibilidad: 0.82 }),
  puntajeTotal: 0.82,
  puntajes: { tecnologias: 0.9, texto: null, contexto: 0.7 },
  tecnologiasCoincidentes: ["React", "Node.js"],
  tecnologiasFaltantes: ["PostgreSQL"],
  postulacion: null,
  invitacionPendiente: null,
};

export function recomendacionDe(extra: Partial<RecomendacionProyecto> = {}): RecomendacionProyecto {
  return { ...RECOMENDACION_PROYECTO, ...extra };
}

export const RECOMENDACION_ESTUDIANTE: RecomendacionEstudiante = {
  estudiante: {
    idEstudiante: 31,
    nombre: "Lucía",
    apellido: "Fernández",
    carrera: "Tecnicatura Universitaria en Programación",
    anioCursada: 2,
    horasSemanales: 12,
    tecnologias: [
      { nombre: "React", nivel: "intermedio" },
      { nombre: "Node.js", nivel: "basico" },
    ],
  },
  puntajeTotal: 0.78,
  puntajes: { tecnologias: 0.85, texto: null, contexto: 0.95 },
  tecnologiasCoincidentes: ["React", "Node.js"],
  tecnologiasFaltantes: ["PostgreSQL"],
  idPostulacion: null,
  idInvitacion: null,
};

export const POSTULACION: Postulacion = {
  idPostulacion: 11,
  estado: "pendiente",
  mensajePresentacion: "Me interesa mucho el proyecto.",
  fechaPostulacion: "2026-09-05T10:00:00Z",
  fechaActualizacion: "2026-09-05T10:00:00Z",
  proyecto: { idProyecto: 1, titulo: "Sistema de turnos para un club", estado: "publicado", publicador: "Acme SA" },
  estudiante: {
    idEstudiante: 31,
    nombre: "Lucía",
    apellido: "Fernández",
    carrera: "Tecnicatura Universitaria en Programación",
    anioCursada: 2,
    activo: true,
    tecnologias: [
      { nombre: "React", nivel: "intermedio" },
      { nombre: "Node.js", nivel: "basico" },
    ],
  },
  puntajeTotal: 0.78,
};

export function postulacionDe(extra: Partial<Postulacion> = {}): Postulacion {
  return { ...POSTULACION, ...extra };
}

export const INVITACION: Invitacion = {
  idInvitacion: 51,
  proyecto: { idProyecto: 1, titulo: "Sistema de turnos para un club", publicador: "Acme SA" },
  estudiante: { idEstudiante: 7, nombre: "Ana", apellido: "Pérez" },
  mensaje: "Tu perfil encaja muy bien con lo que buscamos.",
  estado: "pendiente",
  fechaInvitacion: "2026-09-06T09:00:00Z",
  fechaRespuesta: null,
};

export function invitacionDe(extra: Partial<Invitacion> = {}): Invitacion {
  return { ...INVITACION, ...extra };
}
