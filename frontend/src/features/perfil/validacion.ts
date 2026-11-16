import type { Carrera } from "@/lib/api/types";
import type { Errores } from "@/features/auth/validacion";
import type { ValoresDocente, ValoresEmpresa, ValoresEstudiante } from "./valores";

/** Validaciones de los formularios de perfil. Los límites salen de backend/database/schema.sql. */

export const MAX_TEXTO_LARGO = 2000;
export const MIN_HORAS = 1;
export const MAX_HORAS = 60;

const MENSAJE_URL = "Ingresá una URL válida que empiece con http:// o https://.";

/** `undefined` si es válida (o está vacía y es opcional); si no, el mensaje de error. */
export function validarUrlOpcional(valor: string): string | undefined {
  const texto = valor.trim();
  if (!texto) return undefined;
  if (texto.length > 300) return "La URL no puede superar los 300 caracteres.";
  try {
    const url = new URL(texto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return MENSAJE_URL;
  } catch {
    return MENSAJE_URL;
  }
  return undefined;
}

/** `sujeto` incluye el verbo para concordar en número ("La descripción no puede", "Los proyectos previos no pueden"). */
function textoLargo(valor: string, sujeto: string): string | undefined {
  return valor.trim().length > MAX_TEXTO_LARGO ? `${sujeto} superar los ${MAX_TEXTO_LARGO} caracteres.` : undefined;
}

function aniosTexto(n: number): string {
  return `${n} ${n === 1 ? "año" : "años"}`;
}

// --- Estudiante --------------------------------------------------------------

export type CampoEstudiante =
  | "idCarrera"
  | "anioCursada"
  | "horasSemanales"
  | "descripcion"
  | "proyectosPrevios"
  | "cvUrl"
  | "githubUrl"
  | "portfolioUrl";

export const ORDEN_ESTUDIANTE: readonly CampoEstudiante[] = [
  "idCarrera",
  "anioCursada",
  "horasSemanales",
  "descripcion",
  "proyectosPrevios",
  "githubUrl",
  "portfolioUrl",
  "cvUrl",
];

export function validarEstudiante(valores: ValoresEstudiante, carreras: Carrera[]): Errores<CampoEstudiante> {
  const errores: Errores<CampoEstudiante> = {};

  const carrera = carreras.find((c) => String(c.idCarrera) === valores.idCarrera);
  if (!valores.idCarrera) errores.idCarrera = "Elegí tu carrera.";

  const anio = Number(valores.anioCursada);
  if (!valores.anioCursada) errores.anioCursada = "Elegí tu año de cursada.";
  else if (!Number.isInteger(anio) || anio < 1 || anio > 6) errores.anioCursada = "El año de cursada debe estar entre 1 y 6.";
  else if (carrera && anio > carrera.duracionAnios) {
    errores.anioCursada = `El año de cursada no puede superar la duración de la carrera (${aniosTexto(carrera.duracionAnios)}).`;
  }

  const horas = Number(valores.horasSemanales);
  if (valores.horasSemanales.trim() === "") errores.horasSemanales = "Ingresá cuántas horas por semana tenés disponibles.";
  else if (!Number.isInteger(horas) || horas < MIN_HORAS || horas > MAX_HORAS) {
    errores.horasSemanales = `Las horas semanales deben ser un número entero entre ${MIN_HORAS} y ${MAX_HORAS}.`;
  }

  const descripcion = textoLargo(valores.descripcion, "La descripción no puede");
  if (descripcion) errores.descripcion = descripcion;
  const previos = textoLargo(valores.proyectosPrevios, "Los proyectos previos no pueden");
  if (previos) errores.proyectosPrevios = previos;

  const github = validarUrlOpcional(valores.githubUrl);
  if (github) errores.githubUrl = github;
  const portfolio = validarUrlOpcional(valores.portfolioUrl);
  if (portfolio) errores.portfolioUrl = portfolio;
  const cv = validarUrlOpcional(valores.cvUrl);
  if (cv) errores.cvUrl = cv;

  return errores;
}

// --- Empresa -----------------------------------------------------------------

export type CampoEmpresa = keyof ValoresEmpresa;
export const ORDEN_EMPRESA: readonly CampoEmpresa[] = ["nombreEmpresa", "sector", "contacto", "sitioWeb", "descripcion"];

export function validarEmpresa(valores: ValoresEmpresa): Errores<CampoEmpresa> {
  const errores: Errores<CampoEmpresa> = {};

  const nombre = valores.nombreEmpresa.trim();
  if (!nombre) errores.nombreEmpresa = "Ingresá el nombre de la empresa.";
  else if (nombre.length > 150) errores.nombreEmpresa = "El nombre no puede superar los 150 caracteres.";

  const sector = valores.sector.trim();
  if (!sector) errores.sector = "Ingresá el sector o rubro de la empresa.";
  else if (sector.length > 100) errores.sector = "El sector no puede superar los 100 caracteres.";

  const contacto = valores.contacto.trim();
  if (!contacto) errores.contacto = "Ingresá un dato de contacto (email o teléfono).";
  else if (contacto.length > 150) errores.contacto = "El contacto no puede superar los 150 caracteres.";

  const sitio = validarUrlOpcional(valores.sitioWeb);
  if (sitio) errores.sitioWeb = sitio;

  const descripcion = textoLargo(valores.descripcion, "La descripción no puede");
  if (descripcion) errores.descripcion = descripcion;

  return errores;
}

// --- Docente -----------------------------------------------------------------

export type CampoDocente = keyof ValoresDocente;
export const ORDEN_DOCENTE: readonly CampoDocente[] = ["catedra", "areaInvestigacion", "descripcion"];

export function validarDocente(valores: ValoresDocente): Errores<CampoDocente> {
  const errores: Errores<CampoDocente> = {};

  const catedra = valores.catedra.trim();
  if (!catedra) errores.catedra = "Ingresá el nombre de tu cátedra.";
  else if (catedra.length > 150) errores.catedra = "El nombre de la cátedra no puede superar los 150 caracteres.";

  if (valores.areaInvestigacion.trim().length > 150) {
    errores.areaInvestigacion = "El área no puede superar los 150 caracteres.";
  }

  const descripcion = textoLargo(valores.descripcion, "La descripción no puede");
  if (descripcion) errores.descripcion = descripcion;

  return errores;
}
