import type {
  CarreraDto,
  HabilidadDto,
  MateriaDto,
  TecnologiaDto,
} from '../../administracion/catalogos/dominio/catalogo.js';

export const NIVELES_TECNOLOGIA = ['basico', 'intermedio', 'avanzado'] as const;
export type NivelTecnologia = (typeof NIVELES_TECNOLOGIA)[number];

// ---------------------------------------------------------------------------
// Datos que llegan en el PUT /perfil (ya validados en formato)
// ---------------------------------------------------------------------------

export interface DatosPerfilEstudiante {
  idCarrera: number;
  anioCursada: number;
  horasSemanales: number;
  descripcion: string | null;
  proyectosPrevios: string | null;
  cvUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  tecnologias: Array<{ idTecnologia: number; nivel: NivelTecnologia }>;
  habilidades: number[];
  materiasAprobadas: number[];
}

export interface DatosPerfilEmpresa {
  nombreEmpresa: string;
  sector: string;
  descripcion: string | null;
  contacto: string;
  sitioWeb: string | null;
}

export interface DatosPerfilDocente {
  catedra: string;
  areaInvestigacion: string | null;
  descripcion: string | null;
}

// ---------------------------------------------------------------------------
// Lo que lee el repositorio (solo ids: los nombres vienen del catálogo de M5)
// ---------------------------------------------------------------------------

export interface RegistroEstudiante {
  idEstudiante: number;
  idUsuario: number;
  idCarrera: number;
  anioCursada: number;
  horasSemanales: number;
  descripcion: string | null;
  proyectosPrevios: string | null;
  cvUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  tecnologias: Array<{ idTecnologia: number; nivel: NivelTecnologia }>;
  habilidades: number[];
  materiasAprobadas: number[];
}

// ---------------------------------------------------------------------------
// DTO que salen de M1 (CONTRATO.md, sección 2)
// ---------------------------------------------------------------------------

export interface PerfilEstudianteDto {
  idEstudiante: number;
  idCarrera: number;
  anioCursada: number;
  horasSemanales: number;
  descripcion: string | null;
  proyectosPrevios: string | null;
  cvUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  carrera: CarreraDto;
  tecnologias: Array<{
    idTecnologia: number;
    nombre: string;
    categoria: TecnologiaDto['categoria'];
    nivel: NivelTecnologia;
  }>;
  habilidades: Array<{ idHabilidad: number; nombre: string }>;
  materiasAprobadas: Array<{ idMateria: number; nombre: string; anioPlan: number }>;
}

export interface PerfilEmpresaDto {
  idEmpresa: number;
  nombreEmpresa: string;
  sector: string;
  descripcion: string | null;
  contacto: string;
  sitioWeb: string | null;
}

export interface PerfilDocenteDto {
  idDocente: number;
  catedra: string;
  areaInvestigacion: string | null;
  descripcion: string | null;
}

export type PerfilDto = PerfilEstudianteDto | PerfilEmpresaDto | PerfilDocenteDto;

/** `GET /estudiantes/:id`: el perfil más los datos de la persona. El email es opcional. */
export interface EstudiantePublicoDto extends PerfilEstudianteDto {
  nombre: string;
  apellido: string;
  email?: string;
}

/** Quién publica un proyecto: una empresa o un docente (docs/api/CONTRATO.md, sección 4). */
export interface PublicadorDto {
  tipo: 'empresa' | 'docente';
  /** Identificador del perfil (`idEmpresa` o `idDocente`). */
  id: number;
  /** Nombre de la empresa, o nombre y apellido del docente. */
  nombre: string;
  idUsuario: number;
}

/** Lo que necesita el motor de recomendación de un estudiante (ARQUITECTURA.md, 4.1). */
export interface PerfilMatchingDto {
  idEstudiante: number;
  idUsuario: number;
  anioCursada: number;
  horasSemanales: number;
  tecnologias: Array<{ idTecnologia: number; nombre: string; nivel: NivelTecnologia }>;
  descripcion: string | null;
  proyectosPrevios: string | null;
}

/** Resumen de un estudiante para listados de otros módulos (recomendados, postulantes). */
export interface EstudianteResumenDto {
  idEstudiante: number;
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  idCarrera: number;
  carrera: string;
  anioCursada: number;
  horasSemanales: number;
  /** `false` si la administración desactivó la cuenta. */
  activo: boolean;
  tecnologias: Array<{ idTecnologia: number; nombre: string; nivel: NivelTecnologia }>;
}

// ---------------------------------------------------------------------------
// Armado de DTO (funciones puras)
// ---------------------------------------------------------------------------

export interface CatalogoDelPerfil {
  carrera: CarreraDto;
  tecnologias: readonly TecnologiaDto[];
  habilidades: readonly HabilidadDto[];
  materias: readonly MateriaDto[];
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es');

/** Une el registro de M1 con los nombres del catálogo de M5 para armar el perfil del contrato. */
export function construirPerfilEstudianteDto(
  registro: RegistroEstudiante,
  catalogo: CatalogoDelPerfil,
): PerfilEstudianteDto {
  const tecnologiasPorId = new Map(
    catalogo.tecnologias.map((t) => [t.idTecnologia, t]),
  );
  const habilidadesPorId = new Map(
    catalogo.habilidades.map((h) => [h.idHabilidad, h]),
  );
  const materiasPorId = new Map(catalogo.materias.map((m) => [m.idMateria, m]));

  const tecnologias = registro.tecnologias.flatMap(({ idTecnologia, nivel }) => {
    const tecnologia = tecnologiasPorId.get(idTecnologia);
    return tecnologia
      ? [{ idTecnologia, nombre: tecnologia.nombre, categoria: tecnologia.categoria, nivel }]
      : [];
  });
  const habilidades = registro.habilidades.flatMap((idHabilidad) => {
    const habilidad = habilidadesPorId.get(idHabilidad);
    return habilidad ? [{ idHabilidad, nombre: habilidad.nombre }] : [];
  });
  const materiasAprobadas = registro.materiasAprobadas.flatMap((idMateria) => {
    const materia = materiasPorId.get(idMateria);
    return materia
      ? [{ idMateria, nombre: materia.nombre, anioPlan: materia.anioPlan }]
      : [];
  });

  return {
    idEstudiante: registro.idEstudiante,
    idCarrera: registro.idCarrera,
    anioCursada: registro.anioCursada,
    horasSemanales: registro.horasSemanales,
    descripcion: registro.descripcion,
    proyectosPrevios: registro.proyectosPrevios,
    cvUrl: registro.cvUrl,
    githubUrl: registro.githubUrl,
    portfolioUrl: registro.portfolioUrl,
    carrera: catalogo.carrera,
    tecnologias: tecnologias.sort(porNombre),
    habilidades: habilidades.sort(porNombre),
    materiasAprobadas: materiasAprobadas.sort(
      (a, b) => a.anioPlan - b.anioPlan || porNombre(a, b),
    ),
  };
}
