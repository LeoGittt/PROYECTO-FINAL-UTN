import {
  esPerfilDocente,
  esPerfilEmpresa,
  esPerfilEstudiante,
  type Perfil,
  type Rol,
} from "@/lib/api/types";
import {
  DOCENTE_VACIO,
  EMPRESA_VACIA,
  valoresDesdeDocente,
  valoresDesdeEmpresa,
  valoresDesdeEstudiante,
  type ValoresDocente,
  type ValoresEmpresa,
  type ValoresEstudiante,
} from "./valores";

/**
 * Completitud del perfil: qué porcentaje tiene cargado y qué le falta. Es un indicador
 * de la interfaz para guiar a la persona (RNF-01); el backend decide por su cuenta
 * `perfilCompleto`. Cada ítem pesa distinto: lo que más afecta a las recomendaciones pesa más.
 */

export interface ItemCompletitud {
  clave: string;
  /** Texto de la tarea pendiente, en imperativo ("Elegí tu carrera"). */
  pendiente: string;
  /** Texto cuando ya está hecho. */
  hecho: string;
  cumplido: boolean;
  peso: number;
}

export interface Completitud {
  /** Entero de 0 a 100. */
  porcentaje: number;
  items: ItemCompletitud[];
  faltantes: ItemCompletitud[];
}

function resumir(items: ItemCompletitud[]): Completitud {
  const total = items.reduce((suma, i) => suma + i.peso, 0);
  const logrado = items.reduce((suma, i) => suma + (i.cumplido ? i.peso : 0), 0);
  return {
    porcentaje: total === 0 ? 0 : Math.round((logrado / total) * 100),
    items,
    faltantes: items.filter((i) => !i.cumplido),
  };
}

const lleno = (texto: string) => texto.trim().length > 0;

function pendienteTecnologias(cantidad: number): string {
  const faltan = 3 - cantidad;
  if (cantidad === 0) return "Sumá al menos 3 tecnologías con su nivel";
  return `Sumá ${faltan} tecnología${faltan === 1 ? "" : "s"} más`;
}

export function completitudEstudiante(v: ValoresEstudiante): Completitud {
  return resumir([
    { clave: "carrera", peso: 10, cumplido: lleno(v.idCarrera), pendiente: "Elegí tu carrera", hecho: "Carrera elegida" },
    { clave: "anio", peso: 10, cumplido: lleno(v.anioCursada), pendiente: "Elegí tu año de cursada", hecho: "Año de cursada" },
    { clave: "horas", peso: 10, cumplido: lleno(v.horasSemanales), pendiente: "Indicá tus horas semanales", hecho: "Horas semanales" },
    {
      clave: "tecnologias",
      peso: 25,
      cumplido: v.tecnologias.length >= 3,
      pendiente: pendienteTecnologias(v.tecnologias.length),
      hecho: "Tecnologías cargadas",
    },
    {
      clave: "descripcion",
      peso: 15,
      cumplido: v.descripcion.trim().length >= 40,
      pendiente: "Contá en unas líneas qué sabés hacer y qué te interesa",
      hecho: "Descripción personal",
    },
    { clave: "previos", peso: 10, cumplido: lleno(v.proyectosPrevios), pendiente: "Contá tus proyectos previos", hecho: "Proyectos previos" },
    { clave: "materias", peso: 10, cumplido: v.materiasAprobadas.length > 0, pendiente: "Marcá las materias que aprobaste", hecho: "Materias aprobadas" },
    { clave: "habilidades", peso: 5, cumplido: v.habilidades.length > 0, pendiente: "Sumá alguna habilidad", hecho: "Habilidades" },
    {
      clave: "enlaces",
      peso: 5,
      cumplido: lleno(v.githubUrl) || lleno(v.portfolioUrl) || lleno(v.cvUrl),
      pendiente: "Agregá tu GitHub, portfolio o CV",
      hecho: "Enlaces a tu trabajo",
    },
  ]);
}

export function completitudEmpresa(v: ValoresEmpresa): Completitud {
  return resumir([
    { clave: "nombre", peso: 25, cumplido: lleno(v.nombreEmpresa), pendiente: "Ingresá el nombre de la empresa", hecho: "Nombre de la empresa" },
    { clave: "sector", peso: 25, cumplido: lleno(v.sector), pendiente: "Indicá el sector o rubro", hecho: "Sector" },
    { clave: "contacto", peso: 25, cumplido: lleno(v.contacto), pendiente: "Agregá un dato de contacto", hecho: "Contacto" },
    { clave: "descripcion", peso: 15, cumplido: v.descripcion.trim().length >= 40, pendiente: "Contá a qué se dedica la empresa", hecho: "Descripción" },
    { clave: "sitio", peso: 10, cumplido: lleno(v.sitioWeb), pendiente: "Agregá el sitio web", hecho: "Sitio web" },
  ]);
}

export function completitudDocente(v: ValoresDocente): Completitud {
  return resumir([
    { clave: "catedra", peso: 40, cumplido: lleno(v.catedra), pendiente: "Ingresá tu cátedra", hecho: "Cátedra" },
    { clave: "area", peso: 30, cumplido: lleno(v.areaInvestigacion), pendiente: "Indicá tu área de investigación", hecho: "Área de investigación" },
    { clave: "descripcion", peso: 30, cumplido: v.descripcion.trim().length >= 40, pendiente: "Contá en qué trabajás", hecho: "Descripción" },
  ]);
}

/** Completitud a partir del perfil guardado (para el panel). Administradores no tienen perfil: `null`. */
export function completitudDePerfil(rol: Rol, perfil: Perfil | null): Completitud | null {
  switch (rol) {
    case "estudiante":
      return completitudEstudiante(valoresDesdeEstudiante(esPerfilEstudiante(perfil) ? perfil : null));
    case "empresa":
      return completitudEmpresa(esPerfilEmpresa(perfil) ? valoresDesdeEmpresa(perfil) : EMPRESA_VACIA);
    case "docente":
      return completitudDocente(esPerfilDocente(perfil) ? valoresDesdeDocente(perfil) : DOCENTE_VACIO);
    case "administrador":
      return null;
  }
}
