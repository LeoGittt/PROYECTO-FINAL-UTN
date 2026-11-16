import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { ErrorRecurso } from "./ErrorRecurso";

const error = (statusCode: number, message = "Mensaje del servidor.") => new ApiError({ statusCode, error: "Error", message });
const volver = { href: "/proyectos", texto: "Volver a los proyectos" };

describe("ErrorRecurso", () => {
  it("un 404 dice que no existe y ofrece volver, sin botón de reintento", () => {
    render(<ErrorRecurso error={error(404)} recurso="este proyecto" alReintentar={vi.fn()} volver={volver} />);

    expect(screen.getByRole("heading", { name: "No encontramos este proyecto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a los proyectos" })).toHaveAttribute("href", "/proyectos");
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("un 403 dice que no hay permiso", () => {
    render(<ErrorRecurso error={error(403)} recurso="este proyecto" volver={volver} />);
    expect(screen.getByRole("heading", { name: "No tenés permiso para ver este proyecto" })).toBeInTheDocument();
  });

  it("una falla del servidor muestra su mensaje y permite reintentar", async () => {
    const alReintentar = vi.fn();
    const usuario = userEvent.setup();
    render(<ErrorRecurso error={error(500, "Falló la base.")} recurso="este proyecto" alReintentar={alReintentar} volver={volver} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falló la base.");
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(alReintentar).toHaveBeenCalledTimes(1);
  });
});
