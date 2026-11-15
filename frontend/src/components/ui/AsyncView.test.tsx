import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { Consulta } from "@/lib/hooks/useApiQuery";
import { AsyncView } from "./AsyncView";

function consulta<T>(parcial: Partial<Consulta<T>>): Consulta<T> {
  return {
    estado: "ok",
    data: null,
    error: null,
    cargando: false,
    recargar: vi.fn(),
    ...parcial,
  };
}

describe("AsyncView", () => {
  it("mientras carga muestra una región ocupada con la etiqueta dada, no el contenido", () => {
    render(
      <AsyncView consulta={consulta<string[]>({ estado: "cargando", cargando: true })} etiquetaCarga="Cargando proyectos">
        {(lista) => <p>{lista.length}</p>}
      </AsyncView>,
    );
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Cargando proyectos");
  });

  it("con datos muestra el contenido", () => {
    render(
      <AsyncView consulta={consulta({ estado: "ok", data: ["a", "b"] })}>
        {(lista) => <p>{lista.length} resultados</p>}
      </AsyncView>,
    );
    expect(screen.getByText("2 resultados")).toBeInTheDocument();
  });

  it("ante un error muestra el mensaje en español y permite reintentar", async () => {
    const recargar = vi.fn();
    const error = new ApiError({ statusCode: 500, error: "Internal Server Error", message: "Ocurrió un error en el servidor." });
    render(
      <AsyncView consulta={consulta<string[]>({ estado: "error", error, recargar })} tituloError="No pudimos cargar los proyectos">
        {() => <p>contenido</p>}
      </AsyncView>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar los proyectos");
    expect(screen.getByText("Ocurrió un error en el servidor.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
  });

  it("cuando la lista está vacía muestra el estado vacío indicado", () => {
    render(
      <AsyncView consulta={consulta<string[]>({ estado: "vacio", data: [] })} vacio={<p>Todavía no publicaste proyectos.</p>}>
        {() => <p>contenido</p>}
      </AsyncView>,
    );
    expect(screen.getByText("Todavía no publicaste proyectos.")).toBeInTheDocument();
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
  });

  it("tiene un estado vacío genérico si no se pasa uno", () => {
    render(<AsyncView consulta={consulta<string[]>({ estado: "vacio", data: [] })}>{() => <p>contenido</p>}</AsyncView>);
    expect(screen.getByRole("heading", { name: "No hay nada por acá todavía" })).toBeInTheDocument();
  });

  it("una consulta inactiva (esperando la sesión) se ve como carga", () => {
    render(<AsyncView consulta={consulta<string[]>({ estado: "inactiva" })}>{() => <p>contenido</p>}</AsyncView>);
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
