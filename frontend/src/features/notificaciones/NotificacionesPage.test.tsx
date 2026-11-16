import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Notificacion } from "@/lib/api/types";
import { NotificacionesPage } from "./NotificacionesPage";
import { violacionesA11y } from "@/test/axe";

const NOTIFICACIONES: Notificacion[] = [
  {
    idNotificacion: 1,
    tipo: "invitacion",
    mensaje: "Acme SA te invitó a «Sistema de turnos».",
    urlReferencia: "/invitaciones",
    fecha: "2026-11-10T14:00:00Z",
    leida: false,
  },
  {
    idNotificacion: 2,
    tipo: "nuevo_match",
    mensaje: "Hay un proyecto nuevo compatible con tu perfil.",
    urlReferencia: null,
    fecha: "2026-11-09T10:00:00Z",
    leida: true,
  },
];

function montar(items = NOTIFICACIONES, noLeidas = 1) {
  const listar = vi.spyOn(api.notificaciones, "listar").mockResolvedValue({ items, noLeidas });
  const avisos = vi.fn();
  window.addEventListener("notificaciones:cambio", avisos);
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <NotificacionesPage />
    </ToastProvider>,
  );
  return { listar, avisos, persona };
}

function tarjeta(mensaje: string) {
  return within(screen.getByText(mensaje).closest("article") as HTMLElement);
}

describe("NotificacionesPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lista las notificaciones con su tipo, fecha y si están leídas, y enlaza a donde corresponde", async () => {
    const { listar } = montar();
    expect(await screen.findByText("Acme SA te invitó a «Sistema de turnos».")).toBeInTheDocument();
    expect(listar).toHaveBeenCalledWith({ limite: 30 }, expect.anything());

    const sinLeer = tarjeta("Acme SA te invitó a «Sistema de turnos».");
    expect(sinLeer.getByText("Invitación")).toBeInTheDocument();
    expect(sinLeer.getByText("Sin leer")).toBeInTheDocument();
    expect(sinLeer.getByRole("link", { name: "Ver detalle" })).toHaveAttribute("href", "/invitaciones");
    expect(sinLeer.getByRole("button", { name: "Marcar como leída" })).toBeInTheDocument();

    const leida = tarjeta("Hay un proyecto nuevo compatible con tu perfil.");
    expect(leida.getByText("Nuevo match")).toBeInTheDocument();
    expect(leida.queryByText("Sin leer")).not.toBeInTheDocument();
    expect(leida.queryByRole("button", { name: "Marcar como leída" })).not.toBeInTheDocument();
    expect(leida.queryByRole("link")).not.toBeInTheDocument();
  });

  it("marca una como leída, recarga la lista y avisa a la campana", async () => {
    const { listar, avisos, persona } = montar();
    const leer = vi.spyOn(api.notificaciones, "leer").mockResolvedValue(undefined);
    await screen.findByText("Acme SA te invitó a «Sistema de turnos».");

    await persona.click(screen.getByRole("button", { name: "Marcar como leída" }));

    expect(leer).toHaveBeenCalledWith(1);
    expect(avisos).toHaveBeenCalledTimes(1);
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it("abrir el detalle de una notificación sin leer también la marca como leída", async () => {
    const { avisos, persona } = montar();
    const leer = vi.spyOn(api.notificaciones, "leer").mockResolvedValue(undefined);
    await screen.findByText("Acme SA te invitó a «Sistema de turnos».");

    const enlace = screen.getByRole("link", { name: "Ver detalle" });
    // Se evita la navegación real de jsdom; lo que importa es lo que dispara el clic.
    enlace.addEventListener("click", (evento) => evento.preventDefault());
    await persona.click(enlace);

    expect(leer).toHaveBeenCalledWith(1);
    await vi.waitFor(() => expect(avisos).toHaveBeenCalledTimes(1));
  });

  it("marca todas como leídas desde el encabezado", async () => {
    const { listar, avisos, persona } = montar();
    const leerTodas = vi.spyOn(api.notificaciones, "leerTodas").mockResolvedValue(undefined);
    await screen.findByText("Acme SA te invitó a «Sistema de turnos».");

    await persona.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));

    expect(leerTodas).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Ya no tenés notificaciones sin leer.")).toBeInTheDocument();
    expect(avisos).toHaveBeenCalledTimes(1);
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it("sin notificaciones sin leer no ofrece marcar todas", async () => {
    montar([{ ...NOTIFICACIONES[1] }], 0);
    await screen.findByText("Hay un proyecto nuevo compatible con tu perfil.");
    expect(screen.queryByRole("button", { name: "Marcar todas como leídas" })).not.toBeInTheDocument();
  });

  it("el filtro «Sin leer» pide solo las no leídas y muestra cuántas son", async () => {
    const { listar, persona } = montar();
    await screen.findByText("Acme SA te invitó a «Sistema de turnos».");
    expect(screen.getByRole("button", { name: "Sin leer 1" })).toHaveAttribute("aria-pressed", "false");

    await persona.click(screen.getByRole("button", { name: "Sin leer 1" }));

    expect(listar).toHaveBeenLastCalledWith({ soloNoLeidas: true, limite: 30 }, expect.anything());
  });

  it("si falla marcar como leída, avisa el motivo y no recarga", async () => {
    const { listar, avisos, persona } = montar();
    vi.spyOn(api.notificaciones, "leer").mockRejectedValue(
      new ApiError({ statusCode: 404, error: "Not Found", message: "La notificación no existe." }),
    );
    await screen.findByText("Acme SA te invitó a «Sistema de turnos».");

    await persona.click(screen.getByRole("button", { name: "Marcar como leída" }));

    expect(await screen.findByText("La notificación no existe.")).toBeInTheDocument();
    expect(avisos).not.toHaveBeenCalled();
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it("muestra un estado vacío propio para cada filtro", async () => {
    const { persona } = montar([], 0);
    expect(await screen.findByText("Todavía no tenés notificaciones")).toBeInTheDocument();

    await persona.click(screen.getByRole("button", { name: /Sin leer/ }));
    expect(await screen.findByText("Estás al día")).toBeInTheDocument();
  });

  it("si la lista no carga, muestra el error con reintento", async () => {
    vi.spyOn(api.notificaciones, "listar").mockRejectedValue(
      new ApiError({ statusCode: 500, error: "Error", message: "Ocurrió un error en el servidor." }),
    );
    render(
      <ToastProvider>
        <NotificacionesPage />
      </ToastProvider>,
    );
    const titulo = await screen.findByRole("heading", { name: "No pudimos cargar tus notificaciones" });
    const alerta = titulo.closest("[role=alert]") as HTMLElement;
    expect(alerta).toHaveTextContent("Ocurrió un error en el servidor.");
    expect(within(alerta).getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("no tiene problemas de accesibilidad que axe pueda detectar", async () => {
    montar();
    await screen.findByText("Acme SA te invitó a «Sistema de turnos».");
    expect(await violacionesA11y()).toEqual([]);
  });
});
