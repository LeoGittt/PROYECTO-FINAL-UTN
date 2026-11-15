import { describe, expect, it } from "vitest";
import { PERFIL_DOCENTE, PERFIL_EMPRESA, PERFIL_ESTUDIANTE } from "@/test/fixtures";
import {
  completitudDePerfil,
  completitudDocente,
  completitudEmpresa,
  completitudEstudiante,
} from "./completitud";
import {
  DOCENTE_VACIO,
  EMPRESA_VACIA,
  ESTUDIANTE_VACIO,
  valoresDesdeDocente,
  valoresDesdeEmpresa,
  valoresDesdeEstudiante,
} from "./valores";

describe("completitudEstudiante", () => {
  it("un formulario vacío está en 0 % y lista todo lo pendiente", () => {
    const c = completitudEstudiante(ESTUDIANTE_VACIO);
    expect(c.porcentaje).toBe(0);
    expect(c.faltantes).toHaveLength(c.items.length);
  });

  it("un perfil con todo cargado llega al 100 % sin pendientes", () => {
    const c = completitudEstudiante({
      ...valoresDesdeEstudiante(PERFIL_ESTUDIANTE),
      portfolioUrl: "https://ana.dev",
    });
    expect(c.porcentaje).toBe(100);
    expect(c.faltantes).toEqual([]);
  });

  it("los pesos suman 100", () => {
    const total = completitudEstudiante(ESTUDIANTE_VACIO).items.reduce((suma, i) => suma + i.peso, 0);
    expect(total).toBe(100);
  });

  it("las tecnologías pesan más que los enlaces y piden al menos tres", () => {
    const base = valoresDesdeEstudiante(PERFIL_ESTUDIANTE);
    const sinTecnologias = completitudEstudiante({ ...base, tecnologias: [] });
    const sinEnlaces = completitudEstudiante({ ...base, githubUrl: "" });

    expect(sinTecnologias.porcentaje).toBeLessThan(sinEnlaces.porcentaje);
    expect(sinTecnologias.faltantes[0].pendiente).toBe("Sumá al menos 3 tecnologías con su nivel");
  });

  it("dice cuántas tecnologías faltan, en singular o plural", () => {
    const base = valoresDesdeEstudiante(PERFIL_ESTUDIANTE);
    const dos = completitudEstudiante({ ...base, tecnologias: base.tecnologias.slice(0, 2) });
    const una = completitudEstudiante({ ...base, tecnologias: base.tecnologias.slice(0, 1) });

    expect(dos.faltantes.map((f) => f.pendiente)).toContain("Sumá 1 tecnología más");
    expect(una.faltantes.map((f) => f.pendiente)).toContain("Sumá 2 tecnologías más");
  });

  it("una descripción muy corta no cuenta como cargada", () => {
    const base = valoresDesdeEstudiante(PERFIL_ESTUDIANTE);
    const c = completitudEstudiante({ ...base, descripcion: "Hola" });
    expect(c.faltantes.map((f) => f.clave)).toContain("descripcion");
  });

  it("el indicador sube cuando se completa un dato (se calcula con lo que hay en el formulario)", () => {
    const antes = completitudEstudiante(ESTUDIANTE_VACIO).porcentaje;
    const despues = completitudEstudiante({ ...ESTUDIANTE_VACIO, idCarrera: "1" }).porcentaje;
    expect(despues).toBeGreaterThan(antes);
  });
});

describe("completitudEmpresa", () => {
  it("vacía: 0 %; completa: 100 %", () => {
    expect(completitudEmpresa(EMPRESA_VACIA).porcentaje).toBe(0);
    expect(completitudEmpresa(valoresDesdeEmpresa(PERFIL_EMPRESA)).porcentaje).toBe(100);
  });

  it("con solo los tres obligatorios queda en 75 %", () => {
    const c = completitudEmpresa({ ...EMPRESA_VACIA, nombreEmpresa: "Acme", sector: "IT", contacto: "a@b.com" });
    expect(c.porcentaje).toBe(75);
    expect(c.faltantes.map((f) => f.clave)).toEqual(["descripcion", "sitio"]);
  });
});

describe("completitudDocente", () => {
  it("vacío: 0 %; completo: 100 %", () => {
    expect(completitudDocente(DOCENTE_VACIO).porcentaje).toBe(0);
    expect(completitudDocente(valoresDesdeDocente(PERFIL_DOCENTE)).porcentaje).toBe(100);
  });
});

describe("completitudDePerfil (perfil guardado)", () => {
  it("sin perfil guardado devuelve 0 % para estudiante, empresa y docente", () => {
    expect(completitudDePerfil("estudiante", null)?.porcentaje).toBe(0);
    expect(completitudDePerfil("empresa", null)?.porcentaje).toBe(0);
    expect(completitudDePerfil("docente", null)?.porcentaje).toBe(0);
  });

  it("elige la regla según el rol", () => {
    expect(completitudDePerfil("empresa", PERFIL_EMPRESA)?.porcentaje).toBe(100);
    expect(completitudDePerfil("docente", PERFIL_DOCENTE)?.porcentaje).toBe(100);
  });

  it("si el rol y el perfil no coinciden, no explota y lo trata como vacío", () => {
    expect(completitudDePerfil("docente", PERFIL_EMPRESA)?.porcentaje).toBe(0);
  });

  it("los administradores no tienen perfil", () => {
    expect(completitudDePerfil("administrador", null)).toBeNull();
  });
});
