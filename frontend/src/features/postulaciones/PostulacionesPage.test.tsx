import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Postulacion } from "@/lib/api/types";
import { postulacionDe } from "@/features/proyectos/fixtures";
import { PostulacionesPage } from "./PostulacionesPage";

const LISTA = [
  postulacionDe({
    idPostulacion: 11,
    estado: "pendiente",
    proyecto: { idProyecto: 1, titulo: "Sistema de turnos", estado: "publicado", publicador: "Acme SA" },
  }),
  postulacionDe({
    idPostulacion: 12,
    estado: "en_revision",
    mensajePresentacion: null,
    puntajeTotal: null,
    proyecto: { idProyecto: 2, titulo: "Panel de métricas", estado: "publicado", publicador: "Cátedra de Datos" },
  }),
  postulacionDe({
    idPostulacion: 13,
    estado: "aceptada",
    proyecto: { idProyecto: 3, titulo: "App de reservas", estado: "en_curso", publicador: "Acme SA" },
  }),
];

const errorApi = (statusCode: number, message: string) => new ApiError({ statusCode, error: "Error", message });

/** `despues`: lo que devuelve el listado al recargarlo (por ejemplo, tras retirar una postulación). */
function montar(respuesta: Postulacion[] = LISTA, despues?: Postulacion[]) {
  const mias = vi.spyOn(api.postulaciones, "mias").mockResolvedValueOnce(respuesta).mockResolvedValue(despues ?? respuesta);
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <PostulacionesPage />
    </ToastProvider>,
  );
  return { persona, mias };
}

const tarjeta = (titulo: string) => screen.getByRole("heading", { name: titulo }).closest("article") as HTMLElement;
const titulos = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("PostulacionesPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("muestra una carga accesible y luego cada postulación con su proyecto, estado, fecha, mensaje y compatibilidad", async () => {
    montar();
    expect(screen.getByText("Cargando tus postulaciones")).toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toHaveAttribute("href", "/proyectos/1");
    const primera = within(tarjeta("Sistema de turnos"));
    expect(primera.getByText("Acme SA")).toBeInTheDocument();
    expect(primera.getByText(/Postulaste el/)).toHaveTextContent("Pendiente");
    expect(primera.getByText("Me interesa mucho el proyecto.")).toBeInTheDocument();
    expect(primera.getByRole("img", { name: /Compatibilidad: 78 %/ })).toBeInTheDocument();
    // Sin puntaje en la respuesta no se dibuja un aro vacío.
    expect(within(tarjeta("Panel de métricas")).queryByRole("img", { name: /Compatibilidad/ })).not.toBeInTheDocument();
  });

  it("la línea de tiempo dice en texto qué etapas están completas y cuál es la actual", async () => {
    montar();
    await screen.findByRole("link", { name: "Panel de métricas" });

    const etapas = within(within(tarjeta("Panel de métricas")).getByRole("list", { name: "Etapas de la postulación" }));
    expect(etapas.getByText(/Pendiente/)).toHaveTextContent("Pendiente (completada)");
    expect(etapas.getByText(/En revisión/)).toHaveTextContent("En revisión (etapa actual)");
    expect(etapas.getByText(/Entrevista/)).toHaveTextContent("Entrevista (todavía no)");
    expect(etapas.getByText(/Aceptada/)).toHaveTextContent("Aceptada (todavía no)");
    expect(etapas.getAllByRole("listitem")[1]).toHaveAttribute("aria-current", "step");
  });

  it("una postulación rechazada o retirada termina la línea en ese estado, no en «Aceptada»", async () => {
    montar([postulacionDe({ estado: "rechazada" })]);

    const etapas = within(await screen.findByRole("list", { name: "Etapas de la postulación" }));
    expect(etapas.getByText(/Rechazada/)).toHaveTextContent("Rechazada (etapa actual)");
    expect(etapas.queryByText(/Aceptada/)).not.toBeInTheDocument();
  });

  describe("filtro por estado", () => {
    it("ofrece «Todas» y solo los estados que tienen postulaciones, con su cantidad", async () => {
      montar();
      await screen.findByRole("link", { name: "Sistema de turnos" });

      const filtros = within(screen.getByRole("group", { name: "Filtrar por estado" }));
      expect(filtros.getAllByRole("button").map((b) => b.textContent)).toEqual(["Todas 3", "Pendiente 1", "En revisión 1", "Aceptada 1"]);
      expect(filtros.getByRole("button", { name: "Todas 3" })).toHaveAttribute("aria-pressed", "true");
    });

    it("al elegir un estado muestra solo esas postulaciones", async () => {
      const { persona } = montar();
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.click(screen.getByRole("button", { name: "En revisión 1" }));

      expect(titulos()).toEqual(["Panel de métricas"]);
      expect(screen.getByRole("button", { name: "En revisión 1" })).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("retirar una postulación", () => {
    it("solo se ofrece mientras el estado lo permite (no en una postulación aceptada)", async () => {
      montar();
      await screen.findByRole("link", { name: "Sistema de turnos" });

      expect(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Retirar postulación" })).toBeInTheDocument();
      expect(within(tarjeta("Panel de métricas")).getByRole("button", { name: "Retirar postulación" })).toBeInTheDocument();
      expect(within(tarjeta("App de reservas")).queryByRole("button", { name: "Retirar postulación" })).not.toBeInTheDocument();
    });

    it("pide confirmación y, si se cancela, no cambia nada", async () => {
      const { persona } = montar();
      const cambiar = vi.spyOn(api.postulaciones, "cambiarEstado");
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.click(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Retirar postulación" }));
      const dialogo = screen.getByRole("dialog", { name: "¿Retirar tu postulación?" });
      expect(dialogo).toHaveTextContent("Vas a retirar tu postulación a «Sistema de turnos». Esta acción no se puede deshacer.");

      await persona.click(within(dialogo).getByRole("button", { name: "Mantener postulación" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(cambiar).not.toHaveBeenCalled();
    });

    it("al confirmar la retira, avisa y refresca el listado", async () => {
      const { persona, mias } = montar(LISTA, [{ ...LISTA[0], estado: "retirada" }, LISTA[1], LISTA[2]]);
      const cambiar = vi.spyOn(api.postulaciones, "cambiarEstado").mockResolvedValue({ ...LISTA[0], estado: "retirada" });
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.click(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Retirar postulación" }));
      await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, retirar" }));

      expect(cambiar).toHaveBeenCalledWith(11, "retirada");
      expect(await screen.findByText("Retiraste tu postulación a «Sistema de turnos».")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mias).toHaveBeenCalledTimes(2);
      // Ya retirada: es un estado final, no se vuelve a ofrecer retirarla.
      expect(within(tarjeta("Sistema de turnos")).queryByRole("button", { name: "Retirar postulación" })).not.toBeInTheDocument();
      expect(within(tarjeta("Sistema de turnos")).getAllByText("Retirada").length).toBeGreaterThan(0);
    });

    it("si el publicador ya la resolvió (409) muestra el motivo, deja el diálogo abierto y refresca el listado", async () => {
      const { persona, mias } = montar();
      vi.spyOn(api.postulaciones, "cambiarEstado").mockRejectedValue(errorApi(409, "La postulación ya fue aceptada y no puede cambiar de estado"));
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.click(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Retirar postulación" }));
      await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, retirar" }));

      expect(await within(screen.getByRole("dialog")).findByText("La postulación ya fue aceptada y no puede cambiar de estado")).toBeInTheDocument();
      expect(mias).toHaveBeenCalledTimes(2);
    });

    it("si queda sin postulaciones en el estado filtrado, avisa y permite volver a ver todas", async () => {
      const { persona } = montar(LISTA, [{ ...LISTA[0], estado: "retirada" }, LISTA[1], LISTA[2]]);
      vi.spyOn(api.postulaciones, "cambiarEstado").mockResolvedValue({ ...LISTA[0], estado: "retirada" });
      await screen.findByRole("link", { name: "Sistema de turnos" });
      await persona.click(screen.getByRole("button", { name: "Pendiente 1" }));
      await persona.click(screen.getByRole("button", { name: "Retirar postulación" }));
      await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, retirar" }));

      expect(await screen.findByText("No tenés postulaciones en ese estado")).toBeInTheDocument();

      await persona.click(screen.getByRole("button", { name: "Ver todas" }));

      expect(titulos()).toHaveLength(3);
    });
  });

  describe("historial", () => {
    const DETALLE = {
      ...LISTA[1],
      historial: [
        { estadoAnterior: null, estadoNuevo: "pendiente" as const, fechaCambio: "2026-09-05T10:00:00Z" },
        { estadoAnterior: "pendiente" as const, estadoNuevo: "en_revision" as const, fechaCambio: "2026-09-07T15:30:00Z" },
      ],
    };

    it("no se pide hasta que se abre y muestra cada cambio de estado con su fecha", async () => {
      const { persona } = montar();
      const obtener = vi.spyOn(api.postulaciones, "obtener").mockResolvedValue(DETALLE);
      await screen.findByRole("link", { name: "Panel de métricas" });
      expect(obtener).not.toHaveBeenCalled();

      await persona.click(within(tarjeta("Panel de métricas")).getByRole("button", { name: "Ver el historial" }));

      const historial = within(await screen.findByRole("list", { name: "Historial de cambios" }));
      expect(obtener).toHaveBeenCalledWith(12, expect.anything());
      expect(historial.getAllByRole("listitem")[0]).toHaveTextContent("Postulación enviada (Pendiente)");
      expect(historial.getAllByRole("listitem")[1]).toHaveTextContent("Pendiente → En revisión");
      expect(within(tarjeta("Panel de métricas")).getByRole("button", { name: "Ocultar el historial" })).toHaveAttribute("aria-expanded", "true");
    });

    it("se puede ocultar de nuevo", async () => {
      const { persona } = montar();
      vi.spyOn(api.postulaciones, "obtener").mockResolvedValue(DETALLE);
      await screen.findByRole("link", { name: "Panel de métricas" });
      const tarjetaPanel = within(tarjeta("Panel de métricas"));

      await persona.click(tarjetaPanel.getByRole("button", { name: "Ver el historial" }));
      await screen.findByRole("list", { name: "Historial de cambios" });
      await persona.click(tarjetaPanel.getByRole("button", { name: "Ocultar el historial" }));

      expect(screen.queryByRole("list", { name: "Historial de cambios" })).not.toBeInTheDocument();
    });

    it("si no pudo cargarse lo dice y deja reintentar", async () => {
      const { persona } = montar();
      const obtener = vi
        .spyOn(api.postulaciones, "obtener")
        .mockRejectedValueOnce(errorApi(500, "Error interno"))
        .mockResolvedValue(DETALLE);
      await screen.findByRole("link", { name: "Panel de métricas" });

      await persona.click(within(tarjeta("Panel de métricas")).getByRole("button", { name: "Ver el historial" }));
      expect(await screen.findByText("No pudimos cargar el historial")).toBeInTheDocument();

      await persona.click(screen.getByRole("button", { name: /Reintentar/ }));

      expect(await screen.findByRole("list", { name: "Historial de cambios" })).toBeInTheDocument();
      expect(obtener).toHaveBeenCalledTimes(2);
    });
  });

  describe("estados de la pantalla", () => {
    it("sin postulaciones invita a explorar proyectos o ver recomendaciones", async () => {
      montar([]);

      expect(await screen.findByRole("heading", { name: "Todavía no te postulaste a ningún proyecto" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Explorar proyectos" })).toHaveAttribute("href", "/proyectos");
      expect(screen.getByRole("link", { name: "Ver recomendaciones" })).toHaveAttribute("href", "/recomendaciones");
    });

    it("si falla la carga muestra el error y permite reintentar", async () => {
      const mias = vi
        .spyOn(api.postulaciones, "mias")
        .mockRejectedValueOnce(errorApi(500, "El servidor no respondió"))
        .mockResolvedValue(LISTA);
      const persona = userEvent.setup();
      render(
        <ToastProvider>
          <PostulacionesPage />
        </ToastProvider>,
      );

      expect(await screen.findByText("No pudimos cargar tus postulaciones")).toBeInTheDocument();
      expect(screen.getByText("El servidor no respondió")).toBeInTheDocument();

      await persona.click(screen.getByRole("button", { name: /Reintentar/ }));

      expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toBeInTheDocument();
      expect(mias).toHaveBeenCalledTimes(2);
    });

    it("si el servidor responde 403 muestra el motivo en lugar de la lista", async () => {
      vi.spyOn(api.postulaciones, "mias").mockRejectedValue(errorApi(403, "Solo los estudiantes tienen postulaciones"));
      render(
        <ToastProvider>
          <PostulacionesPage />
        </ToastProvider>,
      );

      expect(await screen.findByText("Solo los estudiantes tienen postulaciones")).toBeInTheDocument();
    });
  });
});
