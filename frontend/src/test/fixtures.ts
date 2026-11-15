import type {
  Carrera,
  Habilidad,
  Materia,
  PerfilDocente,
  PerfilEmpresa,
  PerfilEstudiante,
  Tecnologia,
  Usuario,
} from "@/lib/api/types";

/** Datos de prueba con la forma de docs/api/CONTRATO.md. Solo los usan los tests. */

export const CARRERAS: Carrera[] = [
  { idCarrera: 1, nombre: "Tecnicatura Universitaria en Programación", duracionAnios: 2 },
  { idCarrera: 2, nombre: "Ingeniería en Sistemas de Información", duracionAnios: 5 },
];

export const MATERIAS: Materia[] = [
  { idMateria: 10, idCarrera: 1, nombre: "Programación I", anioPlan: 1, cuatrimestre: 1 },
  { idMateria: 11, idCarrera: 1, nombre: "Bases de Datos", anioPlan: 2, cuatrimestre: 1 },
  { idMateria: 20, idCarrera: 2, nombre: "Algoritmos y Estructuras de Datos", anioPlan: 1, cuatrimestre: null },
];

export const TECNOLOGIAS: Tecnologia[] = [
  { idTecnologia: 3, nombre: "React", categoria: "frontend", descripcion: null },
  { idTecnologia: 4, nombre: "Node.js", categoria: "backend", descripcion: null },
  { idTecnologia: 5, nombre: "PostgreSQL", categoria: "base_de_datos", descripcion: null },
];

export const HABILIDADES: Habilidad[] = [
  { idHabilidad: 1, nombre: "Trabajo en equipo", descripcion: null },
  { idHabilidad: 2, nombre: "Comunicación", descripcion: null },
];

export const PERFIL_ESTUDIANTE: PerfilEstudiante = {
  idEstudiante: 1,
  idCarrera: 1,
  anioCursada: 2,
  horasSemanales: 10,
  descripcion: "Me gusta el desarrollo web y quiero sumar experiencia en proyectos reales.",
  proyectosPrevios: "Un sitio de turnos para un club.",
  cvUrl: null,
  githubUrl: "https://github.com/ana",
  portfolioUrl: null,
  carrera: CARRERAS[0],
  tecnologias: [
    { idTecnologia: 3, nombre: "React", categoria: "frontend", nivel: "intermedio" },
    { idTecnologia: 4, nombre: "Node.js", categoria: "backend", nivel: "basico" },
    { idTecnologia: 5, nombre: "PostgreSQL", categoria: "base_de_datos", nivel: "basico" },
  ],
  habilidades: [{ idHabilidad: 1, nombre: "Trabajo en equipo" }],
  materiasAprobadas: [{ idMateria: 10, nombre: "Programación I", anioPlan: 1 }],
};

export const PERFIL_EMPRESA: PerfilEmpresa = {
  idEmpresa: 1,
  nombreEmpresa: "Acme SA",
  sector: "Software y servicios IT",
  descripcion: "Desarrollamos software a medida para pymes industriales de la región.",
  contacto: "rrhh@acme.com",
  sitioWeb: "https://www.acme.com",
};

export const PERFIL_DOCENTE: PerfilDocente = {
  idDocente: 1,
  catedra: "Programación III",
  areaInvestigacion: "Ingeniería de software",
  descripcion: "Enseño programación y dirijo trabajos finales de la tecnicatura.",
};

export const USUARIO_ESTUDIANTE: Usuario = {
  idUsuario: 7,
  nombre: "Ana",
  apellido: "Pérez",
  email: "ana@utn.edu.ar",
  rol: "estudiante",
  activo: true,
  perfilCompleto: false,
};
