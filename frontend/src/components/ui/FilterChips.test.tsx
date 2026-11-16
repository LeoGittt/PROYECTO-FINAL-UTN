import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterChips } from "./FilterChips";

const OPCIONES = [
  { valor: "todas", etiqueta: "Todas", contador: 5 },
  { valor: "activas", etiqueta: "Activas", contador: 3 },
  { valor: "cerradas", etiqueta: "Cerradas" },
] as const;

describe("FilterChips", () => {
  it("es un grupo con nombre y marca como presionada solo la opción elegida", () => {
    render(<FilterChips etiqueta="Filtrar por estado" opciones={[...OPCIONES]} valor="activas" alCambiar={vi.fn()} />);

    const grupo = screen.getByRole("group", { name: "Filtrar por estado" });
    expect(grupo).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Activas/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Todas/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("muestra el contador de cada opción dentro de su nombre accesible", () => {
    render(<FilterChips etiqueta="Estado" opciones={[...OPCIONES]} valor="todas" alCambiar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Todas 5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerradas" })).toBeInTheDocument();
  });

  it("informa el valor de la opción que se elige", async () => {
    const alCambiar = vi.fn();
    const usuario = userEvent.setup();
    render(<FilterChips etiqueta="Estado" opciones={[...OPCIONES]} valor="todas" alCambiar={alCambiar} />);

    await usuario.click(screen.getByRole("button", { name: "Cerradas" }));

    expect(alCambiar).toHaveBeenCalledWith("cerradas");
  });
});
