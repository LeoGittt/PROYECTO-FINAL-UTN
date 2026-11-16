import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { TECNOLOGIAS } from "@/test/fixtures";
import { CatalogosAdminPage } from "./CatalogosAdminPage";
import { violacionesA11y } from "@/test/axe";

const CATALOGO = [...TECNOLOGIAS, { idTecnologia: 9, nombre: "Docker", categoria: "devops" as const, descripcion: "Contenedores." }];

function montar() {
  const tecnologias = vi.spyOn(api.catalogos, "tecnologias").mockResolvedValue(CATALOGO);
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <CatalogosAdminPage />
    </ToastProvider>,
  );
  return { tecnologias, persona };
}

const fila = (nombre: string) => within(screen.getByRole("cell", { name: nombre }).closest("tr") as HTMLElement);
const dialogo = () => within(screen.getByRole("dialog"));

describe("CatalogosAdminPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lista las tecnologías ordenadas por nombre, con su categoría y descripción", async () => {
    montar();
    await screen.findByRole("cell", { name: "Docker" });
    const nombres = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
    expect(nombres).toEqual(["Docker", "Node.js", "PostgreSQL", "React"]);
    expect(fila("Docker").getByText("DevOps")).toBeInTheDocument();
    expect(fila("Docker").getByText("Contenedores.")).toBeInTheDocument();
    expect(fila("PostgreSQL").getByText("Base de datos")).toBeInTheDocument();
  });

  it("busca sin distinguir mayúsculas ni tildes", async () => {
    const { persona } = montar();
    await screen.findByRole("cell", { name: "Docker" });
    await persona.type(screen.getByLabelText("Buscar tecnología"), "POSTGRE");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("cell", { name: "PostgreSQL" })).toBeInTheDocument();

    await persona.clear(screen.getByLabelText("Buscar tecnología"));
    await persona.type(screen.getByLabelText("Buscar tecnología"), "nada así");
    expect(screen.getByText("Ninguna tecnología coincide con «nada así».")).toBeInTheDocument();
  });

  it("crea una tecnología: valida, envía y recarga el catálogo", async () => {
    const { tecnologias, persona } = montar();
    const crear = vi
      .spyOn(api.catalogos, "crearTecnologia")
      .mockResolvedValue({ idTecnologia: 10, nombre: "Svelte", categoria: "frontend", descripcion: null });
    await screen.findByRole("cell", { name: "Docker" });
    await persona.click(screen.getByRole("button", { name: "Nueva tecnología" }));

    await persona.click(dialogo().getByRole("button", { name: "Guardar tecnología" }));
    expect(crear).not.toHaveBeenCalled();
    expect(dialogo().getByText("Ingresá el nombre de la tecnología.")).toBeInTheDocument();
    expect(dialogo().getByText("Elegí una categoría.")).toBeInTheDocument();

    await persona.type(dialogo().getByLabelText(/Nombre/), "  Svelte ");
    await persona.selectOptions(dialogo().getByLabelText(/Categoría/), "frontend");
    await persona.click(dialogo().getByRole("button", { name: "Guardar tecnología" }));

    expect(crear).toHaveBeenCalledWith({ nombre: "Svelte", categoria: "frontend", descripcion: null });
    expect(await screen.findByText("«Svelte» ya se puede elegir en perfiles y proyectos.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(tecnologias).toHaveBeenCalledTimes(2);
  });

  it("si el nombre ya existe (409), muestra el mensaje del servidor y el diálogo sigue abierto", async () => {
    const { persona } = montar();
    vi.spyOn(api.catalogos, "crearTecnologia").mockRejectedValue(
      new ApiError({
        statusCode: 409,
        error: "Conflict",
        message: "Ya existe una tecnología con ese nombre.",
        details: [{ campo: "nombre", mensaje: "Ese nombre ya está en el catálogo." }],
      }),
    );
    await screen.findByRole("cell", { name: "Docker" });
    await persona.click(screen.getByRole("button", { name: "Nueva tecnología" }));
    await persona.type(dialogo().getByLabelText(/Nombre/), "react");
    await persona.selectOptions(dialogo().getByLabelText(/Categoría/), "frontend");
    await persona.click(dialogo().getByRole("button", { name: "Guardar tecnología" }));

    expect(await dialogo().findByText("Ya existe una tecnología con ese nombre.")).toBeInTheDocument();
    expect(dialogo().getByText("Ese nombre ya está en el catálogo.")).toBeInTheDocument();
    expect(dialogo().getByLabelText(/Nombre/)).toHaveFocus();
  });

  it("edita una tecnología con sus datos cargados y envía el PUT", async () => {
    const { tecnologias, persona } = montar();
    const actualizar = vi
      .spyOn(api.catalogos, "actualizarTecnologia")
      .mockResolvedValue({ idTecnologia: 9, nombre: "Docker", categoria: "devops", descripcion: "Contenedores y despliegue." });
    await persona.click(await screen.findByRole("button", { name: "Editar Docker" }));

    expect(dialogo().getByLabelText(/Nombre/)).toHaveValue("Docker");
    expect(dialogo().getByLabelText(/Categoría/)).toHaveValue("devops");
    const descripcion = dialogo().getByLabelText(/Descripción/);
    expect(descripcion).toHaveValue("Contenedores.");

    await persona.clear(descripcion);
    await persona.type(descripcion, "Contenedores y despliegue.");
    await persona.click(dialogo().getByRole("button", { name: "Guardar tecnología" }));

    expect(actualizar).toHaveBeenCalledWith(9, { nombre: "Docker", categoria: "devops", descripcion: "Contenedores y despliegue." });
    expect(await screen.findByText("Tecnología actualizada")).toBeInTheDocument();
    expect(tecnologias).toHaveBeenCalledTimes(2);
  });

  it("no tiene problemas de accesibilidad que axe pueda detectar", async () => {
    montar();
    await screen.findByRole("cell", { name: "Docker" });
    expect(await violacionesA11y()).toEqual([]);
  });
});
