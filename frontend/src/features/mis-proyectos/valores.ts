import type { Errores } from "@/features/auth/validacion";
import type { Modalidad, ProyectoDto, ProyectoInput, TipoRetribucion } from "@/lib/api/types";
import { textoONull } from "@/lib/forms";

/** Valores del formulario de proyecto: los números son texto mientras se escriben. */
export interface ValoresProyecto {
  titulo: string;
  descripcion: string;
  objetivos: string;
  perfilBuscado: string;
  duracionSemanas: string;
  horasSemanales: string;
  anioMinimo: string;
  cupos: string;
  modalidad: Modalidad | "";
  tipoRetribucion: TipoRetribucion | "";
  detalleRetribucion: string;
  tecnologias: { idTecnologia: number; obligatoria: boolean }[];
  habilidades: number[];
}

export type CampoProyecto = Exclude<keyof ValoresProyecto, "tecnologias" | "habilidades">;

export function valoresIniciales(): ValoresProyecto {
  return {
    titulo: "",
    descripcion: "",
    objetivos: "",
    perfilBuscado: "",
    duracionSemanas: "",
    horasSemanales: "",
    anioMinimo: "1",
    cupos: "1",
    modalidad: "",
    tipoRetribucion: "",
    detalleRetribucion: "",
    tecnologias: [],
    habilidades: [],
  };
}

export function valoresDesdeProyecto(p: ProyectoDto): ValoresProyecto {
  return {
    titulo: p.titulo,
    descripcion: p.descripcion,
    objetivos: p.objetivos ?? "",
    perfilBuscado: p.perfilBuscado ?? "",
    duracionSemanas: String(p.duracionSemanas),
    horasSemanales: String(p.horasSemanales),
    anioMinimo: String(p.anioMinimo),
    cupos: String(p.cupos),
    modalidad: p.modalidad,
    tipoRetribucion: p.tipoRetribucion,
    detalleRetribucion: p.detalleRetribucion ?? "",
    tecnologias: p.tecnologias.map((t) => ({ idTecnologia: t.idTecnologia, obligatoria: t.obligatoria })),
    habilidades: p.habilidades.map((h) => h.idHabilidad),
  };
}

/**
 * Cuerpo de `POST /proyectos` o `PUT /proyectos/:id` (contrato 4). Los opcionales vacíos viajan como
 * `null`. `publicar` solo se manda en el alta; en la edición se omite. Se asume que `validarProyecto`
 * ya dio el visto bueno.
 */
export function payloadProyecto(v: ValoresProyecto, publicar?: boolean): ProyectoInput {
  return {
    titulo: v.titulo.trim(),
    descripcion: v.descripcion.trim(),
    objetivos: textoONull(v.objetivos),
    perfilBuscado: textoONull(v.perfilBuscado),
    duracionSemanas: Number(v.duracionSemanas),
    horasSemanales: Number(v.horasSemanales),
    anioMinimo: Number(v.anioMinimo),
    cupos: Number(v.cupos),
    modalidad: v.modalidad as Modalidad,
    tipoRetribucion: v.tipoRetribucion as TipoRetribucion,
    detalleRetribucion: textoONull(v.detalleRetribucion),
    tecnologias: v.tecnologias,
    habilidades: v.habilidades,
    ...(publicar === undefined ? {} : { publicar }),
  };
}

// --- Validación --------------------------------------------------------------
// Los límites salen de backend/database/schema.sql (duración 1-52, horas 1-40, año 1-6, cupos 1-20).

const MAX_TEXTO = 2000;

/** Mensaje de error de un número entero entre `min` y `max` (escrito con dígitos), o `undefined`. */
function errorEntero(valor: string, min: number, max: number, vacio: string, fuera: string): string | undefined {
  if (valor.trim() === "") return vacio;
  const n = /^-?\d+$/.test(valor.trim()) ? Number(valor) : NaN;
  return n >= min && n <= max ? undefined : fuera;
}

/**
 * Errores por campo, en el orden visual del formulario (el primero es el que recibe el foco).
 * Los mensajes están en español y se muestran tal cual.
 */
export function validarProyecto(v: ValoresProyecto): Errores<CampoProyecto> {
  const e: Errores<CampoProyecto> = {};
  const titulo = v.titulo.trim();
  const descripcion = v.descripcion.trim();

  if (!titulo) e.titulo = "Ingresá el título del proyecto.";
  else if (titulo.length < 5) e.titulo = "El título debe tener al menos 5 caracteres.";
  else if (titulo.length > 150) e.titulo = "El título no puede superar los 150 caracteres.";

  if (!descripcion) e.descripcion = "Describí el proyecto para que los estudiantes entiendan de qué se trata.";
  else if (descripcion.length < 20) e.descripcion = "La descripción debe tener al menos 20 caracteres.";
  else if (descripcion.length > MAX_TEXTO) e.descripcion = `La descripción no puede superar los ${MAX_TEXTO} caracteres.`;

  if (v.objetivos.trim().length > MAX_TEXTO) e.objetivos = `Los objetivos no pueden superar los ${MAX_TEXTO} caracteres.`;
  if (v.perfilBuscado.trim().length > MAX_TEXTO) e.perfilBuscado = `El perfil buscado no puede superar los ${MAX_TEXTO} caracteres.`;

  e.duracionSemanas = errorEntero(v.duracionSemanas, 1, 52, "Ingresá la duración en semanas.", "La duración debe ser un número entero de semanas entre 1 y 52.");
  e.horasSemanales = errorEntero(v.horasSemanales, 1, 40, "Ingresá las horas semanales que requiere.", "Las horas semanales deben ser un número entero entre 1 y 40.");
  e.anioMinimo = errorEntero(v.anioMinimo, 1, 6, "Ingresá el año mínimo de cursada.", "El año mínimo debe ser un número entero entre 1 y 6.");
  e.cupos = errorEntero(v.cupos, 1, 20, "Ingresá la cantidad de cupos.", "Los cupos deben ser un número entero entre 1 y 20.");

  if (!v.modalidad) e.modalidad = "Elegí la modalidad.";
  if (!v.tipoRetribucion) e.tipoRetribucion = "Elegí el tipo de retribución.";
  if (v.detalleRetribucion.trim().length > 300) e.detalleRetribucion = "El detalle no puede superar los 300 caracteres.";

  // Se descartan los campos sin error para que `Object.keys(e)` sea solo la lista de campos inválidos.
  return Object.fromEntries(Object.entries(e).filter(([, mensaje]) => mensaje !== undefined)) as Errores<CampoProyecto>;
}
