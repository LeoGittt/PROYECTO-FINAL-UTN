import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/endpoints";
import type { Rol } from "@/lib/api/types";
import { CARRERAS, HABILIDADES, MATERIAS, PERFIL_DOCENTE, PERFIL_EMPRESA, TECNOLOGIAS, USUARIO_ESTUDIANTE } from "@/test/fixtures";
import { ToastProvider } from "@/components/ui/Toast";
import { PerfilPage } from "./PerfilPage";

const { sesion, busqueda, refrescar } = vi.hoisted(() => ({
  sesion: { usuario: null, perfil: null } as { usuario: unknown; perfil: unknown },
  busqueda: { actual: "" },
  refrescar: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(busqueda.actual) }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({ ...sesion, refrescar }) }));

function montar(rol: Rol, perfil: unknown = null) {
  sesion.usuario = { ...USUARIO_ESTUDIANTE, rol };
  sesion.perfil = perfil;
  render(
    <ToastProvider>
      <PerfilPage />
    </ToastProvider>,
  );
  return userEvent.setup();
}

describe("PerfilPage", () => {
  beforeEach(() => {
    refrescar.mockReset().mockResolvedValue(undefined);
    busqueda.actual = "";
    sesion.usuario = null;
    sesion.perfil = null;
  });

  it("los administradores no tienen perfil y se les ofrece volver al panel", () => {
    montar("administrador");
    expect(screen.getByRole("heading", { name: "Los administradores no tienen perfil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al panel" })).toHaveAttribute("href", "/panel");
  });

  it("la empresa ve su formulario y, al guardar, envía PUT /perfil, refresca la sesión y avisa", async () => {
    const guardar = vi.spyOn(api.perfil, "guardar").mockResolvedValue(PERFIL_EMPRESA);
    const usuario = montar("empresa", PERFIL_EMPRESA);
    expect(screen.getByRole("heading", { level: 1, name: "Perfil de la empresa" })).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Guardar perfil" }));

    await waitFor(() => expect(refrescar).toHaveBeenCalledTimes(1));
    expect(guardar).toHaveBeenCalledWith({
      nombreEmpresa: "Acme SA",
      sector: "Software y servicios IT",
      descripcion: PERFIL_EMPRESA.descripcion,
      contacto: "rrhh@acme.com",
      sitioWeb: "https://www.acme.com",
    });
    expect(await screen.findByText("Tus cambios quedaron guardados.")).toBeInTheDocument();
  });

  it("el docente ve el formulario de cátedra", () => {
    montar("docente", PERFIL_DOCENTE);
    expect(screen.getByRole("heading", { level: 1, name: "Perfil docente" })).toBeInTheDocument();
  });

  it("si el guardado falla muestra el error y no refresca ni avisa éxito", async () => {
    vi.spyOn(api.perfil, "guardar").mockRejectedValue(new Error("boom"));
    const usuario = montar("docente", PERFIL_DOCENTE);

    await usuario.click(screen.getByRole("button", { name: "Guardar perfil" }));

    expect(await screen.findByText("Ocurrió un error inesperado. Intentá de nuevo.")).toBeInTheDocument();
    expect(refrescar).not.toHaveBeenCalled();
    expect(screen.queryByText("Tus cambios quedaron guardados.")).not.toBeInTheDocument();
  });

  it("después del registro muestra la bienvenida", () => {
    busqueda.actual = "bienvenida=1";
    montar("empresa");
    expect(screen.getByText("¡Tu cuenta está lista!")).toBeInTheDocument();
  });

  it("sin el parámetro no muestra la bienvenida", () => {
    montar("empresa");
    expect(screen.queryByText("¡Tu cuenta está lista!")).not.toBeInTheDocument();
  });

  describe("estudiante", () => {
    it("muestra una carga mientras pide los catálogos y luego el formulario", async () => {
      vi.spyOn(api.catalogos, "carreras").mockResolvedValue(CARRERAS);
      vi.spyOn(api.catalogos, "materias").mockResolvedValue(MATERIAS);
      vi.spyOn(api.catalogos, "tecnologias").mockResolvedValue(TECNOLOGIAS);
      vi.spyOn(api.catalogos, "habilidades").mockResolvedValue(HABILIDADES);
      montar("estudiante");

      // Los avisos (toasts) también usan role="status": la carga se identifica por su texto.
      expect(screen.getByText("Cargando tu perfil")).toBeInTheDocument();
      expect(await screen.findByRole("heading", { level: 1, name: "Mi perfil de estudiante" })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "Carrera" })).toBeInTheDocument();
    });

    it("si un catálogo falla muestra el error con reintento, sin formulario", async () => {
      vi.spyOn(api.catalogos, "carreras").mockRejectedValue(new Error("boom"));
      vi.spyOn(api.catalogos, "materias").mockResolvedValue(MATERIAS);
      vi.spyOn(api.catalogos, "tecnologias").mockResolvedValue(TECNOLOGIAS);
      vi.spyOn(api.catalogos, "habilidades").mockResolvedValue(HABILIDADES);
      montar("estudiante");

      expect(await screen.findByRole("heading", { name: "No pudimos cargar los datos del formulario" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Guardar perfil" })).not.toBeInTheDocument();
    });
  });
});
