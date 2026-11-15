import { describe, expect, it } from "vitest";
import { bandaDePuntaje, normalizarPuntaje, puntajeAPorcentaje } from "./score";

describe("normalizarPuntaje", () => {
  it("deja pasar los valores válidos y limita el resto a [0, 1]", () => {
    expect(normalizarPuntaje(0.3)).toBe(0.3);
    expect(normalizarPuntaje(7)).toBe(1);
    expect(normalizarPuntaje(-7)).toBe(0);
  });

  it("devuelve null cuando no hay un número finito", () => {
    expect(normalizarPuntaje(null)).toBeNull();
    expect(normalizarPuntaje(undefined)).toBeNull();
    expect(normalizarPuntaje(Number.NaN)).toBeNull();
    expect(normalizarPuntaje(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("puntajeAPorcentaje", () => {
  it("redondea a entero entre 0 y 100", () => {
    expect(puntajeAPorcentaje(0.826)).toBe(83);
    expect(puntajeAPorcentaje(1.5)).toBe(100);
    expect(puntajeAPorcentaje(-1)).toBe(0);
    expect(puntajeAPorcentaje(null)).toBeNull();
  });
});

describe("bandaDePuntaje", () => {
  it("usa los umbrales 0,75 y 0,5 (inclusivos)", () => {
    expect(bandaDePuntaje(0.75)).toBe("alta");
    expect(bandaDePuntaje(0.7499)).toBe("media");
    expect(bandaDePuntaje(0.5)).toBe("media");
    expect(bandaDePuntaje(0.4999)).toBe("baja");
    expect(bandaDePuntaje(undefined)).toBeNull();
  });
});
