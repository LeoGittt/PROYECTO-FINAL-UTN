import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreRing } from "./ScoreRing";

describe("ScoreRing", () => {
  it("expone el puntaje y la banda como texto accesible, no solo como color", () => {
    render(<ScoreRing valor={0.82} />);
    expect(screen.getByRole("img", { name: "Compatibilidad: 82 % (alta)" })).toBeInTheDocument();
  });

  it.each([
    [0.75, "75 % (alta)"],
    [0.74, "74 % (media)"],
    [0.5, "50 % (media)"],
    [0.49, "49 % (baja)"],
    [0, "0 % (baja)"],
  ])("clasifica %s como %s", (valor, esperado) => {
    render(<ScoreRing valor={valor} />);
    expect(screen.getByRole("img", { name: `Compatibilidad: ${esperado}` })).toBeInTheDocument();
  });

  it("limita los valores fuera de rango a 0 % y 100 %", () => {
    const { rerender } = render(<ScoreRing valor={1.7} />);
    expect(screen.getByRole("img", { name: "Compatibilidad: 100 % (alta)" })).toBeInTheDocument();

    rerender(<ScoreRing valor={-0.4} />);
    expect(screen.getByRole("img", { name: "Compatibilidad: 0 % (baja)" })).toBeInTheDocument();
  });

  it.each([null, undefined, Number.NaN])("dice que no hay dato cuando el valor es %s", (valor) => {
    render(<ScoreRing valor={valor} />);
    expect(screen.getByRole("img", { name: "Compatibilidad no disponible" })).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("redondea al entero más cercano", () => {
    render(<ScoreRing valor={0.826} />);
    expect(screen.getByRole("img", { name: "Compatibilidad: 83 % (alta)" })).toBeInTheDocument();
  });

  it("puede mostrar la banda en texto visible para quien ve la pantalla", () => {
    render(<ScoreRing valor={0.6} mostrarBanda />);
    expect(screen.getByText("Compatibilidad media")).toBeInTheDocument();
  });

  it("el dibujo del aro es decorativo y no se anuncia dos veces", () => {
    const { container } = render(<ScoreRing valor={0.9} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
