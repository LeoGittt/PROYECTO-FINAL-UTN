import { describe, expect, it } from "vitest";
import { pasosDeLinea, transicionesPermitidas } from "./estados";

describe("transicionesPermitidas (contrato 5.4)", () => {
  it("el publicador mueve una postulación pendiente a en revisión, entrevista o rechazada, nunca a retirada", () => {
    expect(transicionesPermitidas("pendiente", "publicador")).toEqual(["en_revision", "entrevista", "rechazada"]);
  });

  it("desde en revisión el publicador puede entrevistar, aceptar o rechazar", () => {
    expect(transicionesPermitidas("en_revision", "publicador")).toEqual(["entrevista", "aceptada", "rechazada"]);
  });

  it("desde entrevista el publicador puede aceptar o rechazar", () => {
    expect(transicionesPermitidas("entrevista", "publicador")).toEqual(["aceptada", "rechazada"]);
  });

  it("el estudiante solo puede retirar, y únicamente mientras la postulación sigue abierta", () => {
    for (const estado of ["pendiente", "en_revision", "entrevista"] as const) {
      expect(transicionesPermitidas(estado, "estudiante")).toEqual(["retirada"]);
    }
  });

  it.each(["aceptada", "rechazada", "retirada"] as const)("%s es un estado final: nadie puede moverlo", (estado) => {
    expect(transicionesPermitidas(estado, "publicador")).toEqual([]);
    expect(transicionesPermitidas(estado, "estudiante")).toEqual([]);
  });
});

describe("pasosDeLinea", () => {
  const resumen = (estado: Parameters<typeof pasosDeLinea>[0]) => pasosDeLinea(estado).map((p) => `${p.estado}:${p.situacion}`);

  it("una postulación pendiente marca el primer paso como actual y el resto como siguientes", () => {
    expect(resumen("pendiente")).toEqual(["pendiente:actual", "en_revision:siguiente", "entrevista:siguiente", "aceptada:siguiente"]);
  });

  it("los pasos anteriores al actual figuran como hechos", () => {
    expect(resumen("entrevista")).toEqual(["pendiente:hecho", "en_revision:hecho", "entrevista:actual", "aceptada:siguiente"]);
  });

  it("una postulación aceptada completa el camino", () => {
    expect(resumen("aceptada")).toEqual(["pendiente:hecho", "en_revision:hecho", "entrevista:hecho", "aceptada:actual"]);
  });

  it("una rechazada o retirada reemplaza el paso final por su desenlace", () => {
    expect(pasosDeLinea("rechazada").at(-1)).toMatchObject({ estado: "rechazada", etiqueta: "Rechazada", situacion: "actual" });
    expect(pasosDeLinea("retirada").at(-1)).toMatchObject({ estado: "retirada", etiqueta: "Retirada", situacion: "actual" });
  });
});
