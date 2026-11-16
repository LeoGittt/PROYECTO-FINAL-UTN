import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { ProyectoDto } from "@/lib/api/types";
import {
  INVITACION,
  RECOMENDACION_ESTUDIANTE,
  postulacionDe,
  proyectoDe,
  usuarioDe,
} from "@/features/proyectos/fixtures";
import { GestionProyectoPage } from "./GestionProyectoPage";

const { sesion } = vi.hoisted(() => ({ sesion: { usuario: null as unknown } }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => sesion }));

function montar(proyecto: Partial<ProyectoDto> = {}, despues?: Partial<ProyectoDto>) {
  sesion.usuario = usuarioDe("empresa");
  const obtener = vi
    .spyOn(api.proyectos, "obtener")
    .mockResolvedValueOnce(proyectoDe({ cantidadPostulaciones: 1, ...proyecto }))
    .mockResolvedValue(proyectoDe({ cantidadPostulaciones: 1, ...proyecto, ...despues }));
  const postulaciones = vi.spyOn(api.postulaciones, "delProyecto").mockResolvedValue([postulacionDe()]);
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <GestionProyectoPage idProyecto={1} />
    </ToastProvider>,
  );
  return { persona, obtener, postulaciones };
}

describe("GestionProyectoPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("muestra el proyecto y sus postulantes con los cambios de estado que le tocan al publicador", async () => {
    const { postulaciones } = montar();
    expect(await screen.findByRole("heading", { name: "Lucía Fernández" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sistema de turnos para un club");
    expect(screen.getByRole("tab", { name: /Postulantes/ })).toHaveTextContent("1");
    expect(postulaciones).toHaveBeenCalledWith(1, undefined, expect.anything());

    const tarjeta = within(screen.getByRole("heading", { name: "Lucía Fernández" }).closest("article") as HTMLElement);
    expect(tarjeta.getByText("Me interesa mucho el proyecto.")).toBeInTheDocument();
    expect(tarjeta.getByText(/React \(intermedio\)/)).toBeInTheDocument();
    // Retirar es solo del estudiante: al publicador no se le ofrece.
    expect(tarjeta.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Pasar a en revisión",
      "Pasar a entrevista",
      "Pasar a rechazada",
    ]);
  });

  it("cambia el estado de una postulación después de confirmar y recarga la lista", async () => {
    const { persona, postulaciones } = montar();
    const cambiar = vi.spyOn(api.postulaciones, "cambiarEstado").mockResolvedValue(postulacionDe({ estado: "entrevista" }));
    await persona.click(await screen.findByRole("button", { name: "Pasar a entrevista" }));
    await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, cambiar" }));

    expect(cambiar).toHaveBeenCalledWith(11, "entrevista");
    expect(await screen.findByText("Postulación actualizada")).toBeInTheDocument();
    expect(postulaciones).toHaveBeenCalledTimes(2);
  });

  it("si el backend rechaza el cambio (409), el diálogo sigue abierto con el mensaje", async () => {
    const { persona } = montar();
    vi.spyOn(api.postulaciones, "cambiarEstado").mockRejectedValue(
      new ApiError({ statusCode: 409, error: "Conflict", message: "La postulación cambió de estado mientras tanto. Recargue la página" }),
    );
    await persona.click(await screen.findByRole("button", { name: "Pasar a rechazada" }));
    await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, cambiar" }));
    expect(
      await within(screen.getByRole("dialog")).findByText("La postulación cambió de estado mientras tanto. Recargue la página"),
    ).toBeInTheDocument();
  });

  it("un proyecto publicado se puede pasar a en curso o cancelar; al confirmar se vuelve a pedir", async () => {
    const { persona, obtener } = montar({}, { estado: "en_curso" });
    const cambiarEstado = vi.spyOn(api.proyectos, "cambiarEstado").mockResolvedValue(proyectoDe({ estado: "en_curso" }));
    await screen.findByRole("heading", { name: "Lucía Fernández" });
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();

    await persona.click(screen.getByRole("button", { name: "Pasar a en curso" }));
    await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, pasar a en curso" }));

    expect(cambiarEstado).toHaveBeenCalledWith(1, "en_curso");
    expect(await screen.findByRole("button", { name: "Finalizar" })).toBeInTheDocument();
    expect(obtener).toHaveBeenCalledTimes(2);
  });

  it("un borrador se publica por su propia ruta y no ofrece recomendados", async () => {
    const { persona } = montar({ estado: "borrador", fechaPublicacion: null }, { estado: "publicado" });
    const publicar = vi.spyOn(api.proyectos, "publicar").mockResolvedValue(proyectoDe());
    const recomendados = vi.spyOn(api.matching, "recomendados");
    await persona.click(await screen.findByRole("tab", { name: "Recomendados" }));
    expect(screen.getByText("Las recomendaciones son para proyectos publicados")).toBeInTheDocument();
    expect(recomendados).not.toHaveBeenCalled();

    await persona.click(screen.getByRole("button", { name: "Publicar" }));
    await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, publicar" }));
    expect(publicar).toHaveBeenCalledWith(1);
  });

  it("invita a un estudiante recomendado con un mensaje opcional", async () => {
    const { persona } = montar();
    vi.spyOn(api.matching, "recomendados")
      .mockResolvedValueOnce([RECOMENDACION_ESTUDIANTE])
      .mockResolvedValue([{ ...RECOMENDACION_ESTUDIANTE, idInvitacion: 51 }]);
    const crear = vi.spyOn(api.invitaciones, "crear").mockResolvedValue(INVITACION);
    await persona.click(await screen.findByRole("tab", { name: "Recomendados" }));
    const tarjeta = within((await screen.findByRole("heading", { name: "Lucía Fernández" })).closest("article") as HTMLElement);
    expect(tarjeta.getByText(/Le falta:/).closest("p")).toHaveTextContent("Tiene: React, Node.jsLe falta: PostgreSQL");

    await persona.click(tarjeta.getByRole("button", { name: "Invitar a Lucía" }));
    const dialogo = within(screen.getByRole("dialog"));
    await persona.type(dialogo.getByLabelText(/Mensaje/), "Nos encantaría sumarte.");
    await persona.click(dialogo.getByRole("button", { name: "Enviar invitación" }));

    expect(crear).toHaveBeenCalledWith({ idProyecto: 1, idEstudiante: 31, mensaje: "Nos encantaría sumarte." });
    expect(await screen.findByText("Invitado")).toBeInTheDocument();
  });

  it("lista las invitaciones enviadas con su estado", async () => {
    const { persona } = montar();
    vi.spyOn(api.invitaciones, "delProyecto").mockResolvedValue([INVITACION]);
    await persona.click(await screen.findByRole("tab", { name: "Invitaciones" }));
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("edita el proyecto y no permite editar uno finalizado", async () => {
    const { persona } = montar();
    vi.spyOn(api.catalogos, "tecnologias").mockResolvedValue([]);
    vi.spyOn(api.catalogos, "habilidades").mockResolvedValue([]);
    const actualizar = vi.spyOn(api.proyectos, "actualizar").mockResolvedValue(proyectoDe());
    await persona.click(await screen.findByRole("tab", { name: "Editar" }));
    const titulo = await screen.findByLabelText(/^Título/);
    expect(titulo).toHaveValue("Sistema de turnos para un club");
    await persona.clear(titulo);
    await persona.type(titulo, "Turnos 2.0");
    await persona.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(actualizar).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: "Turnos 2.0" }));
    expect(actualizar.mock.calls[0][1]).not.toHaveProperty("publicar");
  });

  it("un proyecto finalizado no ofrece acciones ni edición", async () => {
    const { persona } = montar({ estado: "finalizado" });
    await persona.click(await screen.findByRole("tab", { name: "Editar" }));
    expect(screen.getByText(/ya no se puede editar/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("si el proyecto es de otro publicador no muestra la gestión", async () => {
    montar({ publicador: { tipo: "empresa", id: 2, nombre: "Otra SA", idUsuario: 99 } });
    expect(await screen.findByText("Este proyecto no es tuyo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el proyecto" })).toHaveAttribute("href", "/proyectos/1");
  });

  it("un proyecto inexistente (404) ofrece volver a la lista", async () => {
    sesion.usuario = usuarioDe("empresa");
    vi.spyOn(api.proyectos, "obtener").mockRejectedValue(
      new ApiError({ statusCode: 404, error: "Not Found", message: "El proyecto no existe" }),
    );
    render(
      <ToastProvider>
        <GestionProyectoPage idProyecto={77} />
      </ToastProvider>,
    );
    expect(await screen.findByText("No encontramos este proyecto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mis proyectos" })).toHaveAttribute("href", "/mis-proyectos");
  });

  it("un id que no es un número muestra «no encontramos» sin llamar a la API", async () => {
    sesion.usuario = usuarioDe("empresa");
    const obtener = vi.spyOn(api.proyectos, "obtener");
    render(
      <ToastProvider>
        <GestionProyectoPage idProyecto={Number("abc")} />
      </ToastProvider>,
    );
    expect(screen.getByText("No encontramos este proyecto")).toBeInTheDocument();
    expect(obtener).not.toHaveBeenCalled();
  });
});
