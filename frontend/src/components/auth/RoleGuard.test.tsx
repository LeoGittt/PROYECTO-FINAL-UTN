import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Rol } from "@/lib/api/types";
import { USUARIO_ESTUDIANTE } from "@/test/fixtures";
import { RoleGuard, rutaInternaSegura } from "./RoleGuard";

const { router, sesion } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  sesion: { estado: "anonimo", usuario: null } as { estado: string; usuario: unknown },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/mis-proyectos",
}));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => sesion }));

function conSesion(rol: Rol) {
  sesion.estado = "autenticado";
  sesion.usuario = { ...USUARIO_ESTUDIANTE, rol };
}

describe("RoleGuard", () => {
  beforeEach(() => {
    router.replace.mockReset();
    sesion.estado = "anonimo";
    sesion.usuario = null;
  });

  it("mientras verifica la sesión muestra una carga y no el contenido ni una redirección", () => {
    sesion.estado = "cargando";
    render(
      <RoleGuard>
        <p>secreto</p>
      </RoleGuard>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Verificando tu sesión…");
    expect(screen.queryByText("secreto")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sin sesión manda al login conservando la ruta pedida y no muestra el contenido", async () => {
    render(
      <RoleGuard>
        <p>secreto</p>
      </RoleGuard>,
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?siguiente=%2Fmis-proyectos"));
    expect(screen.queryByText("secreto")).not.toBeInTheDocument();
  });

  it("con sesión y sin restricción de rol muestra el contenido", () => {
    conSesion("estudiante");
    render(
      <RoleGuard>
        <p>contenido</p>
      </RoleGuard>,
    );
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("con el rol autorizado muestra el contenido", () => {
    conSesion("empresa");
    render(
      <RoleGuard roles={["empresa", "docente"]}>
        <p>contenido</p>
      </RoleGuard>,
    );
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("con otro rol avisa que no tiene acceso, ofrece volver al panel y no muestra el contenido", () => {
    conSesion("estudiante");
    render(
      <RoleGuard roles={["administrador"]}>
        <p>contenido</p>
      </RoleGuard>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No tenés acceso a esta sección");
    expect(screen.getByRole("link", { name: "Ir al panel" })).toHaveAttribute("href", "/panel");
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("rutaInternaSegura", () => {
  it("acepta rutas internas con query", () => {
    expect(rutaInternaSegura("/mis-proyectos")).toBe("/mis-proyectos");
    expect(rutaInternaSegura("/proyectos?pagina=2")).toBe("/proyectos?pagina=2");
  });

  it.each([null, undefined, "", "https://otro.com", "//otro.com", "/\\otro.com", "proyectos", "javascript:alert(1)"])(
    "usa el panel ante %j",
    (ruta) => {
      expect(rutaInternaSegura(ruta)).toBe("/panel");
    },
  );

  it("permite otro destino por defecto", () => {
    expect(rutaInternaSegura("https://otro.com", "/")).toBe("/");
  });
});
