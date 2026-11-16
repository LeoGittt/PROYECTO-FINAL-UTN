import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PerfilDocente } from "@/lib/api/types";
import { PERFIL_DOCENTE } from "@/test/fixtures";
import { PerfilDocenteForm } from "./PerfilDocenteForm";

function montar(perfil: PerfilDocente | null = null, alGuardar = vi.fn().mockResolvedValue(undefined)) {
  const usuario = userEvent.setup();
  render(<PerfilDocenteForm perfil={perfil} alGuardar={alGuardar} />);
  return { usuario, alGuardar };
}

const guardar = () => screen.getByRole("button", { name: "Guardar perfil" });

describe("PerfilDocenteForm", () => {
  it("exige la cátedra y no guarda sin ella", async () => {
    const { usuario, alGuardar } = montar();

    await usuario.click(guardar());

    expect(screen.getByText("Ingresá el nombre de tu cátedra.")).toBeInTheDocument();
    expect(alGuardar).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Cátedra/)).toHaveFocus();
  });

  it("con solo la cátedra, envía null en el área y la descripción", async () => {
    const { usuario, alGuardar } = montar();
    await usuario.type(screen.getByLabelText(/^Cátedra/), "  Programación III ");

    await usuario.click(guardar());

    expect(alGuardar).toHaveBeenCalledWith({ catedra: "Programación III", areaInvestigacion: null, descripcion: null });
  });

  it("envía todos los campos del contrato cuando están completos", async () => {
    const { usuario, alGuardar } = montar();
    await usuario.type(screen.getByLabelText(/^Cátedra/), "Bases de Datos");
    await usuario.type(screen.getByLabelText(/^Área de investigación/), "Datos abiertos");
    await usuario.type(screen.getByLabelText(/^Descripción/), "Dirijo proyectos finales.");

    await usuario.click(guardar());

    expect(alGuardar).toHaveBeenCalledWith({
      catedra: "Bases de Datos",
      areaInvestigacion: "Datos abiertos",
      descripcion: "Dirijo proyectos finales.",
    });
  });

  it("precarga el perfil guardado", () => {
    montar(PERFIL_DOCENTE);
    expect(screen.getByLabelText(/^Cátedra/)).toHaveValue("Programación III");
    expect(screen.getByLabelText(/^Área de investigación/)).toHaveValue("Ingeniería de software");
    expect(screen.getByRole("progressbar", { name: /Completitud del perfil/ })).toHaveAttribute("aria-valuenow", "100");
  });

  it("muestra un mensaje cuando falla por un error inesperado", async () => {
    const alGuardar = vi.fn().mockRejectedValue(new Error("boom"));
    const { usuario } = montar(PERFIL_DOCENTE, alGuardar);

    await usuario.click(guardar());

    expect(await screen.findByText("Ocurrió un error inesperado. Intentá de nuevo.")).toBeInTheDocument();
  });
});
