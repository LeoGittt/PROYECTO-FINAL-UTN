import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { PerfilEmpresa } from "@/lib/api/types";
import { PERFIL_EMPRESA } from "@/test/fixtures";
import { PerfilEmpresaForm } from "./PerfilEmpresaForm";

function montar(perfil: PerfilEmpresa | null = null, alGuardar = vi.fn().mockResolvedValue(undefined)) {
  const usuario = userEvent.setup();
  render(<PerfilEmpresaForm perfil={perfil} alGuardar={alGuardar} />);
  return { usuario, alGuardar };
}

const guardar = () => screen.getByRole("button", { name: "Guardar perfil" });

describe("PerfilEmpresaForm", () => {
  it("pide nombre, sector y contacto, y no guarda con el formulario vacío", async () => {
    const { usuario, alGuardar } = montar();

    await usuario.click(guardar());

    expect(screen.getByText("Ingresá el nombre de la empresa.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá el sector o rubro de la empresa.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá un dato de contacto (email o teléfono).")).toBeInTheDocument();
    expect(alGuardar).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Nombre de la empresa/)).toHaveFocus();
  });

  it("envía el cuerpo del contrato con null en lo opcional vacío", async () => {
    const { usuario, alGuardar } = montar();
    await usuario.type(screen.getByLabelText(/^Nombre de la empresa/), "Acme SA");
    await usuario.type(screen.getByLabelText(/^Sector o rubro/), "Software y servicios IT");
    await usuario.type(screen.getByLabelText(/^Contacto/), "rrhh@acme.com");

    await usuario.click(guardar());

    expect(alGuardar).toHaveBeenCalledWith({
      nombreEmpresa: "Acme SA",
      sector: "Software y servicios IT",
      descripcion: null,
      contacto: "rrhh@acme.com",
      sitioWeb: null,
    });
  });

  it("incluye el sitio web y la descripción cuando se completan", async () => {
    const { usuario, alGuardar } = montar(PERFIL_EMPRESA);
    const sitio = screen.getByLabelText(/^Sitio web/);
    await usuario.clear(sitio);
    await usuario.type(sitio, "https://acme.com.ar");

    await usuario.click(guardar());

    expect(alGuardar).toHaveBeenCalledWith({
      nombreEmpresa: "Acme SA",
      sector: "Software y servicios IT",
      descripcion: PERFIL_EMPRESA.descripcion,
      contacto: "rrhh@acme.com",
      sitioWeb: "https://acme.com.ar",
    });
  });

  it("rechaza un sitio web sin protocolo", async () => {
    const { usuario, alGuardar } = montar(PERFIL_EMPRESA);
    const sitio = screen.getByLabelText(/^Sitio web/);
    await usuario.clear(sitio);
    await usuario.type(sitio, "www.acme.com");

    await usuario.click(guardar());

    expect(screen.getByText("Ingresá una URL válida que empiece con http:// o https://.")).toBeInTheDocument();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it("muestra el error por campo que devuelve el servidor", async () => {
    const alGuardar = vi.fn().mockRejectedValue(
      new ApiError({
        statusCode: 400,
        error: "Bad Request",
        message: "Los datos enviados no son válidos.",
        details: [{ campo: "contacto", mensaje: "El contacto es demasiado largo." }],
      }),
    );
    const { usuario } = montar(PERFIL_EMPRESA, alGuardar);

    await usuario.click(guardar());

    expect(await screen.findByText("El contacto es demasiado largo.")).toBeInTheDocument();
    expect(screen.getByText("Los datos enviados no son válidos.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contacto/)).toHaveAttribute("aria-invalid", "true");
  });

  it("deshabilita el botón mientras guarda para evitar envíos dobles", async () => {
    let terminar: () => void = () => undefined;
    const alGuardar = vi.fn(() => new Promise<void>((resolver) => (terminar = resolver)));
    const { usuario } = montar(PERFIL_EMPRESA, alGuardar);

    await usuario.click(guardar());

    const enCurso = await screen.findByRole("button", { name: "Guardando…" });
    expect(enCurso).toBeDisabled();
    terminar();
    expect(await screen.findByRole("button", { name: "Guardar perfil" })).toBeEnabled();
    expect(alGuardar).toHaveBeenCalledTimes(1);
  });

  it("el indicador refleja el 100 % de un perfil completo", () => {
    montar(PERFIL_EMPRESA);
    expect(screen.getByRole("progressbar", { name: /Completitud del perfil/ })).toHaveAttribute("aria-valuenow", "100");
  });
});
