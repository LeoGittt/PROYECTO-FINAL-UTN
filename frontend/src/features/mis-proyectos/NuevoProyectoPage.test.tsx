import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { proyectoDe } from "@/features/proyectos/fixtures";
import { NuevoProyectoPage } from "./NuevoProyectoPage";

const { router } = vi.hoisted(() => ({ router: { push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function montar() {
  vi.spyOn(api.catalogos, "tecnologias").mockResolvedValue([
    { idTecnologia: 3, nombre: "React", categoria: "frontend", descripcion: null },
    { idTecnologia: 4, nombre: "Node.js", categoria: "backend", descripcion: null },
  ]);
  vi.spyOn(api.catalogos, "habilidades").mockResolvedValue([{ idHabilidad: 1, nombre: "Trabajo en equipo", descripcion: null }]);
  const crear = vi.spyOn(api.proyectos, "crear").mockResolvedValue(proyectoDe({ idProyecto: 9 }));
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <NuevoProyectoPage />
    </ToastProvider>,
  );
  return { persona, crear };
}

async function completar(persona: ReturnType<typeof userEvent.setup>) {
  await persona.type(await screen.findByLabelText(/^Título/), "Sistema de turnos");
  await persona.type(screen.getByLabelText(/^Descripción/), "Una aplicación web para reservar turnos online.");
  await persona.type(screen.getByLabelText(/^Duración/), "8");
  await persona.type(screen.getByLabelText(/^Horas por semana/), "10");
  await persona.selectOptions(screen.getByLabelText(/^Modalidad/), "remoto");
  await persona.selectOptions(screen.getByLabelText(/^Retribución/), "certificado");
}

describe("NuevoProyectoPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    router.push.mockReset();
  });

  it("publica el proyecto con sus tecnologías (obligatorias o deseables) y abre su gestión", async () => {
    const { persona, crear } = montar();
    await completar(persona);
    await persona.type(screen.getByRole("combobox", { name: "Agregar una tecnología" }), "rea");
    await persona.click(screen.getByRole("option", { name: /React/ }));
    await persona.type(screen.getByRole("combobox", { name: "Agregar una tecnología" }), "nod");
    await persona.click(screen.getByRole("option", { name: /Node\.js/ }));
    await persona.selectOptions(screen.getByLabelText("¿Node.js es obligatoria o deseable?"), "deseable");

    await persona.click(screen.getByRole("button", { name: "Publicar proyecto" }));

    expect(crear).toHaveBeenCalledWith({
      titulo: "Sistema de turnos",
      descripcion: "Una aplicación web para reservar turnos online.",
      objetivos: null,
      perfilBuscado: null,
      duracionSemanas: 8,
      horasSemanales: 10,
      anioMinimo: 1,
      cupos: 1,
      modalidad: "remoto",
      tipoRetribucion: "certificado",
      detalleRetribucion: null,
      tecnologias: [
        { idTecnologia: 3, obligatoria: true },
        { idTecnologia: 4, obligatoria: false },
      ],
      habilidades: [],
      publicar: true,
    });
    expect(router.push).toHaveBeenCalledWith("/mis-proyectos/9");
  });

  it("«Guardar borrador» lo crea sin publicar", async () => {
    const { persona, crear } = montar();
    await completar(persona);
    await persona.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ publicar: false }));
  });

  it("con campos inválidos no envía nada, marca el error y enfoca el primero", async () => {
    const { persona, crear } = montar();
    await screen.findByLabelText(/^Título/);
    await persona.click(screen.getByRole("button", { name: "Publicar proyecto" }));

    expect(crear).not.toHaveBeenCalled();
    expect(screen.getByText("Revisá los campos marcados antes de guardar.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá el título del proyecto.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveFocus();
  });

  it("muestra el mensaje del backend si rechaza el alta", async () => {
    const { persona, crear } = montar();
    crear.mockRejectedValue(
      new ApiError({ statusCode: 422, error: "Unprocessable Entity", message: "Debe completar su perfil antes de publicar proyectos" }),
    );
    await completar(persona);
    await persona.click(screen.getByRole("button", { name: "Publicar proyecto" }));
    expect(await screen.findByText("Debe completar su perfil antes de publicar proyectos")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
