import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { proyectoDe } from "@/features/proyectos/fixtures";
import { MisProyectosPage } from "./MisProyectosPage";

const LISTA = [
  proyectoDe({ idProyecto: 3, titulo: "Borrador de app", estado: "borrador", fechaPublicacion: null, cantidadPostulaciones: 0 }),
  proyectoDe({ idProyecto: 2, titulo: "Panel de ventas", estado: "publicado", cantidadPostulaciones: 1 }),
  proyectoDe({ idProyecto: 1, titulo: "Sistema de turnos", estado: "publicado", cantidadPostulaciones: 4 }),
];

describe("MisProyectosPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lista los proyectos con su estado, cuántas postulaciones tienen y el enlace a gestionarlos", async () => {
    vi.spyOn(api.proyectos, "mios").mockResolvedValue(LISTA);
    render(<MisProyectosPage />);
    expect(screen.getByText("Cargando tus proyectos")).toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toHaveAttribute("href", "/mis-proyectos/1");
    const turnos = within(screen.getByRole("link", { name: "Sistema de turnos" }).closest("article") as HTMLElement);
    expect(turnos.getByText("4 postulaciones")).toBeInTheDocument();
    expect(turnos.getByText("Publicado")).toBeInTheDocument();
    const borrador = within(screen.getByRole("link", { name: "Borrador de app" }).closest("article") as HTMLElement);
    expect(borrador.getByText("Sin publicar")).toBeInTheDocument();
    expect(borrador.getByText("0 postulaciones")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Publicar proyecto" })[0]).toHaveAttribute("href", "/mis-proyectos/nuevo");
  });

  it("filtra por estado", async () => {
    vi.spyOn(api.proyectos, "mios").mockResolvedValue(LISTA);
    const persona = userEvent.setup();
    render(<MisProyectosPage />);
    await screen.findByRole("link", { name: "Sistema de turnos" });

    await persona.click(screen.getByRole("button", { name: /Borrador/ }));
    expect(screen.getByRole("button", { name: /Borrador/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Borrador de app" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sistema de turnos" })).not.toBeInTheDocument();
  });

  it("sin proyectos invita a publicar el primero", async () => {
    vi.spyOn(api.proyectos, "mios").mockResolvedValue([]);
    render(<MisProyectosPage />);
    expect(await screen.findByText("Todavía no publicaste ningún proyecto")).toBeInTheDocument();
  });

  it("si el publicador no completó su perfil (422) lo manda a completarlo", async () => {
    vi.spyOn(api.proyectos, "mios").mockRejectedValue(
      new ApiError({ statusCode: 422, error: "Unprocessable Entity", message: "Debe completar su perfil antes de publicar proyectos" }),
    );
    render(<MisProyectosPage />);
    expect(await screen.findByText("Completá tu perfil para publicar proyectos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completar mi perfil" })).toHaveAttribute("href", "/perfil");
  });

  it("otro error muestra el mensaje y permite reintentar", async () => {
    const mios = vi
      .spyOn(api.proyectos, "mios")
      .mockRejectedValueOnce(new ApiError({ statusCode: 500, error: "Error", message: "Falla del servidor" }))
      .mockResolvedValue(LISTA);
    const persona = userEvent.setup();
    render(<MisProyectosPage />);
    expect(await screen.findByText("Falla del servidor")).toBeInTheDocument();
    await persona.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toBeInTheDocument();
    expect(mios).toHaveBeenCalledTimes(2);
  });
});
