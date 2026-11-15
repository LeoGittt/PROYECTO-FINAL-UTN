import { describe, expect, it } from "vitest";
import { PERFIL_DOCENTE, PERFIL_EMPRESA, PERFIL_ESTUDIANTE } from "@/test/fixtures";
import {
  DOCENTE_VACIO,
  EMPRESA_VACIA,
  ESTUDIANTE_VACIO,
  payloadDocente,
  payloadEmpresa,
  payloadEstudiante,
  valoresDesdeDocente,
  valoresDesdeEmpresa,
  valoresDesdeEstudiante,
} from "./valores";

describe("payloadEstudiante (cuerpo de PUT /perfil)", () => {
  it("convierte los textos del formulario a números y arma tecnologías, habilidades y materias como ids", () => {
    const payload = payloadEstudiante({
      ...ESTUDIANTE_VACIO,
      idCarrera: "1",
      anioCursada: "2",
      horasSemanales: "12",
      descripcion: "  Me gusta la web  ",
      githubUrl: "https://github.com/ana",
      tecnologias: [
        { idTecnologia: 3, nivel: "intermedio" },
        { idTecnologia: 4, nivel: "avanzado" },
      ],
      habilidades: [1, 2],
      materiasAprobadas: [10],
    });

    expect(payload).toEqual({
      idCarrera: 1,
      anioCursada: 2,
      horasSemanales: 12,
      descripcion: "Me gusta la web",
      proyectosPrevios: null,
      cvUrl: null,
      githubUrl: "https://github.com/ana",
      portfolioUrl: null,
      tecnologias: [
        { idTecnologia: 3, nivel: "intermedio" },
        { idTecnologia: 4, nivel: "avanzado" },
      ],
      habilidades: [1, 2],
      materiasAprobadas: [10],
    });
  });

  it("los textos opcionales vacíos viajan como null y no como cadena vacía", () => {
    const payload = payloadEstudiante({ ...ESTUDIANTE_VACIO, idCarrera: "1", anioCursada: "1", horasSemanales: "5", descripcion: "   " });
    expect(payload.descripcion).toBeNull();
    expect(payload.proyectosPrevios).toBeNull();
    expect(payload.cvUrl).toBeNull();
    expect(payload.githubUrl).toBeNull();
    expect(payload.portfolioUrl).toBeNull();
  });

  it("guardar un perfil sin tocarlo reenvía lo mismo que se recibió (ida y vuelta)", () => {
    const { carrera, idEstudiante, ...esperado } = PERFIL_ESTUDIANTE;
    void carrera;
    void idEstudiante;
    expect(payloadEstudiante(valoresDesdeEstudiante(PERFIL_ESTUDIANTE))).toEqual({
      ...esperado,
      tecnologias: [
        { idTecnologia: 3, nivel: "intermedio" },
        { idTecnologia: 4, nivel: "basico" },
        { idTecnologia: 5, nivel: "basico" },
      ],
      habilidades: [1],
      materiasAprobadas: [10],
    });
  });

  it("el payload no comparte arreglos con el estado del formulario", () => {
    const valores = { ...ESTUDIANTE_VACIO, habilidades: [1], materiasAprobadas: [10] };
    const payload = payloadEstudiante(valores);
    payload.habilidades.push(99);
    expect(valores.habilidades).toEqual([1]);
  });
});

describe("payloadEmpresa", () => {
  it("recorta los obligatorios y manda null para los opcionales vacíos", () => {
    expect(
      payloadEmpresa({ nombreEmpresa: " Acme SA ", sector: " IT ", contacto: " rrhh@acme.com ", descripcion: "", sitioWeb: " " }),
    ).toEqual({ nombreEmpresa: "Acme SA", sector: "IT", contacto: "rrhh@acme.com", descripcion: null, sitioWeb: null });
  });

  it("ida y vuelta con el perfil guardado", () => {
    const { idEmpresa, ...esperado } = PERFIL_EMPRESA;
    void idEmpresa;
    expect(payloadEmpresa(valoresDesdeEmpresa(PERFIL_EMPRESA))).toEqual(esperado);
  });

  it("sin perfil guardado, el formulario arranca vacío", () => {
    expect(valoresDesdeEmpresa(null)).toEqual(EMPRESA_VACIA);
  });
});

describe("payloadDocente", () => {
  it("recorta la cátedra y manda null para lo opcional vacío", () => {
    expect(payloadDocente({ catedra: " Programación III ", areaInvestigacion: "", descripcion: "  " })).toEqual({
      catedra: "Programación III",
      areaInvestigacion: null,
      descripcion: null,
    });
  });

  it("ida y vuelta con el perfil guardado", () => {
    const { idDocente, ...esperado } = PERFIL_DOCENTE;
    void idDocente;
    expect(payloadDocente(valoresDesdeDocente(PERFIL_DOCENTE))).toEqual(esperado);
  });

  it("sin perfil guardado, el formulario arranca vacío", () => {
    expect(valoresDesdeDocente(null)).toEqual(DOCENTE_VACIO);
  });
});
