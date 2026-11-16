import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { proyectoDe } from "@/features/proyectos/fixtures";
import { ProyectosAdminPage } from "./ProyectosAdminPage";
import { violacionesA11y } from "@/test/axe";

const PROYECTOS = [
  proyectoDe({ idProyecto: 1, titulo: "Turnos del club", estado: "publicado", cantidadPostulaciones: 3 }),
  proyectoDe({ idProyecto: 2, titulo: "Inventario de pañol", estado: "en_curso", cantidadPostulaciones: 1 }),
  proyectoDe({ idProyecto: 3, titulo: "Bot de consultas", estado: "suspendido" }),
  proyectoDe({ idProyecto: 4, titulo: "Borrador de app", estado: "borrador", fechaPublicacion: null }),
  proyectoDe({ idProyecto: 5, titulo: "Sitio terminado", estado: "finalizado" }),
];

function montar() {
  const proyectos = vi.spyOn(api.admin, "proyectos").mockResolvedValue(PROYECTOS);
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <ProyectosAdminPage />
    </ToastProvider>,
  );
  return { proyectos, persona };
}

const fila = (titulo: string) => within(screen.getByRole("link", { name: titulo }).closest("tr") as HTMLElement);
const dialogo = () => within(screen.getByRole("dialog"));

describe("ProyectosAdminPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lista todos los proyectos con su publicador, estado y postulaciones", async () => {
    const { proyectos } = montar();
    expect(await screen.findByRole("link", { name: "Turnos del club" })).toHaveAttribute("href", "/proyectos/1");
    expect(proyectos).toHaveBeenCalledWith(undefined, expect.anything());
    expect(fila("Turnos del club").getByText("Acme SA")).toBeInTheDocument();
    expect(fila("Turnos del club").getByText("Publicado")).toBeInTheDocument();
    expect(fila("Turnos del club").getByText("3")).toBeInTheDocument();
    expect(fila("Borrador de app").getByText("Sin publicar")).toBeInTheDocument();
  });

  it("solo ofrece suspender desde publicado o en curso, y reactivar desde suspendido", async () => {
    montar();
    await screen.findByRole("link", { name: "Turnos del club" });
    expect(fila("Turnos del club").getByRole("button", { name: "Suspender «Turnos del club»" })).toBeInTheDocument();
    expect(fila("Inventario de pañol").getByRole("button", { name: "Suspender «Inventario de pañol»" })).toBeInTheDocument();
    expect(fila("Bot de consultas").getByRole("button", { name: "Reactivar «Bot de consultas»" })).toBeInTheDocument();
    expect(fila("Bot de consultas").queryByRole("button", { name: /Suspender/ })).not.toBeInTheDocument();
    expect(fila("Borrador de app").queryByRole("button")).not.toBeInTheDocument();
    expect(fila("Sitio terminado").queryByRole("button")).not.toBeInTheDocument();
  });

  it("suspender exige un motivo, lo envía y recarga la lista", async () => {
    const { proyectos, persona } = montar();
    const suspender = vi.spyOn(api.admin, "suspenderProyecto").mockResolvedValue(proyectoDe({ estado: "suspendido" }));
    await persona.click(await screen.findByRole("button", { name: "Suspender «Turnos del club»" }));

    const confirmar = dialogo().getByRole("button", { name: "Suspender proyecto" });
    expect(confirmar).toBeDisabled();
    await persona.type(dialogo().getByLabelText(/Motivo/), "   ");
    expect(confirmar).toBeDisabled();

    await persona.type(dialogo().getByLabelText(/Motivo/), "Pide datos personales de los estudiantes.");
    await persona.click(confirmar);

    expect(suspender).toHaveBeenCalledWith(1, "Pide datos personales de los estudiantes.");
    expect(await screen.findByText("«Turnos del club» dejó de verse en la plataforma.")).toBeInTheDocument();
    expect(proyectos).toHaveBeenCalledTimes(2);
  });

  it("si el servidor rechaza la suspensión (409), el diálogo muestra el motivo", async () => {
    const { persona } = montar();
    vi.spyOn(api.admin, "suspenderProyecto").mockRejectedValue(
      new ApiError({ statusCode: 409, error: "Conflict", message: "Solo se suspende un proyecto publicado o en curso." }),
    );
    await persona.click(await screen.findByRole("button", { name: "Suspender «Inventario de pañol»" }));
    await persona.type(dialogo().getByLabelText(/Motivo/), "Contenido engañoso.");
    await persona.click(dialogo().getByRole("button", { name: "Suspender proyecto" }));
    expect(await dialogo().findByText("Solo se suspende un proyecto publicado o en curso.")).toBeInTheDocument();
  });

  it("reactiva un proyecto suspendido después de confirmar", async () => {
    const { proyectos, persona } = montar();
    const reactivar = vi.spyOn(api.admin, "reactivarProyecto").mockResolvedValue(proyectoDe({ estado: "publicado" }));
    await persona.click(await screen.findByRole("button", { name: "Reactivar «Bot de consultas»" }));
    await persona.click(dialogo().getByRole("button", { name: "Sí, reactivar" }));

    expect(reactivar).toHaveBeenCalledWith(3);
    expect(await screen.findByText("«Bot de consultas» vuelve a estar publicado.")).toBeInTheDocument();
    expect(proyectos).toHaveBeenCalledTimes(2);
  });

  it("filtra por estado pidiéndole al servidor solo ese estado", async () => {
    const { proyectos, persona } = montar();
    await screen.findByRole("link", { name: "Turnos del club" });
    await persona.click(screen.getByRole("button", { name: "Suspendido" }));
    expect(proyectos).toHaveBeenLastCalledWith("suspendido", expect.anything());
    expect(screen.getByRole("button", { name: "Suspendido" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sin proyectos en el estado elegido muestra un estado vacío", async () => {
    vi.spyOn(api.admin, "proyectos").mockResolvedValue([]);
    render(
      <ToastProvider>
        <ProyectosAdminPage />
      </ToastProvider>,
    );
    expect(await screen.findByText("No hay proyectos para mostrar")).toBeInTheDocument();
  });

  it("no tiene problemas de accesibilidad que axe pueda detectar", async () => {
    montar();
    await screen.findByRole("link", { name: "Turnos del club" });
    expect(await violacionesA11y()).toEqual([]);
  });
});
