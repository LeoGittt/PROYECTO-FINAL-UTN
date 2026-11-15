import { textoONull } from "@/lib/forms";
import type {
  NivelTecnologia,
  PerfilDocente,
  PerfilDocenteInput,
  PerfilEmpresa,
  PerfilEmpresaInput,
  PerfilEstudiante,
  PerfilEstudianteInput,
} from "@/lib/api/types";

/**
 * Valores de los formularios de perfil (todo texto, como lo edita la persona) y su
 * conversión al cuerpo de `PUT /perfil` del contrato.
 */

export interface TecnologiaElegida {
  idTecnologia: number;
  nivel: NivelTecnologia;
}

export interface ValoresEstudiante {
  idCarrera: string;
  anioCursada: string;
  horasSemanales: string;
  descripcion: string;
  proyectosPrevios: string;
  cvUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  tecnologias: TecnologiaElegida[];
  habilidades: number[];
  materiasAprobadas: number[];
}

export const ESTUDIANTE_VACIO: ValoresEstudiante = {
  idCarrera: "",
  anioCursada: "",
  horasSemanales: "",
  descripcion: "",
  proyectosPrevios: "",
  cvUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  tecnologias: [],
  habilidades: [],
  materiasAprobadas: [],
};

export function valoresDesdeEstudiante(perfil: PerfilEstudiante | null | undefined): ValoresEstudiante {
  if (!perfil) return ESTUDIANTE_VACIO;
  return {
    idCarrera: String(perfil.idCarrera),
    anioCursada: String(perfil.anioCursada),
    horasSemanales: String(perfil.horasSemanales),
    descripcion: perfil.descripcion ?? "",
    proyectosPrevios: perfil.proyectosPrevios ?? "",
    cvUrl: perfil.cvUrl ?? "",
    githubUrl: perfil.githubUrl ?? "",
    portfolioUrl: perfil.portfolioUrl ?? "",
    tecnologias: perfil.tecnologias.map((t) => ({ idTecnologia: t.idTecnologia, nivel: t.nivel })),
    habilidades: perfil.habilidades.map((h) => h.idHabilidad),
    materiasAprobadas: perfil.materiasAprobadas.map((m) => m.idMateria),
  };
}

/** Cuerpo de `PUT /perfil` para estudiantes. Los textos opcionales vacíos viajan como `null`. */
export function payloadEstudiante(valores: ValoresEstudiante): PerfilEstudianteInput {
  return {
    idCarrera: Number(valores.idCarrera),
    anioCursada: Number(valores.anioCursada),
    horasSemanales: Number(valores.horasSemanales),
    descripcion: textoONull(valores.descripcion),
    proyectosPrevios: textoONull(valores.proyectosPrevios),
    cvUrl: textoONull(valores.cvUrl),
    githubUrl: textoONull(valores.githubUrl),
    portfolioUrl: textoONull(valores.portfolioUrl),
    tecnologias: valores.tecnologias.map((t) => ({ idTecnologia: t.idTecnologia, nivel: t.nivel })),
    habilidades: [...valores.habilidades],
    materiasAprobadas: [...valores.materiasAprobadas],
  };
}

// --- Empresa -----------------------------------------------------------------

export interface ValoresEmpresa {
  nombreEmpresa: string;
  sector: string;
  descripcion: string;
  contacto: string;
  sitioWeb: string;
}

export const EMPRESA_VACIA: ValoresEmpresa = {
  nombreEmpresa: "",
  sector: "",
  descripcion: "",
  contacto: "",
  sitioWeb: "",
};

export function valoresDesdeEmpresa(perfil: PerfilEmpresa | null | undefined): ValoresEmpresa {
  if (!perfil) return EMPRESA_VACIA;
  return {
    nombreEmpresa: perfil.nombreEmpresa,
    sector: perfil.sector,
    descripcion: perfil.descripcion ?? "",
    contacto: perfil.contacto,
    sitioWeb: perfil.sitioWeb ?? "",
  };
}

export function payloadEmpresa(valores: ValoresEmpresa): PerfilEmpresaInput {
  return {
    nombreEmpresa: valores.nombreEmpresa.trim(),
    sector: valores.sector.trim(),
    descripcion: textoONull(valores.descripcion),
    contacto: valores.contacto.trim(),
    sitioWeb: textoONull(valores.sitioWeb),
  };
}

// --- Docente -----------------------------------------------------------------

export interface ValoresDocente {
  catedra: string;
  areaInvestigacion: string;
  descripcion: string;
}

export const DOCENTE_VACIO: ValoresDocente = { catedra: "", areaInvestigacion: "", descripcion: "" };

export function valoresDesdeDocente(perfil: PerfilDocente | null | undefined): ValoresDocente {
  if (!perfil) return DOCENTE_VACIO;
  return {
    catedra: perfil.catedra,
    areaInvestigacion: perfil.areaInvestigacion ?? "",
    descripcion: perfil.descripcion ?? "",
  };
}

export function payloadDocente(valores: ValoresDocente): PerfilDocenteInput {
  return {
    catedra: valores.catedra.trim(),
    areaInvestigacion: textoONull(valores.areaInvestigacion),
    descripcion: textoONull(valores.descripcion),
  };
}
