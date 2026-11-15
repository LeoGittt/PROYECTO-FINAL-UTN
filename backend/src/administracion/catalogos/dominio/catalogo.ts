/**
 * M5 / catálogos: carreras, materias, tecnologías y habilidades. Es la base de la que
 * dependen M1 (perfiles) y M2 (proyectos); no depende de ningún otro módulo.
 */

/** Coincide con el tipo enumerado `categoria_tecnologia`. */
export const CATEGORIAS_TECNOLOGIA = [
  'lenguaje',
  'frontend',
  'backend',
  'base_de_datos',
  'devops',
  'datos',
  'mobile',
  'hardware',
] as const;
export type CategoriaTecnologia = (typeof CATEGORIAS_TECNOLOGIA)[number];

export interface CarreraDto {
  idCarrera: number;
  nombre: string;
  duracionAnios: number;
}

export interface MateriaDto {
  idMateria: number;
  idCarrera: number;
  nombre: string;
  anioPlan: number;
  /** `null` = materia anual. */
  cuatrimestre: number | null;
}

export interface TecnologiaDto {
  idTecnologia: number;
  nombre: string;
  categoria: CategoriaTecnologia;
  descripcion: string | null;
}

export interface HabilidadDto {
  idHabilidad: number;
  nombre: string;
  descripcion: string | null;
}

export interface DatosTecnologia {
  nombre: string;
  categoria: CategoriaTecnologia;
  descripcion: string | null;
}

/** Lo que el dominio necesita de la persistencia de catálogos. */
export interface CatalogosRepository {
  listarCarreras(): Promise<CarreraDto[]>;
  obtenerCarrera(idCarrera: number): Promise<CarreraDto | null>;
  listarMaterias(idCarrera?: number): Promise<MateriaDto[]>;
  obtenerMaterias(ids: readonly number[]): Promise<MateriaDto[]>;
  listarTecnologias(): Promise<TecnologiaDto[]>;
  obtenerTecnologias(ids: readonly number[]): Promise<TecnologiaDto[]>;
  listarHabilidades(): Promise<HabilidadDto[]>;
  obtenerHabilidades(ids: readonly number[]): Promise<HabilidadDto[]>;
  /** Lanza `ErrorConflicto` si ya existe una tecnología con ese nombre (sin distinguir mayúsculas). */
  crearTecnologia(datos: DatosTecnologia): Promise<TecnologiaDto>;
  /** Devuelve `null` si no existe. Lanza `ErrorConflicto` si el nombre ya lo usa otra tecnología. */
  actualizarTecnologia(
    idTecnologia: number,
    datos: DatosTecnologia,
  ): Promise<TecnologiaDto | null>;
}

export const CATALOGOS_REPOSITORY = Symbol('CATALOGOS_REPOSITORY');
