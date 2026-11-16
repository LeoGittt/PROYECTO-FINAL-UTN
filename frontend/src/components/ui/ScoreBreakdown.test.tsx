import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreBreakdown } from "./ScoreBreakdown";

function fila(etiqueta: string) {
  return screen.getByText(etiqueta).closest("li") as HTMLElement;
}

describe("ScoreBreakdown", () => {
  it("lista los tres componentes con su valor en texto", () => {
    render(<ScoreBreakdown puntajes={{ tecnologias: 0.9, texto: 0.42, contexto: 1 }} />);

    const lista = screen.getByRole("list", { name: "Desglose de la compatibilidad" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(3);
    expect(within(fila("Tecnologías")).getByText("90 %")).toBeInTheDocument();
    expect(within(fila("Texto")).getByText("42 %")).toBeInTheDocument();
    expect(within(fila("Contexto")).getByText("100 %")).toBeInTheDocument();
  });

  it("limita los valores fuera de rango", () => {
    render(<ScoreBreakdown puntajes={{ tecnologias: 3, texto: -2, contexto: 0.5 }} />);

    expect(within(fila("Tecnologías")).getByText("100 %")).toBeInTheDocument();
    expect(within(fila("Texto")).getByText("0 %")).toBeInTheDocument();
    expect(within(fila("Contexto")).getByText("50 %")).toBeInTheDocument();
  });

  it("limita también el ancho visual de la barra", () => {
    const { container } = render(<ScoreBreakdown puntajes={{ tecnologias: 4, texto: -1, contexto: 0.25 }} />);
    const anchos = Array.from(container.querySelectorAll<HTMLElement>("[style]")).map((el) => el.style.width);
    // Nunca por fuera de 0 % y 100 %, aunque el valor recibido sí lo esté.
    expect(anchos).toEqual(["100%", "0%", "25%"]);
  });

  it("explica que un componente sin dato no se evalúa, en lugar de mostrar 0 %", () => {
    render(<ScoreBreakdown puntajes={{ tecnologias: 0.8, texto: null }} />);

    expect(within(fila("Texto")).getByText("No se evalúa en esta configuración")).toBeInTheDocument();
    expect(within(fila("Contexto")).getByText("No se evalúa")).toBeInTheDocument();
    expect(within(fila("Texto")).queryByText(/%/)).not.toBeInTheDocument();
  });

  it("trata NaN como sin dato", () => {
    render(<ScoreBreakdown puntajes={{ tecnologias: Number.NaN, texto: 0.5, contexto: 0.5 }} />);
    expect(within(fila("Tecnologías")).getByText("No se evalúa")).toBeInTheDocument();
  });

  it("muestra la ayuda de cada componente solo cuando se pide", () => {
    const { rerender } = render(<ScoreBreakdown puntajes={{ tecnologias: 1, texto: 1, contexto: 1 }} />);
    expect(screen.queryByText(/Parecido entre tu descripción/)).not.toBeInTheDocument();

    rerender(<ScoreBreakdown puntajes={{ tecnologias: 1, texto: 1, contexto: 1 }} mostrarAyuda />);
    expect(screen.getByText(/Parecido entre tu descripción/)).toBeInTheDocument();
  });

  it("las barras son decorativas: el valor ya está en el texto de cada fila", () => {
    const { container } = render(<ScoreBreakdown puntajes={{ tecnologias: 0.5, texto: 0.5, contexto: 0.5 }} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });
});
