import { describe, expect, it } from 'vitest';
import type {
  CarreraDto,
  HabilidadDto,
  MateriaDto,
  TecnologiaDto,
} from '../../administracion/catalogos/dominio/catalogo.js';
import {
  construirPerfilEstudianteDto,
  type DatosPerfilEstudiante,
  type RegistroEstudiante,
} from './perfil.js';
import { type CatalogoParaValidar, validarReglasPerfilEstudiante } from './reglas-perfil.js';

const datosBase: DatosPerfilEstudiante = {
  idCarrera: 1,
  anioCursada: 2,
  horasSemanales: 10,
  descripcion: null,
  proyectosPrevios: null,
  cvUrl: null,
  githubUrl: null,
  portfolioUrl: null,
  tecnologias: [{ idTecnologia: 10, nivel: 'basico' }],
  habilidades: [100],
  materiasAprobadas: [1000],
};

const catalogoBase: CatalogoParaValidar = {
  carrera: { idCarrera: 1, duracionAnios: 2 },
  materias: [{ idMateria: 1000, idCarrera: 1 }],
  idsTecnologiasExistentes: new Set([10]),
  idsHabilidadesExistentes: new Set([100]),
};

describe('validarReglasPerfilEstudiante', () => {
  it('un perfil consistente con el catálogo no tiene problemas', () => {
    expect(validarReglasPerfilEstudiante(datosBase, catalogoBase)).toEqual([]);
  });

  it('acepta el último año de la carrera', () => {
    expect(
      validarReglasPerfilEstudiante({ ...datosBase, anioCursada: 2 }, catalogoBase),
    ).toEqual([]);
  });

  it('rechaza un año de cursada mayor a la duración de la carrera (TUP dura 2 años)', () => {
    const detalles = validarReglasPerfilEstudiante(
      { ...datosBase, anioCursada: 3 },
      catalogoBase,
    );
    expect(detalles).toEqual([
      {
        campo: 'anioCursada',
        mensaje: 'El año de cursada (3) supera la duración de la carrera (2 años)',
      },
    ]);
  });

  it('usa el singular para una carrera de un año', () => {
    const detalles = validarReglasPerfilEstudiante(
      { ...datosBase, anioCursada: 2, materiasAprobadas: [] },
      { ...catalogoBase, carrera: { idCarrera: 1, duracionAnios: 1 } },
    );
    expect(detalles[0].mensaje).toContain('(1 año)');
  });

  it('si la carrera no existe lo dice y no opina sobre el año ni sobre las materias de otra carrera', () => {
    const detalles = validarReglasPerfilEstudiante(datosBase, {
      ...catalogoBase,
      carrera: null,
    });
    expect(detalles).toEqual([{ campo: 'idCarrera', mensaje: 'La carrera indicada no existe' }]);
  });

  it('rechaza materias que no existen', () => {
    const detalles = validarReglasPerfilEstudiante(
      { ...datosBase, materiasAprobadas: [1000, 7777, 8888] },
      catalogoBase,
    );
    expect(detalles).toEqual([
      { campo: 'materiasAprobadas', mensaje: 'Las materias con id 7777, 8888 no existen' },
    ]);
  });

  it('rechaza materias de otra carrera', () => {
    const detalles = validarReglasPerfilEstudiante(
      { ...datosBase, materiasAprobadas: [1000, 2000] },
      {
        ...catalogoBase,
        materias: [
          { idMateria: 1000, idCarrera: 1 },
          { idMateria: 2000, idCarrera: 2 },
        ],
      },
    );
    expect(detalles).toEqual([
      {
        campo: 'materiasAprobadas',
        mensaje: 'Las materias con id 2000 no pertenecen a la carrera elegida',
      },
    ]);
  });

  it('rechaza tecnologías y habilidades que no existen en el catálogo', () => {
    const detalles = validarReglasPerfilEstudiante(
      {
        ...datosBase,
        tecnologias: [
          { idTecnologia: 10, nivel: 'avanzado' },
          { idTecnologia: 99, nivel: 'basico' },
        ],
        habilidades: [100, 555],
      },
      catalogoBase,
    );
    expect(detalles).toEqual([
      { campo: 'tecnologias', mensaje: 'Las tecnologías con id 99 no existen' },
      { campo: 'habilidades', mensaje: 'Las habilidades con id 555 no existen' },
    ]);
  });

  it('informa todas las reglas violadas juntas', () => {
    const detalles = validarReglasPerfilEstudiante(
      { ...datosBase, anioCursada: 6, materiasAprobadas: [1], tecnologias: [{ idTecnologia: 1, nivel: 'basico' }], habilidades: [1] },
      { ...catalogoBase, materias: [], idsTecnologiasExistentes: new Set(), idsHabilidadesExistentes: new Set() },
    );
    expect(detalles.map((d) => d.campo)).toEqual([
      'anioCursada',
      'materiasAprobadas',
      'tecnologias',
      'habilidades',
    ]);
  });
});

describe('construirPerfilEstudianteDto', () => {
  const carrera: CarreraDto = { idCarrera: 1, nombre: 'TUP', duracionAnios: 2 };
  const tecnologias: TecnologiaDto[] = [
    { idTecnologia: 1, nombre: 'TypeScript', categoria: 'lenguaje', descripcion: null },
    { idTecnologia: 2, nombre: 'Angular', categoria: 'frontend', descripcion: null },
  ];
  const habilidades: HabilidadDto[] = [
    { idHabilidad: 1, nombre: 'Trabajo en equipo', descripcion: null },
    { idHabilidad: 2, nombre: 'Comunicación', descripcion: null },
  ];
  const materias: MateriaDto[] = [
    { idMateria: 1, idCarrera: 1, nombre: 'Programación II', anioPlan: 2, cuatrimestre: 1 },
    { idMateria: 2, idCarrera: 1, nombre: 'Matemática', anioPlan: 1, cuatrimestre: null },
    { idMateria: 3, idCarrera: 1, nombre: 'Algoritmos', anioPlan: 1, cuatrimestre: 1 },
  ];
  const registro: RegistroEstudiante = {
    idEstudiante: 9,
    idUsuario: 4,
    idCarrera: 1,
    anioCursada: 2,
    horasSemanales: 12,
    descripcion: 'Hola',
    proyectosPrevios: null,
    cvUrl: null,
    githubUrl: 'https://github.com/x',
    portfolioUrl: null,
    nombre: 'Ana',
    apellido: 'Paz',
    email: 'ana@alumnos.utnmatch.test',
    activo: true,
    tecnologias: [
      { idTecnologia: 1, nivel: 'avanzado' },
      { idTecnologia: 2, nivel: 'basico' },
    ],
    habilidades: [1, 2],
    materiasAprobadas: [1, 2, 3],
  };

  it('une los ids del registro con los nombres del catálogo y ordena por nombre', () => {
    const dto = construirPerfilEstudianteDto(registro, { carrera, tecnologias, habilidades, materias });
    expect(dto.carrera).toEqual(carrera);
    expect(dto.tecnologias).toEqual([
      { idTecnologia: 2, nombre: 'Angular', categoria: 'frontend', nivel: 'basico' },
      { idTecnologia: 1, nombre: 'TypeScript', categoria: 'lenguaje', nivel: 'avanzado' },
    ]);
    expect(dto.habilidades.map((h) => h.nombre)).toEqual(['Comunicación', 'Trabajo en equipo']);
    // Primero el año del plan, y dentro del año por nombre.
    expect(dto.materiasAprobadas.map((m) => m.nombre)).toEqual([
      'Algoritmos',
      'Matemática',
      'Programación II',
    ]);
  });

  it('copia los datos propios del perfil y no expone nombre, apellido ni email', () => {
    const dto = construirPerfilEstudianteDto(registro, { carrera, tecnologias, habilidades, materias });
    expect(dto).toMatchObject({
      idEstudiante: 9,
      idCarrera: 1,
      anioCursada: 2,
      horasSemanales: 12,
      descripcion: 'Hola',
      githubUrl: 'https://github.com/x',
    });
    expect(dto).not.toHaveProperty('email');
    expect(dto).not.toHaveProperty('nombre');
    expect(dto).not.toHaveProperty('idUsuario');
  });

  it('ignora los ids que ya no están en el catálogo', () => {
    const dto = construirPerfilEstudianteDto(registro, {
      carrera,
      tecnologias: [tecnologias[0]],
      habilidades: [],
      materias: [],
    });
    expect(dto.tecnologias).toHaveLength(1);
    expect(dto.habilidades).toEqual([]);
    expect(dto.materiasAprobadas).toEqual([]);
  });
});
