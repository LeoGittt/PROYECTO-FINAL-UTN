import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { UsuarioAdmin } from "@/lib/api/types";
import { usuarioDe } from "@/features/proyectos/fixtures";
import { UsuariosAdminPage } from "./UsuariosAdminPage";

const { sesion } = vi.hoisted(() => ({ sesion: { usuario: null as unknown } }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => sesion }));

const USUARIOS: UsuarioAdmin[] = [
  { idUsuario: 20, nombre: "Carla", apellido: "Gómez", email: "carla@utn.edu.ar", rol: "administrador", activo: true, fechaRegistro: "2026-03-01T12:00:00Z", idEstudiante: null },
  { idUsuario: 7, nombre: "Ana", apellido: "Pérez", email: "ana@utn.edu.ar", rol: "estudiante", activo: true, fechaRegistro: "2026-04-10T12:00:00Z", idEstudiante: 4 },
  { idUsuario: 8, nombre: "Pedro", apellido: "Ruiz", email: "pedro@acme.com", rol: "empresa", activo: false, fechaRegistro: "2026-05-20T12:00:00Z", idEstudiante: null },
];

function montar(total = USUARIOS.length, items = USUARIOS) {
  sesion.usuario = usuarioDe("administrador");
  const usuarios = vi
    .spyOn(api.admin, "usuarios")
    .mockImplementation(async (filtros = {}) => ({ items, total, pagina: filtros.pagina ?? 1, tamano: 20 }));
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <UsuariosAdminPage />
    </ToastProvider>,
  );
  return { usuarios, persona };
}

const fila = (nombre: string) => within(screen.getByText(nombre).closest("tr") as HTMLElement);
const dialogo = () => within(screen.getByRole("dialog"));

describe("UsuariosAdminPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lista los usuarios con su rol y estado, y marca la cuenta propia", async () => {
    const { usuarios } = montar();
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(usuarios).toHaveBeenCalledWith({ pagina: 1, tamano: 20 }, expect.anything());

    expect(fila("Ana Pérez").getByText("ana@utn.edu.ar")).toBeInTheDocument();
    expect(fila("Ana Pérez").getByText("Estudiante")).toBeInTheDocument();
    expect(fila("Ana Pérez").getByText("Activo")).toBeInTheDocument();
    expect(fila("Pedro Ruiz").getByText("Inactivo")).toBeInTheDocument();
    expect(fila("Pedro Ruiz").getByRole("button", { name: "Activar a Pedro Ruiz" })).toBeInTheDocument();
    expect(fila("Carla Gómez").getByText("Vos")).toBeInTheDocument();
    expect(fila("Ana Pérez").queryByText("Vos")).not.toBeInTheDocument();
  });

  it("filtra por rol, por estado y por texto, y vuelve a la primera página", async () => {
    const { usuarios, persona } = montar();
    await screen.findByText("Ana Pérez");

    await persona.selectOptions(screen.getByLabelText("Rol"), "empresa");
    expect(usuarios).toHaveBeenLastCalledWith({ rol: "empresa", pagina: 1, tamano: 20 }, expect.anything());

    await persona.selectOptions(screen.getByLabelText("Estado"), "false");
    expect(usuarios).toHaveBeenLastCalledWith({ rol: "empresa", activo: false, pagina: 1, tamano: 20 }, expect.anything());

    await persona.type(screen.getByLabelText("Nombre o email"), "  ruiz ");
    await persona.click(screen.getByRole("button", { name: "Buscar" }));
    expect(usuarios).toHaveBeenLastCalledWith({ rol: "empresa", activo: false, q: "ruiz", pagina: 1, tamano: 20 }, expect.anything());

    await persona.selectOptions(screen.getByLabelText("Estado"), "true");
    expect(usuarios).toHaveBeenLastCalledWith({ rol: "empresa", activo: true, q: "ruiz", pagina: 1, tamano: 20 }, expect.anything());
  });

  it("pagina los resultados", async () => {
    const { usuarios, persona } = montar(45);
    await screen.findByText("Ana Pérez");
    await persona.click(screen.getByRole("button", { name: "Ir a la página 2" }));
    expect(usuarios).toHaveBeenLastCalledWith({ pagina: 2, tamano: 20 }, expect.anything());
  });

  it("desactiva a un usuario después de confirmar y recarga la lista", async () => {
    const { usuarios, persona } = montar();
    const actualizar = vi.spyOn(api.admin, "actualizarUsuario").mockResolvedValue({ ...USUARIOS[1], activo: false });
    await persona.click(await screen.findByRole("button", { name: "Desactivar a Ana Pérez" }));
    await persona.click(dialogo().getByRole("button", { name: "Sí, desactivar" }));

    expect(actualizar).toHaveBeenCalledWith(7, { activo: false });
    expect(await screen.findByText("Ana Pérez ya no puede iniciar sesión.")).toBeInTheDocument();
    expect(usuarios).toHaveBeenCalledTimes(2);
  });

  it("al desactivar a una empresa o a un docente avisa que sus proyectos se suspenden; a un estudiante, no", async () => {
    const { persona } = montar(USUARIOS.length, [USUARIOS[1], { ...USUARIOS[2], activo: true }]);
    await persona.click(await screen.findByRole("button", { name: "Desactivar a Pedro Ruiz" }));
    expect(dialogo().getByText(/Sus proyectos publicados o en curso se suspenden/)).toBeInTheDocument();
    await persona.click(dialogo().getByRole("button", { name: "Cancelar" }));

    await persona.click(screen.getByRole("button", { name: "Desactivar a Ana Pérez" }));
    expect(dialogo().queryByText(/Sus proyectos/)).not.toBeInTheDocument();
  });

  it("activa a un usuario inactivo", async () => {
    const { persona } = montar();
    const actualizar = vi.spyOn(api.admin, "actualizarUsuario").mockResolvedValue({ ...USUARIOS[2], activo: true });
    await persona.click(await screen.findByRole("button", { name: "Activar a Pedro Ruiz" }));
    await persona.click(dialogo().getByRole("button", { name: "Sí, activar" }));
    expect(actualizar).toHaveBeenCalledWith(8, { activo: true });
  });

  it("si el administrador intenta desactivarse a sí mismo, muestra el mensaje del servidor (409)", async () => {
    const { usuarios, persona } = montar();
    vi.spyOn(api.admin, "actualizarUsuario").mockRejectedValue(
      new ApiError({ statusCode: 409, error: "Conflict", message: "No podés desactivar tu propia cuenta." }),
    );
    await persona.click(await screen.findByRole("button", { name: "Desactivar a Carla Gómez" }));
    await persona.click(dialogo().getByRole("button", { name: "Sí, desactivar" }));

    expect(await dialogo().findByText("No podés desactivar tu propia cuenta.")).toBeInTheDocument();
    expect(usuarios).toHaveBeenCalledTimes(1);
  });

  it("cambia el rol: el diálogo arranca con el rol actual y solo guarda si cambió", async () => {
    const { usuarios, persona } = montar();
    const actualizar = vi.spyOn(api.admin, "actualizarUsuario").mockResolvedValue({ ...USUARIOS[1], rol: "docente" });
    await persona.click(await screen.findByRole("button", { name: "Cambiar rol de Ana Pérez" }));

    const selector = dialogo().getByLabelText(/Nuevo rol/);
    expect(selector).toHaveValue("estudiante");
    expect(dialogo().getByRole("button", { name: "Guardar rol" })).toBeDisabled();

    await persona.selectOptions(selector, "docente");
    await persona.click(dialogo().getByRole("button", { name: "Guardar rol" }));

    expect(actualizar).toHaveBeenCalledWith(7, { rol: "docente" });
    expect(await screen.findByText("Ana Pérez ahora es Docente.")).toBeInTheDocument();
    expect(usuarios).toHaveBeenCalledTimes(2);
  });

  it("si el administrador intenta cambiarse el rol a sí mismo, muestra el mensaje del servidor (409)", async () => {
    const { persona } = montar();
    vi.spyOn(api.admin, "actualizarUsuario").mockRejectedValue(
      new ApiError({ statusCode: 409, error: "Conflict", message: "No podés cambiar tu propio rol." }),
    );
    await persona.click(await screen.findByRole("button", { name: "Cambiar rol de Carla Gómez" }));
    await persona.selectOptions(dialogo().getByLabelText(/Nuevo rol/), "docente");
    await persona.click(dialogo().getByRole("button", { name: "Guardar rol" }));

    expect(await dialogo().findByText("No podés cambiar tu propio rol.")).toBeInTheDocument();
  });

  it("restablece la contraseña solo cuando la nueva cumple las reglas", async () => {
    const { persona } = montar();
    const restablecer = vi.spyOn(api.admin, "restablecerContrasena").mockResolvedValue(undefined);
    await persona.click(await screen.findByRole("button", { name: "Restablecer contraseña de Ana Pérez" }));

    const confirmar = dialogo().getByRole("button", { name: "Restablecer" });
    await persona.type(dialogo().getByLabelText(/Contraseña nueva/), "corta1");
    expect(confirmar).toBeDisabled();

    await persona.type(dialogo().getByLabelText(/Contraseña nueva/), "234");
    await persona.click(confirmar);

    expect(restablecer).toHaveBeenCalledWith(7, { contrasenaNueva: "corta1234" });
    expect(await screen.findByText("Contraseña restablecida")).toBeInTheDocument();
  });

  it("da de alta un administrador: valida los campos, envía el alta y recarga la lista", async () => {
    const { usuarios, persona } = montar();
    const crear = vi.spyOn(api.admin, "crearAdministrador").mockResolvedValue({ ...USUARIOS[0], idUsuario: 30 });
    await screen.findByText("Ana Pérez");
    await persona.click(screen.getByRole("button", { name: "Nuevo administrador" }));

    await persona.click(dialogo().getByRole("button", { name: "Crear administrador" }));
    expect(crear).not.toHaveBeenCalled();
    expect(dialogo().getByText("Ingresá el nombre.")).toBeInTheDocument();
    expect(dialogo().getByText("Ingresá el email.")).toBeInTheDocument();
    expect(dialogo().getByLabelText(/Nombre/)).toHaveFocus();

    await persona.type(dialogo().getByLabelText(/Nombre/), " Laura ");
    await persona.type(dialogo().getByLabelText(/Apellido/), "Sosa");
    await persona.type(dialogo().getByLabelText(/Email/), "laura@utn.edu.ar");
    await persona.type(dialogo().getByLabelText(/Contraseña inicial/), "Admin2026");
    await persona.click(dialogo().getByRole("button", { name: "Crear administrador" }));

    expect(crear).toHaveBeenCalledWith({ nombre: "Laura", apellido: "Sosa", email: "laura@utn.edu.ar", contrasena: "Admin2026" });
    expect(await screen.findByText("Laura Sosa ya puede ingresar como administrador.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(usuarios).toHaveBeenCalledTimes(2);
  });

  it("si el email ya existe (409), lo marca en el campo y el diálogo sigue abierto", async () => {
    const { persona } = montar();
    vi.spyOn(api.admin, "crearAdministrador").mockRejectedValue(
      new ApiError({
        statusCode: 409,
        error: "Conflict",
        message: "Ya existe un usuario con ese email.",
        details: [{ campo: "email", mensaje: "Ese email ya está registrado." }],
      }),
    );
    await screen.findByText("Ana Pérez");
    await persona.click(screen.getByRole("button", { name: "Nuevo administrador" }));
    await persona.type(dialogo().getByLabelText(/Nombre/), "Laura");
    await persona.type(dialogo().getByLabelText(/Apellido/), "Sosa");
    await persona.type(dialogo().getByLabelText(/Email/), "ana@utn.edu.ar");
    await persona.type(dialogo().getByLabelText(/Contraseña inicial/), "Admin2026");
    await persona.click(dialogo().getByRole("button", { name: "Crear administrador" }));

    expect(await dialogo().findByText("Ya existe un usuario con ese email.")).toBeInTheDocument();
    expect(dialogo().getByText("Ese email ya está registrado.")).toBeInTheDocument();
    expect(dialogo().getByLabelText(/Email/)).toHaveAttribute("aria-invalid", "true");
  });

  it("sin resultados muestra un estado vacío que permite limpiar los filtros", async () => {
    sesion.usuario = usuarioDe("administrador");
    const usuarios = vi.spyOn(api.admin, "usuarios").mockResolvedValue({ items: [], total: 0, pagina: 1, tamano: 20 });
    const persona = userEvent.setup();
    render(
      <ToastProvider>
        <UsuariosAdminPage />
      </ToastProvider>,
    );
    await persona.selectOptions(await screen.findByLabelText("Rol"), "docente");
    expect(await screen.findByText("No encontramos usuarios")).toBeInTheDocument();

    await persona.click(screen.getByRole("button", { name: "Ver todos los usuarios" }));
    expect(usuarios).toHaveBeenLastCalledWith({ pagina: 1, tamano: 20 }, expect.anything());
    expect(screen.getByLabelText("Rol")).toHaveValue("");
  });
});
