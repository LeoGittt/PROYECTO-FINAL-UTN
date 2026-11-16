import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Perfil, Usuario } from "@/lib/api/types";
import { PERFIL_ESTUDIANTE } from "@/test/fixtures";
import { POSTULACION, PROYECTO, proyectoDe, recomendacionDe, usuarioDe } from "./fixtures";
import { ProyectoDetalle } from "./ProyectoDetalle";
import { violacionesA11y } from "@/test/axe";

const { sesion } = vi.hoisted(() => ({ sesion: { usuario: null, perfil: null } as { usuario: unknown; perfil: unknown } }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => sesion }));

interface Opciones {
  usuario?: Usuario;
  perfil?: Perfil | null;
  proyecto?: Parameters<typeof proyectoDe>[0];
  mias?: (typeof POSTULACION)[];
  recomendaciones?: ReturnType<typeof recomendacionDe>[];
  id?: number;
}

function montar({ usuario = usuarioDe("estudiante"), perfil = PERFIL_ESTUDIANTE, proyecto, mias = [], recomendaciones, id = 1 }: Opciones = {}) {
  sesion.usuario = usuario;
  sesion.perfil = perfil;
  const obtener = vi.spyOn(api.proyectos, "obtener").mockResolvedValue(proyectoDe(proyecto));
  const listarMias = vi.spyOn(api.postulaciones, "mias").mockResolvedValue(mias);
  const listarRecomendaciones = vi
    .spyOn(api.matching, "recomendaciones")
    .mockResolvedValue(recomendaciones ?? [recomendacionDe()]);
  const crear = vi.spyOn(api.postulaciones, "crear").mockResolvedValue(POSTULACION);
  const usuarioEvento = userEvent.setup();
  render(
    <ToastProvider>
      <ProyectoDetalle idProyecto={id} />
    </ToastProvider>,
  );
  return { usuario: usuarioEvento, obtener, listarMias, listarRecomendaciones, crear };
}

const errorApi = (statusCode: number, message: string) => new ApiError({ statusCode, error: "Error", message });

describe("ProyectoDetalle", () => {
  beforeEach(() => vi.restoreAllMocks());

  describe("estudiante con perfil completo", () => {
    it("muestra el proyecto completo y su compatibilidad con el desglose", async () => {
      const { obtener, listarRecomendaciones } = montar();

      expect(screen.getByText("Cargando el proyecto")).toBeInTheDocument();
      expect(await screen.findByRole("heading", { level: 1, name: "Sistema de turnos para un club" })).toBeInTheDocument();
      expect(obtener).toHaveBeenCalledWith(1, expect.anything());
      expect(listarRecomendaciones).toHaveBeenCalledWith(50, expect.anything());

      expect(screen.getByText("Estudiantes con ganas de aprender desarrollo web full stack.")).toBeInTheDocument();
      expect(screen.getByText("Entregar un MVP funcional en dos meses.")).toBeInTheDocument();
      expect(screen.getByText(/USD 300 por mes/)).toBeInTheDocument();
      expect(screen.getByText("Trabajo en equipo")).toBeInTheDocument();
      expect(screen.getByText("Acme SA", { exact: false })).toBeInTheDocument();

      const compat = await screen.findByRole("region", { name: "Tu compatibilidad" });
      expect(within(compat).getByRole("img", { name: "Compatibilidad: 82 % (alta)" })).toBeInTheDocument();
      const desglose = within(compat).getByRole("list", { name: "Desglose de la compatibilidad" });
      expect(within(desglose).getByText("90 %")).toBeInTheDocument();
      expect(within(desglose).getByText("70 %")).toBeInTheDocument();
      expect(within(desglose).getByText("No se evalúa en esta configuración")).toBeInTheDocument();
      expect(within(compat).getByText("Ya cumplís 2 de 3 tecnologías que pide el proyecto.")).toBeInTheDocument();
    });

    it("marca cada tecnología como obligatoria o deseable y si la tiene o le falta (también en texto)", async () => {
      montar({ recomendaciones: [recomendacionDe({ tecnologiasCoincidentes: ["React"], tecnologiasFaltantes: ["Node.js", "PostgreSQL"] })] });
      const lista = await screen.findByRole("list", { name: "Tecnologías que pide el proyecto" });

      expect(within(lista).getByText(/React/)).toHaveTextContent("(obligatoria, la tenés)");
      expect(within(lista).getByText(/Node\.js/)).toHaveTextContent("(obligatoria, te falta)");
      expect(within(lista).getByText(/PostgreSQL/)).toHaveTextContent("(deseable, te falta)");
    });

    it("sin recomendación para este proyecto lo aclara y marca las tecnologías según su perfil", async () => {
      montar({ recomendaciones: [] });

      expect(await screen.findByText(/no figura entre tus recomendaciones/)).toBeInTheDocument();
      expect(screen.getByText(/React/, { selector: "li" })).toHaveTextContent("(obligatoria, la tenés)");
    });

    it("Postularme abre un diálogo y envía la postulación con el mensaje opcional", async () => {
      const { usuario, crear, listarMias } = montar();
      await usuario.click(await screen.findByRole("button", { name: "Postularme" }));

      const dialogo = screen.getByRole("dialog", { name: "Confirmar postulación" });
      expect(dialogo).toHaveAccessibleDescription(/Vas a postularte a «Sistema de turnos para un club»/);
      expect(within(dialogo).getByLabelText("Mensaje de presentación (opcional)")).toHaveFocus();

      listarMias.mockResolvedValue([POSTULACION]);
      await usuario.type(within(dialogo).getByLabelText("Mensaje de presentación (opcional)"), "  Quiero sumar experiencia  ");
      await usuario.click(within(dialogo).getByRole("button", { name: "Enviar postulación" }));

      expect(crear).toHaveBeenCalledWith({ idProyecto: 1, mensajePresentacion: "Quiero sumar experiencia" });
      expect(await screen.findByText("Postulación enviada")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(await screen.findByText("Ya te postulaste")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Postularme" })).not.toBeInTheDocument();
    });

    it("sin mensaje manda solo el proyecto, sin la clave del mensaje", async () => {
      const { usuario, crear } = montar();
      await usuario.click(await screen.findByRole("button", { name: "Postularme" }));
      await usuario.click(screen.getByRole("button", { name: "Enviar postulación" }));

      expect(crear).toHaveBeenCalledTimes(1);
      expect(crear.mock.calls[0][0]).toEqual({ idProyecto: 1 });
    });

    it("Cancelar cierra el diálogo sin postularse", async () => {
      const { usuario, crear } = montar();
      await usuario.click(await screen.findByRole("button", { name: "Postularme" }));
      await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(crear).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Postularme" })).toHaveFocus();
    });

    it("409: si ya se había postulado, el diálogo muestra el mensaje del servidor y la pantalla pasa a Ya te postulaste", async () => {
      const { usuario, crear, listarMias } = montar();
      await usuario.click(await screen.findByRole("button", { name: "Postularme" }));
      crear.mockRejectedValue(errorApi(409, "Ya te postulaste a este proyecto."));
      listarMias.mockResolvedValue([POSTULACION]);

      await usuario.click(screen.getByRole("button", { name: "Enviar postulación" }));

      expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Ya te postulaste a este proyecto.");
      expect(await screen.findByText("Ya te postulaste")).toBeInTheDocument();
    });

    it("si el envío falla por otro motivo, el diálogo sigue abierto con el error y no avisa éxito", async () => {
      const { usuario, crear } = montar();
      await usuario.click(await screen.findByRole("button", { name: "Postularme" }));
      crear.mockRejectedValue(errorApi(422, "El proyecto ya no recibe postulaciones."));

      await usuario.click(screen.getByRole("button", { name: "Enviar postulación" }));

      expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("El proyecto ya no recibe postulaciones.");
      expect(screen.queryByText("Postulación enviada")).not.toBeInTheDocument();
    });

    it("si ya se postuló muestra el estado actual y un enlace al seguimiento, sin botón para postularse", async () => {
      montar({ mias: [{ ...POSTULACION, estado: "en_revision" }] });

      const aviso = await screen.findByText("Ya te postulaste");
      expect(aviso).toBeInTheDocument();
      expect(screen.getByText("En revisión")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ver el seguimiento" })).toHaveAttribute("href", "/postulaciones");
      expect(screen.queryByRole("button", { name: "Postularme" })).not.toBeInTheDocument();
    });

    it("una postulación a otro proyecto no cuenta como postulación a este", async () => {
      montar({ mias: [{ ...POSTULACION, proyecto: { ...POSTULACION.proyecto, idProyecto: 99 } }] });
      expect(await screen.findByRole("button", { name: "Postularme" })).toBeInTheDocument();
    });

    it("con una invitación pendiente invita a responderla en lugar de postularse", async () => {
      montar({ recomendaciones: [recomendacionDe({ invitacionPendiente: { idInvitacion: 51 } })] });

      expect(await screen.findByText("Te invitaron a este proyecto")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Responder la invitación" })).toHaveAttribute("href", "/invitaciones");
      expect(screen.queryByRole("button", { name: "Postularme" })).not.toBeInTheDocument();
    });

    it("un proyecto que ya no está publicado no admite postulaciones", async () => {
      montar({ proyecto: { estado: "en_curso" } });

      expect(await screen.findByText(/está en curso y no recibe postulaciones/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Postularme" })).not.toBeInTheDocument();
    });

    it("si no se pudo traer el desglose, igual se puede ver el proyecto y postularse", async () => {
      sesion.usuario = usuarioDe("estudiante");
      sesion.perfil = PERFIL_ESTUDIANTE;
      vi.spyOn(api.proyectos, "obtener").mockResolvedValue(PROYECTO);
      vi.spyOn(api.postulaciones, "mias").mockResolvedValue([]);
      vi.spyOn(api.matching, "recomendaciones").mockRejectedValue(errorApi(500, "Falló."));
      render(
        <ToastProvider>
          <ProyectoDetalle idProyecto={1} />
        </ToastProvider>,
      );

      expect(await screen.findByRole("button", { name: "Postularme" })).toBeInTheDocument();
    });
  });

  describe("estudiante con el perfil incompleto", () => {
    it("invita a completarlo y no ofrece postularse ni pide recomendaciones", async () => {
      const { listarRecomendaciones } = montar({ usuario: usuarioDe("estudiante", { perfilCompleto: false }), perfil: null });

      expect(await screen.findByRole("link", { name: "Completar mi perfil" })).toHaveAttribute("href", "/perfil");
      expect(screen.queryByRole("button", { name: "Postularme" })).not.toBeInTheDocument();
      expect(listarRecomendaciones).not.toHaveBeenCalled();
    });
  });

  describe("publicadores", () => {
    it("el dueño ve cuántas postulaciones recibió y un enlace para administrar el proyecto", async () => {
      const { listarMias } = montar({
        usuario: usuarioDe("empresa"),
        perfil: null,
        proyecto: { cantidadPostulaciones: 3 },
      });

      expect(await screen.findByRole("heading", { name: "Es tu proyecto" })).toBeInTheDocument();
      expect(screen.getByText("3 postulaciones recibidas.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Administrar proyecto" })).toHaveAttribute("href", "/mis-proyectos/1");
      expect(screen.queryByRole("button", { name: "Postularme" })).not.toBeInTheDocument();
      expect(listarMias).not.toHaveBeenCalled();
    });

    it("otro publicador ve el proyecto sin acciones de gestión ni de postulación", async () => {
      montar({ usuario: usuarioDe("docente", { idUsuario: 55 }), perfil: null });

      await screen.findByRole("heading", { level: 1 });
      expect(screen.queryByRole("heading", { name: "Es tu proyecto" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Postularme" })).not.toBeInTheDocument();
    });
  });

  describe("errores de la página", () => {
    it("404: dice que no existe y ofrece volver a la búsqueda", async () => {
      const { obtener } = montar();
      obtener.mockRejectedValue(errorApi(404, "Proyecto inexistente."));
      // El montaje ya pidió el proyecto una vez; se vuelve a montar con el error configurado.
      document.body.innerHTML = "";
      render(
        <ToastProvider>
          <ProyectoDetalle idProyecto={77} />
        </ToastProvider>,
      );

      expect(await screen.findByRole("heading", { name: "No encontramos este proyecto" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Volver a la búsqueda" })).toHaveAttribute("href", "/proyectos");
    });

    it("403: avisa que no tiene permiso", async () => {
      sesion.usuario = usuarioDe("estudiante");
      sesion.perfil = PERFIL_ESTUDIANTE;
      vi.spyOn(api.proyectos, "obtener").mockRejectedValue(errorApi(403, "Sin permiso."));
      vi.spyOn(api.postulaciones, "mias").mockResolvedValue([]);
      vi.spyOn(api.matching, "recomendaciones").mockResolvedValue([]);
      render(
        <ToastProvider>
          <ProyectoDetalle idProyecto={1} />
        </ToastProvider>,
      );

      expect(await screen.findByRole("heading", { name: "No tenés permiso para ver este proyecto" })).toBeInTheDocument();
    });

    it("una falla del servidor muestra el mensaje y reintenta al pedirlo", async () => {
      sesion.usuario = usuarioDe("estudiante");
      sesion.perfil = PERFIL_ESTUDIANTE;
      const obtener = vi
        .spyOn(api.proyectos, "obtener")
        .mockRejectedValueOnce(errorApi(500, "Falló la base de datos."))
        .mockResolvedValue(PROYECTO);
      vi.spyOn(api.postulaciones, "mias").mockResolvedValue([]);
      vi.spyOn(api.matching, "recomendaciones").mockResolvedValue([]);
      const usuario = userEvent.setup();
      render(
        <ToastProvider>
          <ProyectoDetalle idProyecto={1} />
        </ToastProvider>,
      );

      expect(await screen.findByRole("heading", { name: "No pudimos cargar este proyecto" })).toBeInTheDocument();
      expect(screen.getByText("Falló la base de datos.")).toBeInTheDocument();
      await usuario.click(screen.getByRole("button", { name: "Reintentar" }));

      expect(await screen.findByRole("heading", { level: 1, name: "Sistema de turnos para un club" })).toBeInTheDocument();
      expect(obtener).toHaveBeenCalledTimes(2);
    });

    it("un identificador inválido se trata como inexistente y no pide nada a la API", async () => {
      const { obtener } = montar({ id: Number.NaN });

      expect(await screen.findByRole("heading", { name: "No encontramos este proyecto" })).toBeInTheDocument();
      expect(obtener).not.toHaveBeenCalled();
    });
  });

  it("no tiene problemas de accesibilidad que axe pueda detectar", async () => {
    montar();
    await screen.findByRole("heading", { level: 1, name: "Sistema de turnos para un club" });
    expect(await violacionesA11y()).toEqual([]);
  });
});
