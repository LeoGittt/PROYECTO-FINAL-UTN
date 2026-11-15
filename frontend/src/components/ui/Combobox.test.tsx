import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox, type OpcionCombobox } from "./Combobox";

const OPCIONES: OpcionCombobox[] = [
  { valor: 1, etiqueta: "React", detalle: "Frontend" },
  { valor: 2, etiqueta: "Node.js", detalle: "Backend" },
  { valor: 3, etiqueta: "Análisis de datos" },
];

function montar(propiedades: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  const alElegir = vi.fn();
  render(<Combobox label="Agregar una tecnología" opciones={OPCIONES} alElegir={alElegir} {...propiedades} />);
  return { alElegir, usuario: userEvent.setup(), campo: screen.getByRole("combobox", { name: "Agregar una tecnología" }) };
}

describe("Combobox", () => {
  it("expone el patrón combobox: cerrado, con lista controlada y sin sugerencia activa", () => {
    const { campo } = montar();
    expect(campo).toHaveAttribute("aria-expanded", "false");
    expect(campo).toHaveAttribute("aria-autocomplete", "list");
    expect(campo).toHaveAttribute("aria-controls", expect.stringContaining("-lista"));
    expect(campo).not.toHaveAttribute("aria-activedescendant");
  });

  it("filtra al escribir, sin distinguir mayúsculas ni tildes", async () => {
    const { usuario, campo } = montar();

    await usuario.type(campo, "analisis");

    expect(campo).toHaveAttribute("aria-expanded", "true");
    const opciones = screen.getAllByRole("option");
    expect(opciones).toHaveLength(1);
    expect(opciones[0]).toHaveTextContent("Análisis de datos");
  });

  it("elige con el mouse, informa la opción y limpia el campo", async () => {
    const { usuario, campo, alElegir } = montar();
    await usuario.type(campo, "nod");

    await usuario.click(screen.getByRole("option", { name: /Node\.js/ }));

    expect(alElegir).toHaveBeenCalledWith(OPCIONES[1]);
    expect(campo).toHaveValue("");
    expect(campo).toHaveAttribute("aria-expanded", "false");
  });

  it("se maneja con teclado: flechas para recorrer, Enter para elegir, Escape para cerrar", async () => {
    const { usuario, campo, alElegir } = montar();
    await usuario.click(campo);

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(campo).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0].id);

    await usuario.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(campo).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[1].id);

    await usuario.keyboard("{Enter}");
    expect(alElegir).toHaveBeenCalledWith(OPCIONES[1]);

    await usuario.click(campo);
    await usuario.keyboard("{Escape}");
    expect(campo).toHaveAttribute("aria-expanded", "false");
  });

  it("no ofrece las opciones ya elegidas", async () => {
    const { usuario, campo } = montar({ excluidos: [1] });
    await usuario.click(campo);
    expect(screen.queryByRole("option", { name: /React/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("sin coincidencias lo dice, para que no parezca roto", async () => {
    const { usuario, campo } = montar();
    await usuario.type(campo, "zzz");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getAllByText("No hay coincidencias").length).toBeGreaterThan(0);
  });

  it("marca el campo como inválido y asocia el mensaje de error", () => {
    const { campo } = montar({ error: "Agregá al menos una tecnología." });
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("Agregá al menos una tecnología.");
  });
});
