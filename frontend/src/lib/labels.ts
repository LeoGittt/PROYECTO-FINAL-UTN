import type {
  CategoriaTecnologia,
  EstadoInvitacion,
  EstadoPostulacion,
  EstadoProyecto,
  Modalidad,
  NivelTecnologia,
  Rol,
  TipoNotificacion,
  TipoRetribucion,
} from "@/lib/api/types";

/** Textos en español de las enumeraciones del contrato. */

export const ROL_ETIQUETA: Record<Rol, string> = {
  estudiante: "Estudiante",
  empresa: "Empresa",
  docente: "Docente",
  administrador: "Administrador",
};

export const NIVEL_ETIQUETA: Record<NivelTecnologia, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export const CATEGORIA_ETIQUETA: Record<CategoriaTecnologia, string> = {
  lenguaje: "Lenguaje",
  frontend: "Frontend",
  backend: "Backend",
  base_de_datos: "Base de datos",
  devops: "DevOps",
  datos: "Datos",
  mobile: "Mobile",
  hardware: "Hardware",
};

export const MODALIDAD_ETIQUETA: Record<Modalidad, string> = {
  remoto: "Remoto",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

export const RETRIBUCION_ETIQUETA: Record<TipoRetribucion, string> = {
  remunerado: "Remunerado",
  practica_profesional: "Práctica profesional",
  certificado: "Certificado",
};

export const ESTADO_PROYECTO_ETIQUETA: Record<EstadoProyecto, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  suspendido: "Suspendido",
};

export const ESTADO_POSTULACION_ETIQUETA: Record<EstadoPostulacion, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  entrevista: "Entrevista",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  retirada: "Retirada",
};

export const ESTADO_INVITACION_ETIQUETA: Record<EstadoInvitacion, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

export const TIPO_NOTIFICACION_ETIQUETA: Record<TipoNotificacion, string> = {
  nuevo_match: "Nuevo match",
  invitacion: "Invitación",
  nueva_postulacion: "Nueva postulación",
  cambio_estado_postulacion: "Cambio en tu postulación",
  cambio_estado_proyecto: "Cambio en un proyecto",
  mensaje_nuevo: "Mensaje nuevo",
};
