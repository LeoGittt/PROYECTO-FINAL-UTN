import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { CARRERAS, HABILIDADES, MATERIAS, PERFIL_ESTUDIANTE, TECNOLOGIAS } from "@/test/fixtures";
import { PerfilEstudianteForm } from "./PerfilEstudianteForm";
import type { PerfilEstudiante } from "@/lib/api/types";

function montar(perfil: PerfilEstudiante | null = null, alGuardar = vi.fn().mockResolvedValue(undefined)) {
  const usuario = userEvent.setup();
  render(
    <PerfilEstudianteForm
      perfil={perfil}
      carreras={CARRERAS}
      materias={MATERIAS}
      tecnologias={TECNOLOGIAS}
      habilidades={HABILIDADES}
      alGuardar={alGuardar}
    />,
  );
  return { usuario, alGuardar };
}

const guardar = () => screen.getByRole("button", { name: "Guardar perfil" });
// La sección "Carrera y disponibilidad" también empieza con "Carrera": se busca por rol y nombre exacto.
const carrera = () => screen.getByRole("combobox", { name: "Carrera" });

describe("PerfilEstudianteForm", () => {
  it("muestra un mensaje por cada dato obligatorio faltante y no guarda", async () => {
    const { usuario, alGuardar } = montar();

    await usuario.click(guardar());

    expect(screen.getByText("Elegí tu carrera.")).toBeInTheDocument();
    expect(screen.getByText("Elegí tu año de cursada.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá cuántas horas por semana tenés disponibles.")).toBeInTheDocument();
    expect(screen.getByText("Revisá los campos marcados antes de guardar.")).toBeInTheDocument();
    expect(alGuardar).not.toHaveBeenCalled();
    expect(carrera()).toHaveFocus();
    expect(carrera()).toHaveAttribute("aria-invalid", "true");
  });

  it("al elegir una carrera, el año de cursada solo ofrece los años que dura", async () => {
    const { usuario } = montar();
    await usuario.selectOptions(carrera(), "1");

    const anios = within(screen.getByLabelText(/^Año de cursada/)).getAllByRole("option");
    expect(anios.map((o) => o.textContent)).toEqual(["Elegí tu año", "1.º año", "2.º año"]);
    expect(screen.getByText("Tu carrera dura 2 años.")).toBeInTheDocument();
  });

  it("al pasar a una carrera más corta se descarta el año que ya no es válido", async () => {
    const { usuario } = montar();
    await usuario.selectOptions(carrera(), "2");
    await usuario.selectOptions(screen.getByLabelText(/^Año de cursada/), "4");

    await usuario.selectOptions(carrera(), "1");

    expect(screen.getByLabelText(/^Año de cursada/)).toHaveValue("");
  });

  it("solo muestra las materias de la carrera elegida y descarta las de la anterior", async () => {
    const { usuario } = montar();
    expect(screen.getByText("Elegí tu carrera para ver sus materias.")).toBeInTheDocument();

    await usuario.selectOptions(carrera(), "1");
    expect(screen.getByRole("checkbox", { name: "Programación I" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Algoritmos y Estructuras de Datos" })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("checkbox", { name: "Programación I" }));
    expect(screen.getByText(/Aprobadas:/)).toHaveTextContent("Aprobadas: 1 de 2");

    await usuario.selectOptions(carrera(), "2");
    expect(screen.getByText(/Aprobadas:/)).toHaveTextContent("Aprobadas: 0 de 1");
  });

  it("arma el cuerpo del contrato con lo que se cargó, incluyendo una tecnología con su nivel", async () => {
    const { usuario, alGuardar } = montar();
    await usuario.selectOptions(carrera(), "1");
    await usuario.selectOptions(screen.getByLabelText(/^Año de cursada/), "2");
    await usuario.type(screen.getByLabelText(/^Horas semanales/), "12");
    await usuario.type(screen.getByLabelText(/^Descripción/), "Me gusta la web");
    await usuario.type(screen.getByLabelText(/^GitHub/), "https://github.com/ana");

    await usuario.type(screen.getByRole("combobox", { name: /Agregar una tecnología/ }), "reac");
    await usuario.click(screen.getByRole("option", { name: /React/ }));
    await usuario.selectOptions(screen.getByLabelText("Nivel en React"), "avanzado");

    await usuario.click(screen.getByRole("checkbox", { name: "Bases de Datos" }));
    await usuario.type(screen.getByRole("combobox", { name: /Agregar una habilidad/ }), "equipo");
    await usuario.click(screen.getByRole("option", { name: /Trabajo en equipo/ }));

    await usuario.click(guardar());

    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(alGuardar).toHaveBeenCalledWith({
      idCarrera: 1,
      anioCursada: 2,
      horasSemanales: 12,
      descripcion: "Me gusta la web",
      proyectosPrevios: null,
      cvUrl: null,
      githubUrl: "https://github.com/ana",
      portfolioUrl: null,
      tecnologias: [{ idTecnologia: 3, nivel: "avanzado" }],
      habilidades: [1],
      materiasAprobadas: [11],
    });
  });

  it("precarga el perfil guardado y lo reenvía igual si no se toca nada", async () => {
    const { usuario, alGuardar } = montar(PERFIL_ESTUDIANTE);

    expect(carrera()).toHaveValue("1");
    expect(screen.getByLabelText(/^Horas semanales/)).toHaveValue(10);
    expect(screen.getByLabelText("Nivel en React")).toHaveValue("intermedio");

    await usuario.click(guardar());

    expect(alGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        idCarrera: 1,
        anioCursada: 2,
        horasSemanales: 10,
        githubUrl: "https://github.com/ana",
        cvUrl: null,
        habilidades: [1],
        materiasAprobadas: [10],
      }),
    );
  });

  it("rechaza una URL sin protocolo y marca el campo", async () => {
    const { usuario, alGuardar } = montar(PERFIL_ESTUDIANTE);
    const github = screen.getByLabelText(/^GitHub/);
    await usuario.clear(github);
    await usuario.type(github, "github.com/ana");

    await usuario.click(guardar());

    expect(screen.getByText("Ingresá una URL válida que empiece con http:// o https://.")).toBeInTheDocument();
    expect(github).toHaveAttribute("aria-invalid", "true");
    expect(github).toHaveFocus();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it("permite quitar una tecnología", async () => {
    const { usuario } = montar(PERFIL_ESTUDIANTE);
    const lista = screen.getByRole("list", { name: "Tecnologías elegidas" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(3);

    await usuario.click(screen.getByRole("button", { name: "Quitar React" }));

    expect(within(lista).queryByText("React")).not.toBeInTheDocument();
    expect(within(lista).getAllByRole("listitem")).toHaveLength(2);
  });

  it("muestra el error del servidor (por ejemplo, una materia de otra carrera) sin perder lo cargado", async () => {
    const alGuardar = vi.fn().mockRejectedValue(
      new ApiError({
        statusCode: 422,
        error: "Unprocessable Entity",
        message: "Hay materias que no pertenecen a tu carrera.",
      }),
    );
    const { usuario } = montar(PERFIL_ESTUDIANTE, alGuardar);

    await usuario.click(guardar());

    expect(await screen.findByText("Hay materias que no pertenecen a tu carrera.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Horas semanales/)).toHaveValue(10);
    expect(guardar()).toBeEnabled();
  });

  it("el indicador de completitud sube a medida que se completa el formulario", async () => {
    const { usuario } = montar();
    const indicador = () => screen.getByRole("progressbar", { name: /Completitud del perfil/ });
    expect(indicador()).toHaveAttribute("aria-valuenow", "0");

    await usuario.selectOptions(carrera(), "1");

    expect(Number(indicador().getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  });
});
