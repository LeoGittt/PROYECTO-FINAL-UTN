import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { LoginForm } from "./LoginForm";

const { login, router, busqueda, sesion } = vi.hoisted(() => ({
  login: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn() },
  busqueda: { actual: "" },
  sesion: { estado: "anonimo" as "anonimo" | "cargando" | "autenticado" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(busqueda.actual),
}));
vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ login, estado: sesion.estado }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    login.mockReset();
    router.replace.mockReset();
    busqueda.actual = "";
    sesion.estado = "anonimo";
  });

  it("pide email y contraseña cuando faltan, sin llamar a la API", async () => {
    const usuario = userEvent.setup();
    render(<LoginForm />);

    await usuario.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText("Ingresá tu email.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá tu contraseña.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Email/)).toHaveFocus();
  });

  it("valida el formato del email", async () => {
    const usuario = userEvent.setup();
    render(<LoginForm />);
    await usuario.type(screen.getByLabelText(/^Email/), "no-es-un-email");
    await usuario.type(screen.getByLabelText(/^Contraseña/), "algo");

    await usuario.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText("Ingresá un email válido, por ejemplo nombre@dominio.com.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("inicia sesión con el cuerpo del contrato y va al panel por defecto", async () => {
    login.mockResolvedValue({});
    const usuario = userEvent.setup();
    render(<LoginForm />);
    await usuario.type(screen.getByLabelText(/^Email/), " ana@utn.edu.ar ");
    await usuario.type(screen.getByLabelText(/^Contraseña/), "clave1234");

    await usuario.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/panel"));
    expect(login).toHaveBeenCalledWith({ email: "ana@utn.edu.ar", contrasena: "clave1234" });
  });

  it("vuelve a la página que se pidió originalmente si es una ruta interna", async () => {
    busqueda.actual = "siguiente=/mis-proyectos";
    login.mockResolvedValue({});
    const usuario = userEvent.setup();
    render(<LoginForm />);
    await usuario.type(screen.getByLabelText(/^Email/), "ana@utn.edu.ar");
    await usuario.type(screen.getByLabelText(/^Contraseña/), "clave1234");

    await usuario.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/mis-proyectos"));
  });

  it.each(["https://sitio-malicioso.com", "//sitio-malicioso.com", "/\\sitio-malicioso.com", "javascript:alert(1)"])(
    "ignora un destino externo o raro (%s) y usa el panel",
    async (destino) => {
      busqueda.actual = `siguiente=${encodeURIComponent(destino)}`;
      login.mockResolvedValue({});
      const usuario = userEvent.setup();
      render(<LoginForm />);
      await usuario.type(screen.getByLabelText(/^Email/), "ana@utn.edu.ar");
      await usuario.type(screen.getByLabelText(/^Contraseña/), "clave1234");

      await usuario.click(screen.getByRole("button", { name: "Ingresar" }));

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/panel"));
    },
  );

  it("muestra el mensaje del servidor cuando las credenciales son inválidas", async () => {
    login.mockRejectedValue(
      new ApiError({ statusCode: 401, error: "Unauthorized", message: "Email o contraseña incorrectos." }),
    );
    const usuario = userEvent.setup();
    render(<LoginForm />);
    await usuario.type(screen.getByLabelText(/^Email/), "ana@utn.edu.ar");
    await usuario.type(screen.getByLabelText(/^Contraseña/), "equivocada1");

    await usuario.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Email o contraseña incorrectos.")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });

  it("avisa cuando se llega por una sesión vencida", () => {
    busqueda.actual = "expirada=1";
    render(<LoginForm />);
    expect(screen.getByText("Tu sesión venció. Ingresá de nuevo para continuar.")).toBeInTheDocument();
  });

  it("no muestra el aviso de sesión vencida en una visita normal", () => {
    render(<LoginForm />);
    expect(screen.queryByText(/Tu sesión venció/)).not.toBeInTheDocument();
  });

  it("quien ya tiene sesión es llevado al panel sin ver el formulario", async () => {
    sesion.estado = "autenticado";
    render(<LoginForm />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/panel"));
  });
});
