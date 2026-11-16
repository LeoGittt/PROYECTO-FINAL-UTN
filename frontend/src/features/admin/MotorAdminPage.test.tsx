import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { ConfiguracionMotor, Evaluacion, MatchReferencia, UsuarioAdmin } from "@/lib/api/types";
import { proyectoDe } from "@/features/proyectos/fixtures";
import { MotorAdminPage } from "./MotorAdminPage";

const CONFIGURACIONES: ConfiguracionMotor[] = [
  { idConfiguracion: 1, nombre: "v1", descripcion: "Tecnologías y contexto.", pesoTecnologias: 0.6, pesoTexto: 0, pesoContexto: 0.4, umbralRecomendacion: 0.5, activa: true },
  { idConfiguracion: 2, nombre: "v2", descripcion: "Suma similitud de textos.", pesoTecnologias: 0.5, pesoTexto: 0.2, pesoContexto: 0.3, umbralRecomendacion: 0.55, activa: false },
];

const REFERENCIA: MatchReferencia[] = [
  { idMatchReferencia: 1, idEstudiante: 1, estudiante: "Ana Pérez", idProyecto: 2, proyecto: "Turnos del club", esRelevante: true, observacion: "Perfil ideal" },
  { idMatchReferencia: 2, idEstudiante: 3, estudiante: "Luis Díaz", idProyecto: 2, proyecto: "Turnos del club", esRelevante: false, observacion: null },
];

const EVALUACION: Evaluacion = {
  idEvaluacion: 5,
  idConfiguracion: 1,
  configuracion: "v1",
  fechaEjecucion: "2026-11-10T12:00:00Z",
  k: 5,
  cantidadEstudiantes: 12,
  precisionGlobal: 0.9333,
  recallGlobal: 0.8,
  precisionTopK: 0.9,
  observaciones: null,
};

const ESTUDIANTES: UsuarioAdmin[] = [
  { idUsuario: 30, nombre: "Ana", apellido: "Pérez", email: "ana@utn.edu.ar", rol: "estudiante", activo: true, fechaRegistro: "2026-04-10T12:00:00Z", idEstudiante: 1 },
  { idUsuario: 31, nombre: "Marta", apellido: "Sosa", email: "marta@utn.edu.ar", rol: "estudiante", activo: true, fechaRegistro: "2026-04-11T12:00:00Z", idEstudiante: 4 },
  // Sin perfil completo: no se puede etiquetar.
  { idUsuario: 32, nombre: "Nico", apellido: "Vera", email: "nico@utn.edu.ar", rol: "estudiante", activo: true, fechaRegistro: "2026-04-12T12:00:00Z", idEstudiante: null },
];

const PROYECTOS = [
  proyectoDe({ idProyecto: 2, titulo: "Turnos del club", estado: "publicado" }),
  proyectoDe({ idProyecto: 9, titulo: "Borrador interno", estado: "borrador" }),
];

function montar() {
  const usuarios = vi
    .spyOn(api.admin, "usuarios")
    .mockResolvedValue({ items: ESTUDIANTES, total: ESTUDIANTES.length, pagina: 1, tamano: 100 });
  vi.spyOn(api.admin, "proyectos").mockResolvedValue(PROYECTOS);
  const configuraciones = vi.spyOn(api.matching, "configuraciones").mockResolvedValue(CONFIGURACIONES);
  const referencia = vi.spyOn(api.matching, "referencia").mockResolvedValue(REFERENCIA);
  const evaluaciones = vi.spyOn(api.matching, "evaluaciones").mockResolvedValue([EVALUACION]);
  const persona = userEvent.setup();
  render(
    <ToastProvider>
      <MotorAdminPage />
    </ToastProvider>,
  );
  return { configuraciones, referencia, evaluaciones, usuarios, persona };
}

const tarjeta = (nombre: string) => within(screen.getByRole("heading", { name: nombre }).closest("article") as HTMLElement);
const dialogo = () => within(screen.getByRole("dialog"));
const filaDe = (texto: string) => within(screen.getByText(texto).closest("tr") as HTMLElement);

describe("MotorAdminPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  describe("Configuraciones", () => {
    it("muestra cada configuración con sus pesos y umbral, y cuál está activa", async () => {
      montar();
      expect(await screen.findByRole("heading", { name: "v1" })).toBeInTheDocument();
      const v1 = tarjeta("v1");
      expect(v1.getByText("Activa")).toBeInTheDocument();
      expect(v1.getByText("Tecnologías").nextElementSibling).toHaveTextContent("60 %");
      expect(v1.getByText("Texto").nextElementSibling).toHaveTextContent("0 %");
      expect(v1.getByText("Contexto").nextElementSibling).toHaveTextContent("40 %");
      expect(v1.getByText("Umbral de recomendación").nextElementSibling).toHaveTextContent("50 %");
      expect(v1.queryByRole("button", { name: /Activar/ })).not.toBeInTheDocument();
      expect(tarjeta("v2").getByText("Umbral de recomendación").nextElementSibling).toHaveTextContent("55 %");
      expect(tarjeta("v2").getByRole("button", { name: "Activar v2" })).toBeInTheDocument();
    });

    it("activar una configuración pide confirmación, muestra los pares recalculados y recarga", async () => {
      const { configuraciones, persona } = montar();
      const activar = vi.spyOn(api.matching, "activarConfiguracion").mockResolvedValue({ pares: 1234, milisegundos: 85 });
      await persona.click(await screen.findByRole("button", { name: "Activar v2" }));
      await persona.click(dialogo().getByRole("button", { name: "Sí, activar" }));

      expect(activar).toHaveBeenCalledWith(2);
      expect(await screen.findByText("Se recalcularon 1.234 pares en 85 ms.")).toBeInTheDocument();
      expect(configuraciones).toHaveBeenCalledTimes(2);
    });

    it("recalcula todos los puntajes con la configuración activa y muestra el resultado", async () => {
      const { persona } = montar();
      const recalcular = vi.spyOn(api.matching, "recalcular").mockResolvedValue({ pares: 40, milisegundos: 12 });
      await screen.findByRole("heading", { name: "v1" });
      await persona.click(screen.getByRole("button", { name: "Recalcular puntajes" }));

      expect(recalcular).toHaveBeenCalledTimes(1);
      expect(await screen.findByText("Se recalcularon 40 pares en 12 ms.")).toBeInTheDocument();
    });

    it("si el recálculo falla, avisa el motivo", async () => {
      const { persona } = montar();
      vi.spyOn(api.matching, "recalcular").mockRejectedValue(
        new ApiError({ statusCode: 500, error: "Error", message: "Ocurrió un error en el servidor." }),
      );
      await screen.findByRole("heading", { name: "v1" });
      await persona.click(screen.getByRole("button", { name: "Recalcular puntajes" }));
      expect(await screen.findByText("Ocurrió un error en el servidor.")).toBeInTheDocument();
      expect(screen.getByText("No se pudo recalcular")).toBeInTheDocument();
    });
  });

  describe("Conjunto de referencia", () => {
    async function abrir() {
      const montado = montar();
      await montado.persona.click(await screen.findByRole("tab", { name: "Conjunto de referencia" }));
      await screen.findByText("Ana Pérez");
      return montado;
    }

    it("lista los pares etiquetados con su etiqueta y un resumen", async () => {
      const { referencia } = await abrir();
      expect(referencia).toHaveBeenCalledTimes(1);
      expect(filaDe("Ana Pérez").getByText("Buen match")).toBeInTheDocument();
      expect(filaDe("Ana Pérez").getByText("Perfil ideal")).toBeInTheDocument();
      expect(filaDe("Luis Díaz").getByText("Mal match")).toBeInTheDocument();
      expect(screen.getByText("2 pares etiquetados: 1 como buen match y 1 como mal match.")).toBeInTheDocument();
    });

    it("ofrece solo los estudiantes con perfil y los proyectos que puntúa el motor (sin borradores)", async () => {
      const { usuarios } = await abrir();
      expect(usuarios).toHaveBeenCalledWith({ rol: "estudiante", tamano: 100 }, expect.anything());
      const estudiante = await screen.findByLabelText(/^Estudiante/);
      await within(estudiante).findByRole("option", { name: "Pérez, Ana (ana@utn.edu.ar)" });
      expect(within(estudiante).getByRole("option", { name: "Sosa, Marta (marta@utn.edu.ar)" })).toBeInTheDocument();
      expect(within(estudiante).queryByRole("option", { name: /Vera/ })).not.toBeInTheDocument();
      const proyecto = screen.getByLabelText(/^Proyecto/);
      expect(within(proyecto).getByRole("option", { name: "Turnos del club (N.º 2)" })).toBeInTheDocument();
      expect(within(proyecto).queryByRole("option", { name: /Borrador interno/ })).not.toBeInTheDocument();
    });

    it("etiqueta un par nuevo (upsert) después de validar que se eligió estudiante y proyecto", async () => {
      const { referencia, persona } = await abrir();
      const guardar = vi.spyOn(api.matching, "guardarReferencia").mockResolvedValue({ ...REFERENCIA[1], idMatchReferencia: 3 });

      await persona.click(screen.getByRole("button", { name: "Guardar etiqueta" }));
      expect(guardar).not.toHaveBeenCalled();
      expect(screen.getByText("Elegí el estudiante.")).toBeInTheDocument();
      expect(screen.getByText("Elegí el proyecto.")).toBeInTheDocument();

      await within(screen.getByLabelText(/^Estudiante/)).findByRole("option", { name: /Sosa/ });
      await persona.selectOptions(screen.getByLabelText(/^Estudiante/), "4");
      await persona.selectOptions(screen.getByLabelText(/^Proyecto/), "2");
      await persona.selectOptions(screen.getByLabelText("Etiqueta"), "no");
      await persona.type(screen.getByLabelText(/Observación/), "No le dan las horas.");
      await persona.click(screen.getByRole("button", { name: "Guardar etiqueta" }));

      expect(guardar).toHaveBeenCalledWith({ idEstudiante: 4, idProyecto: 2, esRelevante: false, observacion: "No le dan las horas." });
      expect(await screen.findByText("Conjunto de referencia actualizado")).toBeInTheDocument();
      expect(referencia).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText(/^Estudiante/)).toHaveValue("");
    });

    it("si el servidor rechaza el par, muestra su mensaje en el formulario", async () => {
      const { persona } = await abrir();
      vi.spyOn(api.matching, "guardarReferencia").mockRejectedValue(
        new ApiError({ statusCode: 404, error: "Not Found", message: "El estudiante no existe." }),
      );
      await within(screen.getByLabelText(/^Estudiante/)).findByRole("option", { name: /Pérez/ });
      await persona.selectOptions(screen.getByLabelText(/^Estudiante/), "1");
      await persona.selectOptions(screen.getByLabelText(/^Proyecto/), "2");
      await persona.click(screen.getByRole("button", { name: "Guardar etiqueta" }));
      expect(await screen.findByText("El estudiante no existe.")).toBeInTheDocument();
    });

    it("cambia la etiqueta de un par existente con el mismo upsert", async () => {
      const { referencia, persona } = await abrir();
      const guardar = vi.spyOn(api.matching, "guardarReferencia").mockResolvedValue({ ...REFERENCIA[0], esRelevante: false });
      await persona.click(screen.getByRole("button", { name: "Cambiar a mal match: Ana Pérez en Turnos del club" }));

      expect(guardar).toHaveBeenCalledWith({ idEstudiante: 1, idProyecto: 2, esRelevante: false, observacion: "Perfil ideal" });
      await vi.waitFor(() => expect(referencia).toHaveBeenCalledTimes(2));
    });

    it("elimina un par después de confirmar", async () => {
      const { referencia, persona } = await abrir();
      const eliminar = vi.spyOn(api.matching, "eliminarReferencia").mockResolvedValue(undefined);
      await persona.click(screen.getByRole("button", { name: "Eliminar: Luis Díaz en Turnos del club" }));
      await persona.click(dialogo().getByRole("button", { name: "Sí, eliminar" }));

      expect(eliminar).toHaveBeenCalledWith(2);
      expect(await screen.findByText("Par eliminado")).toBeInTheDocument();
      expect(referencia).toHaveBeenCalledTimes(2);
    });
  });

  describe("Evaluaciones", () => {
    async function abrir() {
      const montado = montar();
      await montado.persona.click(await screen.findByRole("tab", { name: "Evaluaciones" }));
      await screen.findByRole("table", { name: "Historial de evaluaciones" });
      return montado;
    }

    it("muestra el historial con las métricas como porcentaje", async () => {
      await abrir();
      const fila = within(screen.getAllByRole("row")[1]);
      expect(fila.getByText("v1")).toBeInTheDocument();
      expect(fila.getByText("93 %")).toBeInTheDocument();
      expect(fila.getByText("80 %")).toBeInTheDocument();
      expect(fila.getByText("90 %")).toBeInTheDocument();
      expect(fila.getByText("12")).toBeInTheDocument();
    });

    it("ejecuta una evaluación con la configuración y el k elegidos, muestra el resultado y recarga el historial", async () => {
      const { evaluaciones, persona } = await abrir();
      const evaluar = vi.spyOn(api.matching, "evaluar").mockResolvedValue({
        ...EVALUACION,
        idEvaluacion: 6,
        idConfiguracion: 2,
        configuracion: "v2",
        k: 3,
        precisionGlobal: 0.75,
        recallGlobal: 0.6,
        precisionTopK: 0.7,
      });

      await persona.selectOptions(await screen.findByLabelText(/Configuración/), "2");
      await persona.clear(screen.getByLabelText(/^k/));
      await persona.type(screen.getByLabelText(/^k/), "3");
      await persona.click(screen.getByRole("button", { name: "Ejecutar evaluación" }));

      expect(evaluar).toHaveBeenCalledWith({ idConfiguracion: 2, k: 3 });
      const resultado = within(await screen.findByRole("region", { name: "Resultado de v2 con k = 3" }));
      expect(resultado.getByText("Precisión global").nextElementSibling).toHaveTextContent("75 %");
      expect(resultado.getByText("Recall global").nextElementSibling).toHaveTextContent("60 %");
      expect(resultado.getByText("Precisión en el top-3").nextElementSibling).toHaveTextContent("70 %");
      expect(evaluaciones).toHaveBeenCalledTimes(2);
    });

    it("valida que haya configuración y un k entero de 1 a 50", async () => {
      const { persona } = await abrir();
      const evaluar = vi.spyOn(api.matching, "evaluar");
      await persona.clear(screen.getByLabelText(/^k/));
      await persona.type(screen.getByLabelText(/^k/), "0");
      await persona.click(screen.getByRole("button", { name: "Ejecutar evaluación" }));

      expect(evaluar).not.toHaveBeenCalled();
      expect(screen.getByText("Elegí qué configuración evaluar.")).toBeInTheDocument();
      expect(screen.getByText("k tiene que ser un número entero entre 1 y 50.")).toBeInTheDocument();
    });

    it("no acepta un k mayor que 50, el máximo que admite el servidor", async () => {
      const { persona } = await abrir();
      const evaluar = vi.spyOn(api.matching, "evaluar");
      await persona.selectOptions(await screen.findByLabelText(/Configuración/), "2");
      await persona.clear(screen.getByLabelText(/^k/));
      await persona.type(screen.getByLabelText(/^k/), "51");
      await persona.click(screen.getByRole("button", { name: "Ejecutar evaluación" }));

      expect(evaluar).not.toHaveBeenCalled();
      expect(screen.getByText("k tiene que ser un número entero entre 1 y 50.")).toBeInTheDocument();
    });

    it("sin evaluaciones todavía, lo dice", async () => {
      vi.spyOn(api.matching, "configuraciones").mockResolvedValue(CONFIGURACIONES);
      vi.spyOn(api.matching, "evaluaciones").mockResolvedValue([]);
      const persona = userEvent.setup();
      render(
        <ToastProvider>
          <MotorAdminPage />
        </ToastProvider>,
      );
      await persona.click(await screen.findByRole("tab", { name: "Evaluaciones" }));
      expect(await screen.findByText("Todavía no hay evaluaciones")).toBeInTheDocument();
    });
  });
});
