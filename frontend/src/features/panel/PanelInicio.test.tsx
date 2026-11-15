import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Perfil, Rol } from "@/lib/api/types";
import { PERFIL_DOCENTE, PERFIL_EMPRESA, PERFIL_ESTUDIANTE, USUARIO_ESTUDIANTE } from "@/test/fixtures";
import { PanelInicio } from "./PanelInicio";

const { sesion } = vi.hoisted(() => ({ sesion: { usuario: null, perfil: null } as { usuario: unknown; perfil: unknown } }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => sesion }));

function montar(rol: Rol, perfil: Perfil | null, nombre = "Ana") {
  sesion.usuario = { ...USUARIO_ESTUDIANTE, rol, nombre };
  sesion.perfil = perfil;
  render(<PanelInicio />);
}

const enlaces = () => screen.getAllByRole("link").map((a) => a.getAttribute("href"));

describe("PanelInicio", () => {
  beforeEach(() => {
    sesion.usuario = null;
    sesion.perfil = null;
  });

  it("saluda por el nombre y muestra el rol", () => {
    montar("estudiante", PERFIL_ESTUDIANTE, "Lucía");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hola, Lucía");
    expect(screen.getByText("Estudiante")).toBeInTheDocument();
  });

  it("un estudiante sin perfil ve 0 %, qué sigue y un botón para completarlo", () => {
    montar("estudiante", null);

    expect(screen.getByRole("progressbar", { name: "Completitud del perfil" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText(/Tu perfil está completo al 0 %/)).toBeInTheDocument();
    expect(screen.getByText(/Siguiente paso: elegí tu carrera\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completar mi perfil" })).toHaveAttribute("href", "/perfil");
  });

  it("con el perfil completo lo dice y ofrece editarlo", () => {
    montar("empresa", PERFIL_EMPRESA);

    expect(screen.getByRole("heading", { name: "Tu perfil está completo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar mi perfil" })).toHaveAttribute("href", "/perfil");
    expect(screen.queryByText(/Siguiente paso/)).not.toBeInTheDocument();
  });

  it("el estudiante ve los accesos de su rol", () => {
    montar("estudiante", PERFIL_ESTUDIANTE);
    const siguientes = within(screen.getByRole("region", { name: "Próximos pasos" }));
    expect(siguientes.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/recomendaciones",
      "/proyectos",
      "/postulaciones",
      "/invitaciones",
    ]);
  });

  it.each(["empresa", "docente"] as const)("%s ve publicar y gestionar proyectos", (rol) => {
    montar(rol, rol === "empresa" ? PERFIL_EMPRESA : PERFIL_DOCENTE);
    expect(enlaces()).toEqual(expect.arrayContaining(["/mis-proyectos/nuevo", "/mis-proyectos"]));
    expect(enlaces()).not.toContain("/recomendaciones");
  });

  it("el administrador no ve la tarjeta de perfil y sí las herramientas de administración", () => {
    montar("administrador", null);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/perfil/i)).not.toBeInTheDocument();
    expect(enlaces()).toEqual(
      expect.arrayContaining(["/admin/dashboard", "/admin/usuarios", "/admin/proyectos", "/admin/catalogos", "/admin/motor"]),
    );
  });

  it("sin usuario no dibuja nada", () => {
    const { container } = render(<PanelInicio />);
    expect(container).toBeEmptyDOMElement();
  });
});
