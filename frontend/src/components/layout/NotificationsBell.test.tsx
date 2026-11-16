import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { avisarCambioDeNotificaciones, NotificationsBell } from "./NotificationsBell";

const { ruta } = vi.hoisted(() => ({ ruta: { actual: "/panel" } }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));

function sinLeer(noLeidas: number) {
  return { items: [], noLeidas };
}

describe("NotificationsBell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ruta.actual = "/panel";
  });

  it("pide solo la cantidad sin leer y la muestra en la campana y en su nombre accesible", async () => {
    const listar = vi.spyOn(api.notificaciones, "listar").mockResolvedValue(sinLeer(3));
    render(<NotificationsBell />);

    const enlace = await screen.findByRole("link", { name: "Notificaciones: 3 sin leer" });
    expect(enlace).toHaveAttribute("href", "/notificaciones");
    expect(enlace).toHaveTextContent("3");
    expect(listar).toHaveBeenCalledWith({ soloNoLeidas: true, limite: 1 }, expect.anything());
  });

  it("más de 99 sin leer se muestra como 99+", async () => {
    vi.spyOn(api.notificaciones, "listar").mockResolvedValue(sinLeer(120));
    render(<NotificationsBell />);
    expect(await screen.findByRole("link", { name: "Notificaciones: 120 sin leer" })).toHaveTextContent("99+");
  });

  it("sin notificaciones nuevas sigue siendo el enlace de siempre a /notificaciones, sin contador", async () => {
    const listar = vi.spyOn(api.notificaciones, "listar").mockResolvedValue(sinLeer(0));
    render(<NotificationsBell />);
    await waitFor(() => expect(listar).toHaveBeenCalled());

    const enlace = screen.getByRole("link", { name: "Notificaciones" });
    expect(enlace).toHaveAttribute("href", "/notificaciones");
    expect(enlace.textContent).toBe("");
  });

  it("si la consulta falla, la campana sigue funcionando como enlace", async () => {
    const listar = vi
      .spyOn(api.notificaciones, "listar")
      .mockRejectedValue(new ApiError({ statusCode: 500, error: "Error", message: "Falla" }));
    render(<NotificationsBell />);
    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Notificaciones" })).toHaveAttribute("href", "/notificaciones");
  });

  it("vuelve a contar cuando la página de notificaciones avisa que cambió algo", async () => {
    const listar = vi
      .spyOn(api.notificaciones, "listar")
      .mockResolvedValueOnce(sinLeer(2))
      .mockResolvedValue(sinLeer(0));
    render(<NotificationsBell />);
    await screen.findByRole("link", { name: "Notificaciones: 2 sin leer" });

    act(() => avisarCambioDeNotificaciones());

    expect(await screen.findByRole("link", { name: "Notificaciones" })).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it("vuelve a contar al cambiar de pantalla", async () => {
    const listar = vi
      .spyOn(api.notificaciones, "listar")
      .mockResolvedValueOnce(sinLeer(1))
      .mockResolvedValue(sinLeer(4));
    const { rerender } = render(<NotificationsBell />);
    await screen.findByRole("link", { name: "Notificaciones: 1 sin leer" });

    ruta.actual = "/postulaciones";
    rerender(<NotificationsBell />);

    expect(await screen.findByRole("link", { name: "Notificaciones: 4 sin leer" })).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(2);
  });
});
