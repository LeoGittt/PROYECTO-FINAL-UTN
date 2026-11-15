import type { DetalleError } from '../../compartido/dominio/errores.js';
import type { DatosPerfilEstudiante } from './perfil.js';

/** Lo que el catálogo (M5) respondió sobre los ids que trae el perfil. */
export interface CatalogoParaValidar {
  carrera: { idCarrera: number; duracionAnios: number } | null;
  /** Las materias que existen, entre las pedidas. */
  materias: ReadonlyArray<{ idMateria: number; idCarrera: number }>;
  /** Los ids de tecnologías que existen, entre las pedidas. */
  idsTecnologiasExistentes: ReadonlySet<number>;
  /** Los ids de habilidades que existen, entre las pedidas. */
  idsHabilidadesExistentes: ReadonlySet<number>;
}

/**
 * Reglas de negocio del perfil de estudiante (RF-09, docs/api/CONTRATO.md, sección 2):
 *  - la carrera existe;
 *  - `anioCursada` no supera la duración de la carrera;
 *  - las materias aprobadas existen y son de esa carrera;
 *  - las tecnologías y habilidades existen en el catálogo.
 * Es una función pura: devuelve un detalle por cada regla violada (lista vacía si todo está bien).
 */
export function validarReglasPerfilEstudiante(
  datos: DatosPerfilEstudiante,
  catalogo: CatalogoParaValidar,
): DetalleError[] {
  const detalles: DetalleError[] = [];

  if (!catalogo.carrera) {
    detalles.push({ campo: 'idCarrera', mensaje: 'La carrera indicada no existe' });
  } else if (datos.anioCursada > catalogo.carrera.duracionAnios) {
    detalles.push({
      campo: 'anioCursada',
      mensaje: `El año de cursada (${datos.anioCursada}) supera la duración de la carrera (${catalogo.carrera.duracionAnios} ${catalogo.carrera.duracionAnios === 1 ? 'año' : 'años'})`,
    });
  }

  const materiasPorId = new Map(
    catalogo.materias.map((materia) => [materia.idMateria, materia]),
  );
  const inexistentes = datos.materiasAprobadas.filter(
    (id) => !materiasPorId.has(id),
  );
  if (inexistentes.length > 0) {
    detalles.push({
      campo: 'materiasAprobadas',
      mensaje: `Las materias con id ${inexistentes.join(', ')} no existen`,
    });
  }
  if (catalogo.carrera) {
    const deOtraCarrera = datos.materiasAprobadas.filter(
      (id) =>
        materiasPorId.has(id) &&
        materiasPorId.get(id)?.idCarrera !== datos.idCarrera,
    );
    if (deOtraCarrera.length > 0) {
      detalles.push({
        campo: 'materiasAprobadas',
        mensaje: `Las materias con id ${deOtraCarrera.join(', ')} no pertenecen a la carrera elegida`,
      });
    }
  }

  const tecnologiasInexistentes = datos.tecnologias
    .map((t) => t.idTecnologia)
    .filter((id) => !catalogo.idsTecnologiasExistentes.has(id));
  if (tecnologiasInexistentes.length > 0) {
    detalles.push({
      campo: 'tecnologias',
      mensaje: `Las tecnologías con id ${tecnologiasInexistentes.join(', ')} no existen`,
    });
  }

  const habilidadesInexistentes = datos.habilidades.filter(
    (id) => !catalogo.idsHabilidadesExistentes.has(id),
  );
  if (habilidadesInexistentes.length > 0) {
    detalles.push({
      campo: 'habilidades',
      mensaje: `Las habilidades con id ${habilidadesInexistentes.join(', ')} no existen`,
    });
  }

  return detalles;
}
