import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { RecomendacionProyecto, Usuario } from "@/lib/api/types";
import { POSTULACION, proyectoDe, recomendacionDe, usuarioDe } from "@/features/proyectos/fixtures";
import { RecomendacionesPage } from "./RecomendacionesPage";

const { sesion } = vi.hoisted(() => ({ sesion: { usuario: null } as { usuario: unknown } }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => sesion }));

const LISTA = [
  recomendacionDe({ proyecto: proyectoDe({ idProyecto: 1, titulo: "Sistema de turnos", modalidad: "remoto" }), puntajeTotal: 0.82 }),
  recomendacionDe({
    proyecto: proyectoDe({ idProyecto: 2, titulo: "Panel de métricas", modalidad: "presencial" }),
    puntajeTotal: 0.55,
    puntajes: { tecnologias: 0.5, texto: null, contexto: 0.6 },
    tecnologiasCoincidentes: ["React"],
    tecnologiasFaltantes: ["Node.js", "PostgreSQL"],
  }),
  recomendacionDe({
    proyecto: proyectoDe({ idProyecto: 3, titulo: "App de reservas", modalidad: "remoto" }),
    puntajeTotal: 0.9,
    postulacion: { idPostulacion: 11, estado: "en_revision" },
  }),
];

function montar(respuesta: RecomendacionProyecto[] = LISTA, usuario: Usuario = usuarioDe("estudiante")) {
  sesion.usuario = usuario;
  const consulta = vi.spyOn(api.matching, "recomendaciones").mockResolvedValue(respuesta);
  const persona = userEvent.setup();
  render(<RecomendacionesPage />);
  return { persona, consulta };
}

const titulos = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("RecomendacionesPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("muestra una carga accesible y luego cada proyecto con su aro de compatibilidad y el desglose", async () => {
    const { consulta } = montar();
    expect(screen.getByText("Cargando tus recomendaciones")).toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toHaveAttribute("href", "/proyectos/1");
    expect(consulta).toHaveBeenCalledWith(30, expect.anything());
    expect(screen.getByRole("img", { name: "Compatibilidad: 82 % (alta)" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Compatibilidad: 55 % (media)" })).toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: "Desglose de la compatibilidad" })).toHaveLength(3);
    // El motor v1 no evalúa el texto: se dice en palabras, no con un cero engañoso.
    expect(screen.getAllByText("No se evalúa en esta configuración")).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "Ver proyecto" })[0]).toHaveAttribute("href", "/proyectos/1");
  });

  it("respeta el orden que devuelve el motor (de mayor a menor compatibilidad)", async () => {
    montar([LISTA[2], LISTA[0], LISTA[1]]);
    await screen.findByRole("link", { name: "App de reservas" });
    expect(titulos()).toEqual(["App de reservas", "Sistema de turnos", "Panel de métricas"]);
  });

  it("explica en lenguaje simple qué tecnologías coinciden y cuáles faltan", async () => {
    montar();
    await screen.findByRole("link", { name: "Panel de métricas" });
    expect(screen.getAllByText("Coincidís en 2 de 3 tecnologías que pide el proyecto.")).toHaveLength(2);
    expect(screen.getAllByText("Te falta: PostgreSQL.")).toHaveLength(2);
    expect(screen.getByText("Coincidís en 1 de 3 tecnologías que pide el proyecto.")).toBeInTheDocument();
    expect(screen.getByText("Te faltan: Node.js y PostgreSQL.")).toBeInTheDocument();
  });

  it("avisa si ya te postulaste o si te invitaron a ese proyecto", async () => {
    montar([
      recomendacionDe({ postulacion: { idPostulacion: POSTULACION.idPostulacion, estado: "en_revision" } }),
      recomendacionDe({ proyecto: proyectoDe({ idProyecto: 9, titulo: "Con invitación" }), invitacionPendiente: { idInvitacion: 51 } }),
    ]);
    await screen.findByRole("link", { name: "Con invitación" });
    expect(screen.getByText(/Ya te postulaste/)).toHaveTextContent("En revisión");
    expect(screen.getByRole("link", { name: "Te invitaron a este proyecto" })).toHaveAttribute("href", "/invitaciones");
  });

  describe("filtros", () => {
    it("por modalidad deja solo los proyectos de esa modalidad y avisa cuántos se muestran", async () => {
      const { persona } = montar();
      await screen.findByRole("link", { name: "Sistema de turnos" });
      expect(screen.getByRole("status")).toHaveTextContent("Mostrando 3 de 3 recomendaciones.");

      await persona.selectOptions(screen.getByLabelText("Modalidad"), "presencial");

      expect(titulos()).toEqual(["Panel de métricas"]);
      expect(screen.getByRole("status")).toHaveTextContent("Mostrando 1 de 3 recomendaciones.");
    });

    it("por compatibilidad mínima oculta los proyectos por debajo del umbral", async () => {
      const { persona } = montar();
      await screen.findByRole("link", { name: "Sistema de turnos" });

      await persona.selectOptions(screen.getByLabelText("Compatibilidad mínima"), "75");

      expect(titulos()).toEqual(["Sistema de turnos", "App de reservas"]);
    });

    it("puede ocultar los proyectos a los que ya se postuló", async () => {
      const { persona } = montar();
      await screen.findByRole("link", { name: "App de reservas" });

      await persona.click(screen.getByRole("checkbox", { name: "Ocultar los que ya me postulé" }));

      expect(titulos()).toEqual(["Sistema de turnos", "Panel de métricas"]);
    });

    it("si ninguno cumple muestra un estado vacío con la salida para quitar los filtros", async () => {
      const { persona } = montar();
      await screen.findByRole("link", { name: "Sistema de turnos" });
      await persona.selectOptions(screen.getByLabelText("Modalidad"), "hibrido");

      expect(screen.getByText("Ninguna recomendación cumple esos filtros")).toBeInTheDocument();

      await persona.click(screen.getByRole("button", { name: "Quitar los filtros" }));

      expect(titulos()).toHaveLength(3);
      expect(screen.getByLabelText("Modalidad")).toHaveValue("");
    });
  });

  describe("estados de la pantalla", () => {
    it("con el perfil incompleto no consulta al motor y invita a completar el perfil", () => {
      const { consulta } = montar(LISTA, usuarioDe("estudiante", { perfilCompleto: false }));

      expect(screen.getByRole("heading", { name: "Completá tu perfil para ver recomendaciones" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Completar mi perfil" })).toHaveAttribute("href", "/perfil");
      expect(consulta).not.toHaveBeenCalled();
    });

    it("sin recomendaciones explica por qué y ofrece mejorar el perfil o explorar proyectos", async () => {
      montar([]);

      expect(await screen.findByRole("heading", { name: "Todavía no hay recomendaciones para vos" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Mejorar mi perfil" })).toHaveAttribute("href", "/perfil");
      expect(screen.getByRole("link", { name: "Explorar proyectos" })).toHaveAttribute("href", "/proyectos");
    });

    it("si falla la carga muestra el error y permite reintentar", async () => {
      sesion.usuario = usuarioDe("estudiante");
      const consulta = vi
        .spyOn(api.matching, "recomendaciones")
        .mockRejectedValueOnce(new ApiError({ statusCode: 500, error: "Error", message: "El servidor no respondió" }))
        .mockResolvedValue(LISTA);
      const persona = userEvent.setup();
      render(<RecomendacionesPage />);

      expect(await screen.findByText("No pudimos cargar tus recomendaciones")).toBeInTheDocument();
      expect(screen.getByText("El servidor no respondió")).toBeInTheDocument();

      await persona.click(screen.getByRole("button", { name: /Reintentar/ }));

      expect(await screen.findByRole("link", { name: "Sistema de turnos" })).toBeInTheDocument();
      expect(consulta).toHaveBeenCalledTimes(2);
    });

    it("si el servidor responde 403 muestra el motivo en lugar de la lista", async () => {
      sesion.usuario = usuarioDe("estudiante");
      vi.spyOn(api.matching, "recomendaciones").mockRejectedValue(
        new ApiError({ statusCode: 403, error: "Forbidden", message: "Solo los estudiantes reciben recomendaciones" }),
      );
      render(<RecomendacionesPage />);

      expect(await screen.findByText("Solo los estudiantes reciben recomendaciones")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Ver proyecto" })).not.toBeInTheDocument();
    });
  });
});
