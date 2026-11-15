import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

function Ejemplo({ alCerrar = vi.fn() }: { alCerrar?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir</button>
      <Modal
        abierto={abierto}
        alCerrar={() => {
          alCerrar();
          setAbierto(false);
        }}
        titulo="Confirmar baja"
        descripcion="Esta acción no se puede deshacer."
        pie={<button data-autofocus>Confirmar</button>}
      >
        <input aria-label="Motivo" />
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("no dibuja nada mientras está cerrado", () => {
    render(<Ejemplo />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("al abrirse es un diálogo modal con título y descripción asociados", async () => {
    const usuario = userEvent.setup();
    render(<Ejemplo />);

    await usuario.click(screen.getByRole("button", { name: "Abrir" }));

    const dialogo = screen.getByRole("dialog", { name: "Confirmar baja" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleDescription("Esta acción no se puede deshacer.");
  });

  it("pone el foco en el elemento marcado con data-autofocus", async () => {
    const usuario = userEvent.setup();
    render(<Ejemplo />);

    await usuario.click(screen.getByRole("button", { name: "Abrir" }));

    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveFocus();
  });

  it("Escape lo cierra y el foco vuelve al botón que lo abrió", async () => {
    const alCerrar = vi.fn();
    const usuario = userEvent.setup();
    render(<Ejemplo alCerrar={alCerrar} />);
    const abrir = screen.getByRole("button", { name: "Abrir" });
    await usuario.click(abrir);

    await usuario.keyboard("{Escape}");

    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });

  it("el foco no sale del diálogo con Tab ni con Shift+Tab", async () => {
    const usuario = userEvent.setup();
    render(<Ejemplo />);
    await usuario.click(screen.getByRole("button", { name: "Abrir" }));
    const dialogo = screen.getByRole("dialog");

    for (let i = 0; i < 6; i++) {
      await usuario.tab();
      expect(dialogo).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 6; i++) {
      await usuario.tab({ shift: true });
      expect(dialogo).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("un clic en el fondo lo cierra", async () => {
    const alCerrar = vi.fn();
    const usuario = userEvent.setup();
    render(<Ejemplo alCerrar={alCerrar} />);
    await usuario.click(screen.getByRole("button", { name: "Abrir" }));

    const fondo = screen.getByRole("dialog").previousElementSibling as HTMLElement;
    await usuario.click(fondo);

    expect(alCerrar).toHaveBeenCalledTimes(1);
  });
});
