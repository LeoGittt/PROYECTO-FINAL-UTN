import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifica numéricamente los pares de colores del sistema de diseño (WCAG 2.1 AA):
 * 4,5:1 para texto y 3:1 para bordes de controles, foco y gráficos. Lee los valores
 * reales de globals.css, así que cambiar un color sin revisar su contraste rompe este test.
 */

// Vitest corre desde la carpeta del paquete (frontend/).
const CSS = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

/** Contenido entre llaves del bloque que empieza donde termina `inicio`. */
function bloque(inicio: RegExp): string {
  const coincidencia = inicio.exec(CSS);
  if (!coincidencia) throw new Error(`No se encontró el bloque ${inicio}`);
  let profundidad = 1;
  let i = coincidencia.index + coincidencia[0].length;
  const desde = i;
  while (i < CSS.length && profundidad > 0) {
    if (CSS[i] === "{") profundidad++;
    else if (CSS[i] === "}") profundidad--;
    i++;
  }
  return CSS.slice(desde, i - 1);
}

function variables(contenido: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const [, nombre, valor] of contenido.matchAll(/--([a-z-]+):\s*([^;]+);/g)) resultado[nombre] = valor.trim();
  return resultado;
}

const CLARO = variables(bloque(/:root\s*\{/));
const OSCURO = variables(bloque(/:root\[data-theme="dark"\]\s*\{/));
const OSCURO_POR_PREFERENCIA = variables(
  bloque(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{/),
);

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

type Par = readonly [texto: string, fondo: string];

/** Texto (4,5:1). Cada par es algo que la interfaz realmente combina. */
const TEXTO: Par[] = [
  ["ink", "canvas"],
  ["ink", "surface"],
  ["ink", "sunken"],
  ["ink", "primary-soft"],
  ["muted", "canvas"],
  ["muted", "surface"],
  ["muted", "sunken"],
  ["muted", "primary-soft"],
  ["subtle", "canvas"],
  ["subtle", "surface"],
  ["on-primary", "primary"],
  ["on-primary", "primary-hover"],
  ["primary", "canvas"],
  ["primary", "surface"],
  ["primary-soft-ink", "primary-soft"],
  ["on-accent", "accent"],
  ["on-success", "success"],
  ["success-ink", "success-soft"],
  ["success-ink", "surface"],
  ["success-ink", "canvas"],
  ["on-warning", "warning"],
  ["warning-ink", "warning-soft"],
  ["warning-ink", "surface"],
  ["on-danger", "danger"],
  ["danger-ink", "danger-soft"],
  ["danger-ink", "surface"],
  ["danger-ink", "canvas"],
];

/** Elementos de interfaz y gráficos (3:1): bordes de campos, foco, aros y barras de puntaje. */
const COMPONENTES: Par[] = [
  ["line-strong", "surface"],
  ["line-strong", "canvas"],
  ["focus", "surface"],
  ["focus", "canvas"],
  ["success", "surface"],
  ["warning", "surface"],
  ["danger", "surface"],
  ["primary", "surface"],
];

const TEMAS = [
  ["claro", CLARO],
  ["oscuro (data-theme)", OSCURO],
] as const;

function valorDe(tema: Record<string, string>, nombre: string): string {
  const valor = tema[nombre];
  if (!valor || !/^#[0-9a-f]{6}$/i.test(valor)) throw new Error(`--${nombre} no es un color hexadecimal de 6 dígitos`);
  return valor;
}

describe.each(TEMAS)("contraste del tema %s", (_nombre, tema) => {
  it.each(TEXTO)("texto --%s sobre --%s cumple 4,5:1", (texto, fondo) => {
    expect(contraste(valorDe(tema, texto), valorDe(tema, fondo))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(COMPONENTES)("componente --%s sobre --%s cumple 3:1", (componente, fondo) => {
    expect(contraste(valorDe(tema, componente), valorDe(tema, fondo))).toBeGreaterThanOrEqual(3);
  });
});

describe("tema oscuro", () => {
  it("lo que se aplica por preferencia del sistema es idéntico a data-theme=dark", () => {
    // Son dos bloques porque CSS no permite compartir declaraciones entre un @media y un selector.
    const sinColorScheme = (t: Record<string, string>) => {
      const copia = { ...t };
      delete copia["color-scheme"];
      return copia;
    };
    expect(sinColorScheme(OSCURO_POR_PREFERENCIA)).toEqual(sinColorScheme(OSCURO));
  });

  it("define todos los colores que define el tema claro", () => {
    expect(Object.keys(OSCURO).sort()).toEqual(Object.keys(CLARO).sort());
  });
});

describe("la prueba mide lo que dice medir", () => {
  it("negro sobre blanco es 21:1 y un gris claro sobre blanco no llega a 4,5:1", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#aaaaaa", "#ffffff")).toBeLessThan(4.5);
  });
});
