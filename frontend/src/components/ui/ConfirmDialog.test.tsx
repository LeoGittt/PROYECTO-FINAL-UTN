import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { ConfirmDialog } from "./ConfirmDialog";

function Ejemplo({ alConfirmar, variante }: { alConfirmar: () => Promise<void>; variante?: "primary" | "danger" }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir</button>
      <ConfirmDialog
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="Cancelar proyecto"
        descripcion="Esta acción no se puede deshacer."
        textoConfirmar="Sí, cancelar"
        variante={variante}
        alConfirmar={alConfirmar}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("no dibuja nada mientras está cerrado y al abrirse es un diálogo con su título", async () => {
    const usuario = userEvent.setup();
    render(<Ejemplo alConfirmar={vi.fn().mockResolvedValue(undefined)} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Abrir" }));

    expect(screen.getByRole("dialog", { name: "Cancelar proyecto" })).toHaveAccessibleDescription("Esta acción no se puede deshacer.");
  });

  it("al confirmar ejecuta la acción y se cierra", async () => {
    const alConfirmar = vi.fn().mockResolvedValue(undefined);
    const usuario = userEvent.setup();
    render(<Ejemplo alConfirmar={alConfirmar} />);
    await usuario.click(screen.getByRole("button", { name: "Abrir" }));

    await usuario.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    expect(alConfirmar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("si la acción falla, sigue abierto, muestra el mensaje del servidor y permite reintentar", async () => {
    const alConfirmar = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ statusCode: 409, error: "Conflict", message: "El proyecto ya cambió de estado." }))
      .mockResolvedValueOnce(undefined);
    const usuario = userEvent.setup();
    render(<Ejemplo alConfirmar={alConfirmar} />);
    await usuario.click(screen.getByRole("button", { name: "Abrir" }));

    await usuario.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El proyecto ya cambió de estado.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Sí, cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(alConfirmar).toHaveBeenCalledTimes(2);
  });

  it("mientras la acción está en curso bloquea los botones y no se cierra con Escape", async () => {
    let terminar: () => void = () => undefined;
    const alConfirmar = vi.fn(() => new Promise<void>((resolver) => (terminar = resolver)));
    const usuario = userEvent.setup();
    render(<Ejemplo alConfirmar={alConfirmar} />);
    await usuario.click(screen.getByRole("button", { name: "Abrir" }));

    await usuario.click(screen.getByRole("button", { name: "Sí, cancelar" }));
    expect(screen.getByRole("button", { name: "Sí, cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    await usuario.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    terminar();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(alConfirmar).toHaveBeenCalledTimes(1);
  });

  it("Cancelar cierra sin ejecutar la acción y el error anterior no reaparece al volver a abrir", async () => {
    const alConfirmar = vi.fn().mockRejectedValue(new Error("boom"));
    const usuario = userEvent.setup();
    render(<Ejemplo alConfirmar={alConfirmar} />);
    await usuario.click(screen.getByRole("button", { name: "Abrir" }));
    await usuario.click(screen.getByRole("button", { name: "Sí, cancelar" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(alConfirmar).toHaveBeenCalledTimes(1);
  });

  it("puede bloquear la confirmación hasta que el contenido sea válido", async () => {
    const usuario = userEvent.setup();
    render(
      <ConfirmDialog
        abierto
        alCerrar={vi.fn()}
        titulo="Motivo"
        textoConfirmar="Enviar"
        confirmarDeshabilitado
        alConfirmar={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await usuario.keyboard("{Escape}");
  });
});
