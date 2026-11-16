import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/endpoints";
import type { Rol } from "@/lib/api/types";
import { usuarioDe } from "@/features/proyectos/fixtures";
import { AppShell } from "./AppShell";

const { sesion } = vi.hoisted(() => ({ sesion: { usuario: null as unknown, logout: () => {} } }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => sesion }));
vi.mock("next/navigation", () => ({ usePathname: () => "/panel" }));

function montar(rol: Rol) {
  sesion.usuario = usuarioDe(rol);
  const listar = vi.spyOn(api.notificaciones, "listar").mockResolvedValue({ items: [], noLeidas: 2 });
  render(
    <AppShell>
      <p>Contenido de la pantalla</p>
    </AppShell>,
  );
  return { listar };
}

describe("AppShell", () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each<Rol>(["estudiante", "empresa", "docente"])("para %s muestra la campana con la cantidad sin leer", async (rol) => {
    const { listar } = montar(rol);
    expect(await screen.findByRole("link", { name: "Notificaciones: 2 sin leer" })).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("main")).toHaveTextContent("Contenido de la pantalla");
  });

  it("el administrador no tiene campana (no recibe notificaciones) y no se piden", async () => {
    const { listar } = montar("administrador");
    expect(screen.getByRole("main")).toHaveTextContent("Contenido de la pantalla");
    await waitFor(() => expect(screen.getAllByRole("navigation", { name: "Navegación principal" }).length).toBeGreaterThan(0));
    expect(screen.queryByRole("link", { name: /^Notificaciones/ })).not.toBeInTheDocument();
    expect(listar).not.toHaveBeenCalled();
  });
});
