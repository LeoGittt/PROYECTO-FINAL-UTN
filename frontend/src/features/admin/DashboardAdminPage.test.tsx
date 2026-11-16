import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Dashboard, ResumenReportes } from "@/lib/api/types";
import { DashboardAdminPage } from "./DashboardAdminPage";

const DASHBOARD: Dashboard = {
  tecnologiasDemandadas: {
    ranking: [
      { idTecnologia: 4, tecnologia: "Node.js", categoria: "backend", cantidadProyectos: 5, cantidadObligatoria: 2 },
      { idTecnologia: 3, tecnologia: "React", categoria: "frontend", cantidadProyectos: 8, cantidadObligatoria: 6 },
    ],
    evolucion: [
      { mes: "2026-09-01", tecnologia: "React", cantidadProyectos: 3 },
      { mes: "2026-10-01", tecnologia: "React", cantidadProyectos: 5 },
      { mes: "2026-10-01T03:00:00.000Z", tecnologia: "Node.js", cantidadProyectos: 2 },
    ],
  },
  matchPorCarreraAnio: [
    { carrera: "Tecnicatura Universitaria en Programación", anioCursada: 2, totalEstudiantes: 10, conRecomendacion: 8, conProyecto: 2, pctConRecomendacion: 80, pctConProyecto: 20 },
  ],
  tiempoPrimerProyecto: { promedioDias: 12.5, estudiantes: 4 },
  embudo: [
    { mes: "2026-09-01", postulaciones: 20, entrevistas: 8, proyectosCerrados: 3, pctPostulacionAEntrevista: 40, pctEntrevistaACierre: 37.5 },
    { mes: "2026-10-01", postulaciones: 10, entrevistas: 2, proyectosCerrados: 1, pctPostulacionAEntrevista: 20, pctEntrevistaACierre: 50 },
  ],
  evaluacionMotor: [
    { configuracion: "v1", precisionGlobal: 0.93, recallGlobal: 0.8, precisionTopK: 0.9, k: 5 },
    { configuracion: "v2", precisionGlobal: 0.95, recallGlobal: 0.85, precisionTopK: 0.92, k: 5 },
  ],
};

const RESUMEN: ResumenReportes = {
  estudiantesActivos: 42,
  empresasActivas: 7,
  docentesActivos: 5,
  proyectosPorEstado: { publicado: 6, en_curso: 2, borrador: 1 },
  postulacionesPorEstado: { pendiente: 9, aceptada: 3 },
};

const VACIO: Dashboard = {
  tecnologiasDemandadas: { ranking: [], evolucion: [] },
  matchPorCarreraAnio: [],
  tiempoPrimerProyecto: { promedioDias: null, estudiantes: 0 },
  embudo: [],
  evaluacionMotor: [],
};

function montar(dashboard: Dashboard = DASHBOARD) {
  const pedirDashboard = vi.spyOn(api.reportes, "dashboard").mockResolvedValue(dashboard);
  const pedirResumen = vi.spyOn(api.reportes, "resumen").mockResolvedValue(RESUMEN);
  render(<DashboardAdminPage />);
  return { pedirDashboard, pedirResumen };
}

/** Las barras son decorativas: cada dato tiene que estar escrito en el texto de su fila. */
const itemDe = (lista: string, etiqueta: string) =>
  within(screen.getByRole("list", { name: lista })).getByText(etiqueta).closest("li") as HTMLElement;
const celdas = (fila: HTMLElement) => within(fila).getAllByRole("cell").map((c) => c.textContent);
const filaDe = (tabla: string, encabezado: string | RegExp) =>
  within(screen.getByRole("table", { name: tabla })).getByRole("rowheader", { name: encabezado }).closest("tr") as HTMLElement;

describe("DashboardAdminPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("resumen RF-07: usuarios activos por rol y cantidades por estado (los estados sin datos valen 0)", async () => {
    const { pedirResumen } = montar();
    expect(await screen.findByText("Estudiantes activos")).toBeInTheDocument();
    expect(pedirResumen).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Estudiantes activos").nextElementSibling).toHaveTextContent("42");
    expect(screen.getByText("Empresas activas").nextElementSibling).toHaveTextContent("7");
    expect(screen.getByText("Docentes activos").nextElementSibling).toHaveTextContent("5");

    expect(itemDe("Proyectos por estado", "Publicado")).toHaveTextContent("6");
    expect(itemDe("Proyectos por estado", "Finalizado")).toHaveTextContent("0");
    expect(itemDe("Postulaciones por estado", "Pendiente")).toHaveTextContent("9");
    expect(itemDe("Postulaciones por estado", "Aceptada")).toHaveTextContent("3");
  });

  it("tecnologías más demandadas, ordenadas, con cuántos proyectos las piden como obligatorias", async () => {
    const { pedirDashboard } = montar();
    const lista = await screen.findByRole("list", { name: "Tecnologías más demandadas" });
    expect(pedirDashboard).toHaveBeenCalledTimes(1);
    expect(within(lista).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("React"),
      expect.stringContaining("Node.js"),
    ]);
    expect(itemDe("Tecnologías más demandadas", "React")).toHaveTextContent("8 proyectos · 6 como obligatoria");
  });

  it("evolución mensual: una tabla por tecnología y mes, con 0 donde no hubo proyectos", async () => {
    montar();
    const tabla = await screen.findByRole("table", { name: "Proyectos publicados por mes que piden cada tecnología" });
    expect(within(tabla).getAllByRole("columnheader").map((c) => c.textContent)).toHaveLength(3);
    expect(celdas(filaDe("Proyectos publicados por mes que piden cada tecnología", "React"))).toEqual(["3", "5"]);
    expect(celdas(filaDe("Proyectos publicados por mes que piden cada tecnología", "Node.js"))).toEqual(["0", "2"]);
  });

  it("estudiantes con match por carrera y año, con porcentajes y cantidades", async () => {
    montar();
    await screen.findByRole("table", { name: "Estudiantes con match por carrera y año" });
    const fila = filaDe("Estudiantes con match por carrera y año", "Tecnicatura Universitaria en Programación");
    expect(celdas(fila)).toEqual(["2.º año", "10", "80 % (8)", "20 % (2)"]);
  });

  it("tiempo promedio hasta el primer proyecto", async () => {
    montar();
    expect(await screen.findByText("12,5 días")).toBeInTheDocument();
    expect(screen.getByText(/sobre 4 estudiantes/)).toBeInTheDocument();
  });

  it("embudo: totales con su conversión y el detalle por mes", async () => {
    montar();
    await screen.findByRole("list", { name: "Embudo de postulación" });
    expect(itemDe("Embudo de postulación", "Postulaciones")).toHaveTextContent("30");
    expect(itemDe("Embudo de postulación", "Llegaron a entrevista")).toHaveTextContent("10 · 33,3 % de las postulaciones");
    expect(itemDe("Embudo de postulación", "Proyectos cerrados")).toHaveTextContent("4 · 40 % de las entrevistas");

    const meses = within(screen.getByRole("table", { name: "Embudo por mes" })).getAllByRole("row").slice(1);
    expect(celdas(meses[0])).toEqual(["20", "8", "3", "40 %", "37,5 %"]);
    expect(celdas(meses[1])).toEqual(["10", "2", "1", "20 %", "50 %"]);
  });

  it("evaluación del motor: la última de cada configuración, para compararlas", async () => {
    montar();
    await screen.findByRole("table", { name: "Última evaluación de cada configuración" });
    expect(celdas(filaDe("Última evaluación de cada configuración", /^v1/))).toEqual(["93 %", "80 %", "90 %"]);
    expect(celdas(filaDe("Última evaluación de cada configuración", /^v2/))).toEqual(["95 %", "85 %", "92 %"]);
  });

  it("sin datos todavía, cada bloque lo dice en lugar de mostrar gráficos vacíos", async () => {
    montar(VACIO);
    expect(await screen.findByText("Todavía no hay proyectos publicados con tecnologías.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay estudiantes con perfil.")).toBeInTheDocument();
    expect(screen.getByText("Todavía ningún estudiante tuvo una postulación aceptada.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay postulaciones.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no se evaluó ninguna configuración.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("si el dashboard falla, muestra el error con reintento y el resumen se ve igual", async () => {
    vi.spyOn(api.reportes, "resumen").mockResolvedValue(RESUMEN);
    const pedirDashboard = vi
      .spyOn(api.reportes, "dashboard")
      .mockRejectedValueOnce(new ApiError({ statusCode: 500, error: "Error", message: "Ocurrió un error en el servidor." }))
      .mockResolvedValue(DASHBOARD);
    const persona = userEvent.setup();
    render(<DashboardAdminPage />);

    const titulo = await screen.findByRole("heading", { name: "No pudimos cargar las métricas" });
    expect(screen.getByText("Estudiantes activos")).toBeInTheDocument();

    await persona.click(within(titulo.closest("[role=alert]") as HTMLElement).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("list", { name: "Tecnologías más demandadas" })).toBeInTheDocument();
    expect(pedirDashboard).toHaveBeenCalledTimes(2);
  });
});
