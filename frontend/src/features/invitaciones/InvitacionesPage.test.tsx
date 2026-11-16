import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Invitacion } from "@/lib/api/types";
import { POSTULACION, invitacionDe } from "@/features/proyectos/fixtures";
import { InvitacionesPage } from "./InvitacionesPage";
import { violacionesA11y } from "@/test/axe";

const LISTA = [
  invitacionDe({
    idInvitacion: 51,
    proyecto: { idProyecto: 1, titulo: "Sistema de turnos", publicador: "Acme SA" },
    mensaje: "Tu perfil encaja muy bien con lo que buscamos.",
  }),
  invitacionDe({
    idInvitacion: 52,
    proyecto: { idProyecto: 2, titulo: "Panel de métricas", publicador: "Cátedra de Datos" },
    mensaje: null,
  }),
  invitacionDe({
    idInvitacion: 53,
    estado: "aceptada",
    proyecto: { idProyecto: 3, titulo: "App de reservas", publicador: "Acme SA" },
    fechaRespuesta: "2026-09-08T10:00:00Z",
  }),
];

const errorApi = (statusCode: number, message: string) => new ApiError({ statusCode, error: "Error", message });

/** `despues`: lo que devuelve el listado al recargarlo (por ejemplo, tras responder una invitación). */
function montar(respuesta: Invitacion[] = LISTA, despues?: Invitacion[]) {
  const mias = vi.spyOn(api.invitaciones, "mias").mockResolvedValueOnce(respuesta).mockResolvedValue(despues ?? respuesta);
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <InvitacionesPage />
    </ToastProvider>,
  );
  return { persona, mias };
}

const tarjeta = (titulo: string) => screen.getByRole("heading", { name: titulo }).closest("article") as HTMLElement;

describe("InvitacionesPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("muestra una carga accesible y luego las invitaciones separadas en pendientes y respondidas", async () => {
    montar();
    expect(screen.getByText("Cargando tus invitaciones")).toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toHaveAttribute("href", "/proyectos/1");
    expect(screen.getByRole("heading", { name: /Pendientes/ })).toHaveTextContent("Pendientes (2)");
    expect(screen.getByRole("heading", { name: /Respondidas/ })).toHaveTextContent("Respondidas (1)");
    const primera = within(tarjeta("Sistema de turnos"));
    expect(primera.getByText("Acme SA")).toBeInTheDocument();
    expect(primera.getByText("Tu perfil encaja muy bien con lo que buscamos.")).toBeInTheDocument();
    expect(primera.getByText(/Te invitaron el/)).toHaveTextContent("Pendiente");
  });

  it("solo las pendientes ofrecen aceptar o rechazar; las respondidas muestran cuándo se respondieron", async () => {
    montar();
    await screen.findByRole("link", { name: "App de reservas" });

    const respondida = within(tarjeta("App de reservas"));
    expect(respondida.queryByRole("button")).not.toBeInTheDocument();
    expect(respondida.getByText(/Respondiste el/)).toHaveTextContent("Aceptada");
    expect(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Aceptar invitación" })).toBeInTheDocument();
    expect(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Rechazar" })).toBeInTheDocument();
  });

  it("con todas pendientes no muestra el grupo de respondidas", async () => {
    montar([LISTA[0]]);
    await screen.findByRole("link", { name: "Sistema de turnos" });
    expect(screen.queryByRole("heading", { name: /Respondidas/ })).not.toBeInTheDocument();
  });

  describe("aceptar", () => {
    it("explica que se crea la postulación y, si se cancela, no cambia nada", async () => {
      const { persona } = montar();
      const responder = vi.spyOn(api.invitaciones, "responder");
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.click(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Aceptar invitación" }));
      const dialogo = screen.getByRole("dialog", { name: "¿Aceptar la invitación?" });
      expect(dialogo).toHaveTextContent("se crea tu postulación a «Sistema de turnos» en estado Pendiente");

      await persona.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(responder).not.toHaveBeenCalled();
    });

    it("al confirmar responde que sí, avisa que se creó la postulación y refresca el listado", async () => {
      const { persona, mias } = montar(LISTA, [{ ...LISTA[0], estado: "aceptada", fechaRespuesta: "2026-09-09T10:00:00Z" }, LISTA[1], LISTA[2]]);
      const responder = vi
        .spyOn(api.invitaciones, "responder")
        .mockResolvedValue({ invitacion: { ...LISTA[0], estado: "aceptada" }, postulacion: POSTULACION });
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.click(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Aceptar invitación" }));
      await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, aceptar" }));

      expect(responder).toHaveBeenCalledWith(51, true);
      expect(await screen.findByText(/Tu postulación quedó en estado Pendiente/)).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mias).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("heading", { name: /Pendientes/ })).toHaveTextContent("Pendientes (1)");
      expect(within(tarjeta("Sistema de turnos")).queryByRole("button", { name: "Aceptar invitación" })).not.toBeInTheDocument();
    });

    it("si ya no se puede (409) muestra el motivo, deja el diálogo abierto y refresca el listado", async () => {
      const { persona, mias } = montar();
      vi.spyOn(api.invitaciones, "responder").mockRejectedValue(errorApi(409, "Ya te postulaste a este proyecto"));
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.click(within(tarjeta("Sistema de turnos")).getByRole("button", { name: "Aceptar invitación" }));
      await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, aceptar" }));

      expect(await within(screen.getByRole("dialog")).findByText("Ya te postulaste a este proyecto")).toBeInTheDocument();
      expect(mias).toHaveBeenCalledTimes(2);
    });
  });

  describe("rechazar", () => {
    it("pide confirmación avisando que no se puede deshacer y responde que no", async () => {
      const { persona, mias } = montar(LISTA, [LISTA[0], { ...LISTA[1], estado: "rechazada" }, LISTA[2]]);
      const responder = vi.spyOn(api.invitaciones, "responder").mockResolvedValue({ invitacion: { ...LISTA[1], estado: "rechazada" }, postulacion: null });
      await screen.findByRole("link", { name: "Panel de métricas" });

      await persona.click(within(tarjeta("Panel de métricas")).getByRole("button", { name: "Rechazar" }));
      const dialogo = screen.getByRole("dialog", { name: "¿Rechazar la invitación?" });
      expect(dialogo).toHaveTextContent("Vas a rechazar la invitación a «Panel de métricas». Esta acción no se puede deshacer.");
      await persona.click(within(dialogo).getByRole("button", { name: "Sí, rechazar" }));

      expect(responder).toHaveBeenCalledWith(52, false);
      expect(await screen.findByText("Rechazaste la invitación a «Panel de métricas».")).toBeInTheDocument();
      expect(mias).toHaveBeenCalledTimes(2);
      expect(within(tarjeta("Panel de métricas")).queryByRole("button", { name: "Rechazar" })).not.toBeInTheDocument();
    });

    it("si falla muestra el error dentro del diálogo y no avisa que se rechazó", async () => {
      const { persona } = montar();
      vi.spyOn(api.invitaciones, "responder").mockRejectedValue(errorApi(500, "Error interno del servidor"));
      await screen.findByRole("link", { name: "Panel de métricas" });

      await persona.click(within(tarjeta("Panel de métricas")).getByRole("button", { name: "Rechazar" }));
      await persona.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, rechazar" }));

      expect(await within(screen.getByRole("dialog")).findByText("Error interno del servidor")).toBeInTheDocument();
      expect(screen.queryByText(/Rechazaste la invitación/)).not.toBeInTheDocument();
    });
  });

  describe("estados de la pantalla", () => {
    it("sin invitaciones lo explica y ofrece completar el perfil o explorar proyectos", async () => {
      montar([]);

      expect(await screen.findByRole("heading", { name: "Todavía no recibiste invitaciones" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Revisar mi perfil" })).toHaveAttribute("href", "/perfil");
      expect(screen.getByRole("link", { name: "Explorar proyectos" })).toHaveAttribute("href", "/proyectos");
    });

    it("si falla la carga muestra el error y permite reintentar", async () => {
      const mias = vi
        .spyOn(api.invitaciones, "mias")
        .mockRejectedValueOnce(errorApi(500, "El servidor no respondió"))
        .mockResolvedValue(LISTA);
      const persona = userEvent.setup();
      render(
        <ToastProvider>
          <InvitacionesPage />
        </ToastProvider>,
      );

      expect(await screen.findByText("No pudimos cargar tus invitaciones")).toBeInTheDocument();
      expect(screen.getByText("El servidor no respondió")).toBeInTheDocument();

      await persona.click(screen.getByRole("button", { name: /Reintentar/ }));

      expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toBeInTheDocument();
      expect(mias).toHaveBeenCalledTimes(2);
    });

    it("si el servidor responde 403 muestra el motivo en lugar de la lista", async () => {
      vi.spyOn(api.invitaciones, "mias").mockRejectedValue(errorApi(403, "Solo los estudiantes reciben invitaciones"));
      render(
        <ToastProvider>
          <InvitacionesPage />
        </ToastProvider>,
      );

      expect(await screen.findByText("Solo los estudiantes reciben invitaciones")).toBeInTheDocument();
    });
  });

  it("no tiene problemas de accesibilidad que axe pueda detectar", async () => {
    montar();
    await screen.findByRole("link", { name: "Sistema de turnos" });
    expect(await violacionesA11y()).toEqual([]);
  });
});
