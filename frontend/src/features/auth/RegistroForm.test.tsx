import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { RegistroForm } from "./RegistroForm";
import { violacionesA11y } from "@/test/axe";

const { registrar, router, busqueda } = vi.hoisted(() => ({
  registrar: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn() },
  busqueda: { actual: "" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(busqueda.actual),
}));
vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ registrar, estado: "anonimo" }),
}));

async function elegirRol(usuario: ReturnType<typeof userEvent.setup>, nombre: RegExp) {
  await usuario.click(screen.getByRole("radio", { name: nombre }));
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
}

async function completar(usuario: ReturnType<typeof userEvent.setup>, datos: Partial<Record<string, string>> = {}) {
  const valores = {
    Nombre: "Ana",
    Apellido: "Pérez",
    Email: "ana@utn.edu.ar",
    Contraseña: "clave1234",
    ...datos,
  };
  for (const [etiqueta, valor] of Object.entries(valores)) {
    if (valor) await usuario.type(screen.getByLabelText(new RegExp(`^${etiqueta}`)), valor);
  }
}

describe("RegistroForm", () => {
  beforeEach(() => {
    registrar.mockReset();
    router.replace.mockReset();
    busqueda.actual = "";
  });

  it("no avanza sin elegir un rol y lo explica", async () => {
    const usuario = userEvent.setup();
    render(<RegistroForm />);

    await usuario.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Elegí cómo vas a usar la plataforma.");
    expect(screen.queryByRole("heading", { name: "Tus datos" })).not.toBeInTheDocument();
  });

  it("ofrece solo los tres roles registrables", () => {
    render(<RegistroForm />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByRole("radio", { name: /administrador/i })).not.toBeInTheDocument();
  });

  it("muestra un mensaje por cada campo obligatorio y no envía nada", async () => {
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Soy estudiante/);

    await usuario.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("Ingresá tu nombre.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá tu apellido.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá tu email.")).toBeInTheDocument();
    expect(screen.getByText("Elegí una contraseña.")).toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
    // El foco va al primer campo con error y cada campo queda marcado como inválido.
    expect(screen.getByLabelText(/^Nombre/)).toHaveFocus();
    expect(screen.getByLabelText(/^Nombre/)).toHaveAttribute("aria-invalid", "true");
  });

  it("valida el formato del email y la regla de la contraseña", async () => {
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Soy estudiante/);
    await completar(usuario, { Email: "ana-sin-arroba", Contraseña: "corta" });

    await usuario.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("Ingresá un email válido, por ejemplo nombre@dominio.com.")).toBeInTheDocument();
    expect(
      screen.getByText("La contraseña debe tener al menos 8 caracteres, con una letra y un número."),
    ).toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
  });

  it("muestra qué requisitos de la contraseña ya se cumplen, también en texto", async () => {
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Soy docente/);
    const lista = screen.getByRole("list", { name: "Requisitos de la contraseña" });

    expect(lista).toHaveTextContent("Al menos 8 caracteres (pendiente)");

    await usuario.type(screen.getByLabelText(/^Contraseña/), "abcdefg1");

    expect(lista).toHaveTextContent("Al menos 8 caracteres (cumplido)");
    expect(lista).toHaveTextContent("Al menos una letra (cumplido)");
    expect(lista).toHaveTextContent("Al menos un número (cumplido)");
  });

  it("envía el cuerpo del contrato (con el rol elegido y los textos sin espacios sobrantes) y va al perfil", async () => {
    registrar.mockResolvedValue({});
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Represento a una empresa/);
    await completar(usuario, { Nombre: "  Ana ", Email: " ana@empresa.com " });

    await usuario.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/perfil?bienvenida=1"));
    expect(registrar).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledWith({
      nombre: "Ana",
      apellido: "Pérez",
      email: "ana@empresa.com",
      contrasena: "clave1234",
      rol: "empresa",
    });
  });

  it("preselecciona el rol que viene en la URL y salta directo a los datos", () => {
    busqueda.actual = "rol=docente";
    render(<RegistroForm />);

    expect(screen.getByRole("heading", { name: "Tus datos" })).toBeInTheDocument();
    expect(screen.getByText("soy docente")).toBeInTheDocument();
  });

  it("ignora un rol inválido en la URL (no permite registrarse como administrador)", () => {
    busqueda.actual = "rol=administrador";
    render(<RegistroForm />);
    expect(screen.getByRole("heading", { name: "Creá tu cuenta" })).toBeInTheDocument();
  });

  it("muestra el error del servidor y lo asigna al campo que corresponde (email repetido)", async () => {
    registrar.mockRejectedValue(
      new ApiError({
        statusCode: 409,
        error: "Conflict",
        message: "El email ya está registrado.",
        details: [{ campo: "email", mensaje: "Ya existe una cuenta con ese email." }],
      }),
    );
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Soy estudiante/);
    await completar(usuario);

    await usuario.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("El email ya está registrado.")).toBeInTheDocument();
    expect(screen.getByText("Ya existe una cuenta con ese email.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
    expect(router.replace).not.toHaveBeenCalled();
    // El botón vuelve a estar disponible para corregir y reintentar.
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
  });

  it("muestra un mensaje claro cuando no hay conexión con el servidor", async () => {
    registrar.mockRejectedValue(
      new ApiError({
        statusCode: 0,
        error: "Network Error",
        message: "No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.",
        esRed: true,
      }),
    );
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Soy estudiante/);
    await completar(usuario);

    await usuario.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText(/No pudimos conectarnos con el servidor/)).toBeInTheDocument();
  });

  it("permite volver al paso de rol conservando lo escrito", async () => {
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Soy estudiante/);
    await usuario.type(screen.getByLabelText(/^Nombre/), "Ana");

    await usuario.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("radio", { name: /Soy estudiante/ })).toBeChecked();
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Ana");
  });

  it("el botón para mostrar la contraseña anuncia su estado", async () => {
    const usuario = userEvent.setup();
    render(<RegistroForm />);
    await elegirRol(usuario, /Soy estudiante/);
    const campo = screen.getByLabelText(/^Contraseña/);
    const boton = screen.getByRole("button", { name: "Mostrar contraseña" });

    expect(campo).toHaveAttribute("type", "password");
    expect(boton).toHaveAttribute("aria-pressed", "false");

    await usuario.click(boton);

    expect(campo).toHaveAttribute("type", "text");
    expect(boton).toHaveAttribute("aria-pressed", "true");
  });

  it("no tiene problemas de accesibilidad que axe pueda detectar", async () => {
    render(<RegistroForm />);
    await screen.findByRole("button", { name: "Continuar" });
    expect(await violacionesA11y()).toEqual([]);
  });
});
