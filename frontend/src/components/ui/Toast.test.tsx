import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function Disparadores() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.exito("Se guardó.", "Listo")}>exito</button>
      <button onClick={() => toast.error("No se pudo guardar.", "Error")}>error</button>
    </>
  );
}

function montar() {
  render(
    <ToastProvider>
      <Disparadores />
    </ToastProvider>,
  );
}

describe("Toast", () => {
  afterEach(() => vi.useRealTimers());

  it("un aviso de éxito se anuncia de forma cortés (role status)", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole("button", { name: "exito" }));

    expect(screen.getByRole("status")).toHaveTextContent("Se guardó.");
    expect(screen.getByRole("status")).toHaveTextContent("Listo");
  });

  it("un error se anuncia de forma asertiva (role alert), separado de los avisos corteses", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole("button", { name: "error" }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar.");
    expect(screen.getByRole("status")).not.toHaveTextContent("No se pudo guardar.");
  });

  it("se puede cerrar a mano", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("button", { name: "exito" }));

    await usuario.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(screen.queryByText("Se guardó.")).not.toBeInTheDocument();
  });

  it("desaparece solo después de unos segundos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    montar();
    await usuario.click(screen.getByRole("button", { name: "exito" }));
    expect(screen.getByText("Se guardó.")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.queryByText("Se guardó.")).not.toBeInTheDocument();
  });

  it("useToast fuera del proveedor falla con un mensaje claro", () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Disparadores />)).toThrow();
    consola.mockRestore();
  });
});
