import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Pagina, ProyectoDto } from "@/lib/api/types";
import { TECNOLOGIAS } from "@/test/fixtures";
import { proyectoDe } from "./fixtures";
import { ProyectosPage } from "./ProyectosPage";

const pagina = (items: ProyectoDto[], extra: Partial<Pagina<ProyectoDto>> = {}): Pagina<ProyectoDto> => ({
  items,
  total: items.length,
  pagina: 1,
  tamano: 10,
  ...extra,
});

const LISTA = [
  proyectoDe({ idProyecto: 1, titulo: "Sistema de turnos", compatibilidad: 0.82, horasSemanales: 20, fechaPublicacion: "2026-08-01T00:00:00Z" }),
  proyectoDe({ idProyecto: 2, titulo: "Panel de métricas", compatibilidad: 0.4, horasSemanales: 8, fechaPublicacion: "2026-09-01T00:00:00Z" }),
];

let buscar: ReturnType<typeof vi.spyOn>;

function montar(respuesta: Pagina<ProyectoDto> = pagina(LISTA)) {
  buscar = vi.spyOn(api.proyectos, "buscar").mockResolvedValue(respuesta);
  vi.spyOn(api.catalogos, "tecnologias").mockResolvedValue(TECNOLOGIAS);
  const usuario = userEvent.setup();
  render(<ProyectosPage />);
  return usuario;
}

const ultimaConsulta = () => buscar.mock.calls.at(-1)?.[0];
const titulos = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("ProyectosPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("muestra una carga accesible y luego las tarjetas con publicador, enlace al detalle y compatibilidad", async () => {
    montar();
    expect(screen.getByText("Buscando proyectos")).toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toHaveAttribute("href", "/proyectos/1");
    expect(screen.getAllByText(/Empresa · Acme SA/)).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Compatibilidad: 82 % (alta)" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Compatibilidad: 40 % (baja)" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 proyectos encontrados");
    expect(ultimaConsulta()).toMatchObject({ pagina: 1, tamano: 10 });
  });

  it("sin compatibilidad en la respuesta (no es estudiante con perfil) no dibuja el aro", async () => {
    montar(pagina([proyectoDe({ idProyecto: 3, titulo: "Sin puntaje" })]));
    await screen.findByRole("link", { name: "Sin puntaje" });
    expect(screen.queryByRole("img", { name: /Compatibilidad/ })).not.toBeInTheDocument();
  });

  it("al buscar por texto pide la búsqueda con ese texto", async () => {
    const usuario = montar();
    await screen.findByRole("link", { name: "Sistema de turnos" });

    await usuario.type(screen.getByLabelText("Título o descripción"), "  react  ");
    await usuario.click(screen.getByRole("button", { name: "Buscar" }));

    expect(ultimaConsulta()).toMatchObject({ q: "react", pagina: 1 });
  });

  it("se puede buscar con Enter desde el campo de texto", async () => {
    const usuario = montar();
    await screen.findByRole("link", { name: "Sistema de turnos" });

    await usuario.type(screen.getByLabelText("Título o descripción"), "datos{Enter}");

    expect(ultimaConsulta()).toMatchObject({ q: "datos" });
  });

  it("filtra por tecnologías del catálogo, modalidad, retribución, dedicación y año", async () => {
    const usuario = montar();
    await screen.findByRole("link", { name: "Sistema de turnos" });

    await usuario.type(screen.getByRole("combobox", { name: "Tecnologías" }), "Rea");
    await usuario.click(await screen.findByRole("option", { name: /React/ }));
    expect(ultimaConsulta()).toMatchObject({ tecnologias: [3] });
    expect(screen.getByRole("button", { name: "Quitar React" })).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText("Modalidad"), "Remoto");
    await usuario.selectOptions(screen.getByLabelText("Retribución"), "Remunerado");
    await usuario.selectOptions(screen.getByLabelText("Dedicación"), "Hasta 10 h por semana");
    await usuario.selectOptions(screen.getByLabelText(/Tu año de cursada/), "2.º año");

    expect(ultimaConsulta()).toMatchObject({
      tecnologias: [3],
      modalidad: "remoto",
      tipoRetribucion: "remunerado",
      horasMax: 10,
      anioMax: 2,
      pagina: 1,
    });
  });

  it("pagina los resultados y al cambiar un filtro vuelve a la primera página", async () => {
    const usuario = montar(pagina(LISTA, { total: 25 }));
    await screen.findByRole("link", { name: "Sistema de turnos" });
    expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Ir a la página 3" }));
    expect(ultimaConsulta()).toMatchObject({ pagina: 3, tamano: 10 });
    expect(screen.getByRole("heading", { name: "Resultados" })).toHaveFocus();

    await usuario.selectOptions(screen.getByLabelText("Modalidad"), "Híbrido");
    expect(ultimaConsulta()).toMatchObject({ modalidad: "hibrido", pagina: 1 });
  });

  it("no muestra la paginación cuando todo entra en una página", async () => {
    montar();
    await screen.findByRole("link", { name: "Sistema de turnos" });
    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument();
  });

  it("ordena los resultados de la página: por menos horas y por más recientes", async () => {
    const usuario = montar();
    await screen.findByRole("link", { name: "Sistema de turnos" });
    expect(titulos()).toEqual(["Sistema de turnos", "Panel de métricas"]);

    await usuario.selectOptions(screen.getByLabelText(/Ordenar por/), "Menos horas por semana");
    expect(titulos()).toEqual(["Panel de métricas", "Sistema de turnos"]);

    await usuario.selectOptions(screen.getByLabelText(/Ordenar por/), "Mayor compatibilidad");
    expect(titulos()).toEqual(["Sistema de turnos", "Panel de métricas"]);

    await usuario.selectOptions(screen.getByLabelText(/Ordenar por/), "Más recientes");
    expect(titulos()).toEqual(["Panel de métricas", "Sistema de turnos"]);
  });

  it("sin resultados y con filtros explica el motivo y permite limpiarlos", async () => {
    const usuario = montar(pagina([]));
    await screen.findByRole("heading", { name: "No encontramos proyectos" });
    expect(screen.getByText(/Todavía no hay proyectos publicados/)).toBeInTheDocument();

    buscar.mockResolvedValue(pagina([]));
    await usuario.selectOptions(screen.getByLabelText("Modalidad"), "Remoto");
    expect(await screen.findByText(/Ningún proyecto publicado cumple con esos filtros/)).toBeInTheDocument();

    buscar.mockResolvedValue(pagina(LISTA));
    const limpiar = screen.getAllByRole("button", { name: "Limpiar filtros" });
    await usuario.click(limpiar[limpiar.length - 1]);

    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toBeInTheDocument();
    expect(ultimaConsulta()).toMatchObject({ pagina: 1 });
    expect(ultimaConsulta().modalidad).toBeUndefined();
    expect(screen.getByLabelText("Modalidad")).toHaveValue("");
  });

  it("si la búsqueda falla muestra el mensaje con un botón para reintentar", async () => {
    const usuario = montar();
    await screen.findByRole("link", { name: "Sistema de turnos" });
    buscar.mockRejectedValueOnce(new ApiError({ statusCode: 500, error: "Internal Server Error", message: "Falló la base de datos." }));
    await usuario.type(screen.getByLabelText("Título o descripción"), "api{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos buscar proyectos");
    expect(within(screen.getByRole("alert")).getByText("Falló la base de datos.")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toBeInTheDocument();
  });

  it("si el catálogo de tecnologías falla lo avisa en el filtro y la búsqueda sigue funcionando", async () => {
    buscar = vi.spyOn(api.proyectos, "buscar").mockResolvedValue(pagina(LISTA));
    vi.spyOn(api.catalogos, "tecnologias").mockRejectedValue(new Error("boom"));
    render(<ProyectosPage />);

    expect(await screen.findByText(/No pudimos cargar las tecnologías/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toBeInTheDocument();
  });
});
