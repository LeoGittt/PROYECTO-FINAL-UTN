"use client";

import { FlaskConical, ListChecks, Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { AsyncView } from "@/components/ui/AsyncView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { Errores } from "@/features/auth/validacion";
import { useFormularioPerfil } from "@/features/perfil/useFormularioPerfil";
import { mensajeDeError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { ConfiguracionMotor, Evaluacion, MatchReferencia, ResultadoRecalculo } from "@/lib/api/types";
import { formatearFechaHora, formatearNumero, formatearPorcentaje } from "@/lib/format";
import { textoONull } from "@/lib/forms";
import { useApiQuery } from "@/lib/hooks/useApiQuery";

const esEnteroPositivo = (texto: string) => /^\d+$/.test(texto.trim()) && Number(texto) >= 1;

/** `/admin/motor`: configuraciones del motor, conjunto de referencia y evaluaciones (RF-10). */
export function MotorAdminPage() {
  return (
    <>
      <PageHeader
        etiqueta="Administración"
        titulo="Motor de matching"
        descripcion="Elegí qué configuración usan las recomendaciones, etiquetá pares de referencia y medí qué tan bien recomienda cada configuración."
      />
      <Tabs
        etiqueta="Secciones del motor"
        pestanas={[
          { id: "configuraciones", etiqueta: "Configuraciones", contenido: <Configuraciones /> },
          { id: "referencia", etiqueta: "Conjunto de referencia", contenido: <Referencia /> },
          { id: "evaluaciones", etiqueta: "Evaluaciones", contenido: <Evaluaciones /> },
        ]}
      />
    </>
  );
}

// --- Configuraciones --------------------------------------------------------

function Configuraciones() {
  const toast = useToast();
  const [aActivar, setAActivar] = useState<ConfiguracionMotor | null>(null);
  const [recalculo, setRecalculo] = useState<ResultadoRecalculo | null>(null);
  const [recalculando, setRecalculando] = useState(false);
  const consulta = useApiQuery("matching:configuraciones", (signal) => api.matching.configuraciones({ signal }), {
    esVacio: (lista) => lista.length === 0,
  });

  async function activar(c: ConfiguracionMotor) {
    setRecalculo(await api.matching.activarConfiguracion(c.idConfiguracion));
    toast.exito(`Las recomendaciones ya usan «${c.nombre}».`, "Configuración activada");
    consulta.recargar();
  }

  async function recalcular() {
    setRecalculando(true);
    try {
      setRecalculo(await api.matching.recalcular());
    } catch (falla) {
      toast.error(mensajeDeError(falla), "No se pudo recalcular");
    } finally {
      setRecalculando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-muted">
          Los puntajes se recalculan solos cuando cambia un perfil o un proyecto. Recalcular todo sirve después de cargar datos a mano.
        </p>
        <Button
          variante="secondary"
          cargando={recalculando}
          iconoIzquierda={<RefreshCw aria-hidden="true" className="size-4" />}
          onClick={recalcular}
        >
          Recalcular puntajes
        </Button>
      </div>

      {recalculo && (
        <Alert variante="success" titulo="Puntajes recalculados">
          Se recalcularon {formatearNumero(recalculo.pares)} pares en {formatearNumero(recalculo.milisegundos)} ms.
        </Alert>
      )}

      <AsyncView consulta={consulta} etiquetaCarga="Cargando las configuraciones" tituloError="No pudimos cargar las configuraciones">
        {(configuraciones) => (
          <>
            <h2 className="sr-only">Configuraciones del motor</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {configuraciones.map((c) => (
                <li key={c.idConfiguracion}>
                  <Card como="article" variante={c.activa ? "sticker" : "plana"} className="flex h-full flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle como="h3">{c.nombre}</CardTitle>
                      {c.activa && <Badge variante="success">Activa</Badge>}
                    </div>
                    {c.descripcion && <p className="text-sm text-muted">{c.descripcion}</p>}
                    <dl className="flex flex-col gap-2 text-sm">
                      {([
                        ["Tecnologías", c.pesoTecnologias],
                        ["Texto", c.pesoTexto],
                        ["Contexto", c.pesoContexto],
                        ["Umbral de recomendación", c.umbralRecomendacion],
                      ] as const).map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-3">
                          <dt className="text-muted">{etiqueta}</dt>
                          <dd className="flex items-center gap-3 font-semibold tabular-nums">
                            <span className="w-12 text-right">{formatearPorcentaje(valor)}</span>
                            <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                              <span className="block h-full rounded-full bg-primary" style={{ width: `${valor * 100}%` }} />
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {!c.activa && (
                      <Button
                        className="mt-auto self-start"
                        tamano="sm"
                        aria-label={`Activar ${c.nombre}`}
                        onClick={() => setAActivar(c)}
                      >
                        Activar
                      </Button>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </AsyncView>

      <ConfirmDialog
        abierto={aActivar !== null}
        alCerrar={() => setAActivar(null)}
        titulo={aActivar ? `¿Activar «${aActivar.nombre}»?` : ""}
        descripcion="Pasa a ser la configuración de las recomendaciones y se recalculan todos los puntajes. Puede tardar unos segundos."
        textoConfirmar="Sí, activar"
        alConfirmar={() => (aActivar ? activar(aActivar) : Promise.resolve())}
      />
    </div>
  );
}

// --- Conjunto de referencia --------------------------------------------------

interface ValoresReferencia {
  idEstudiante: string;
  idProyecto: string;
  esRelevante: "si" | "no";
  observacion: string;
}

const REFERENCIA_VACIA: ValoresReferencia = { idEstudiante: "", idProyecto: "", esRelevante: "si", observacion: "" };
const ORDEN_REFERENCIA = ["idEstudiante", "idProyecto", "esRelevante", "observacion"] as const;

function validarReferencia(v: ValoresReferencia): Errores<keyof ValoresReferencia> {
  const errores: Errores<keyof ValoresReferencia> = {};
  if (!v.idEstudiante) errores.idEstudiante = "Elegí el estudiante.";
  if (!v.idProyecto) errores.idProyecto = "Elegí el proyecto.";
  if (v.observacion.trim().length > 300) errores.observacion = "La observación no puede superar los 300 caracteres.";
  return errores;
}

const nombreDelPar = (r: MatchReferencia) => `${r.estudiante} en ${r.proyecto}`;

function Referencia() {
  const toast = useToast();
  const [valores, setValores] = useState<ValoresReferencia>(REFERENCIA_VACIA);
  const [aEliminar, setAEliminar] = useState<MatchReferencia | null>(null);
  const consulta = useApiQuery("matching:referencia", (signal) => api.matching.referencia({ signal }), {
    esVacio: (lista) => lista.length === 0,
  });
  // Opciones del formulario: los estudiantes con perfil (hasta 100, el máximo de una página) y los
  // proyectos que puntúa el motor, es decir, todos menos los borradores.
  const estudiantes = useApiQuery("admin:estudiantes", (signal) =>
    api.admin.usuarios({ rol: "estudiante", tamano: 100 }, { signal }),
  );
  const proyectos = useApiQuery("admin:proyectos-evaluables", (signal) => api.admin.proyectos(undefined, { signal }));
  const opcionesEstudiante = (estudiantes.data?.items ?? [])
    .filter((u) => u.idEstudiante !== null)
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
    .map((u) => ({ valor: String(u.idEstudiante), etiqueta: `${u.apellido}, ${u.nombre} (${u.email})` }));
  const opcionesProyecto = (proyectos.data ?? [])
    .filter((p) => p.estado !== "borrador")
    .map((p) => ({ valor: String(p.idProyecto), etiqueta: `${p.titulo} (N.º ${p.idProyecto})` }));
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar: validarReferencia,
    orden: ORDEN_REFERENCIA,
    construirPayload: (v) => ({
      idEstudiante: Number(v.idEstudiante),
      idProyecto: Number(v.idProyecto),
      esRelevante: v.esRelevante === "si",
      observacion: textoONull(v.observacion),
    }),
    alGuardar: async (payload) => {
      // PUT es un upsert: si el par ya estaba etiquetado, se reemplaza su etiqueta.
      await api.matching.guardarReferencia(payload);
      toast.exito("El par quedó etiquetado.", "Conjunto de referencia actualizado");
      setValores(REFERENCIA_VACIA);
      consulta.recargar();
    },
  });

  async function invertir(r: MatchReferencia) {
    try {
      await api.matching.guardarReferencia({
        idEstudiante: r.idEstudiante,
        idProyecto: r.idProyecto,
        esRelevante: !r.esRelevante,
        observacion: r.observacion,
      });
      toast.exito(`${nombreDelPar(r)} quedó como ${r.esRelevante ? "mal" : "buen"} match.`, "Etiqueta cambiada");
      consulta.recargar();
    } catch (falla) {
      toast.error(mensajeDeError(falla), "No se pudo cambiar la etiqueta");
    }
  }

  async function eliminar(r: MatchReferencia) {
    await api.matching.eliminarReferencia(r.idMatchReferencia);
    toast.exito(`${nombreDelPar(r)} ya no cuenta para las evaluaciones.`, "Par eliminado");
    consulta.recargar();
  }

  const cambiar = (campo: keyof ValoresReferencia) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <Card como="section" variante="plana" aria-labelledby="titulo-etiquetar">
        <CardTitle id="titulo-etiquetar" className="text-lg">
          Etiquetar un par
        </CardTitle>
        <p className="mt-1 text-sm text-muted">
          Indicá si el estudiante es un buen o un mal match para el proyecto. Si el par ya estaba etiquetado, se reemplaza.
        </p>
        <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-4 flex flex-col gap-4">
          {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              name="idEstudiante"
              label="Estudiante"
              hint="Solo los que completaron su perfil."
              placeholder={estudiantes.estado === "cargando" ? "Cargando…" : "Elegí un estudiante"}
              opciones={opcionesEstudiante}
              required
              value={valores.idEstudiante}
              error={errores.idEstudiante ?? (estudiantes.estado === "error" ? "No pudimos cargar los estudiantes." : undefined)}
              onChange={cambiar("idEstudiante")}
            />
            <Select
              name="idProyecto"
              label="Proyecto"
              hint="Los borradores no se evalúan."
              placeholder={proyectos.estado === "cargando" ? "Cargando…" : "Elegí un proyecto"}
              opciones={opcionesProyecto}
              required
              value={valores.idProyecto}
              error={errores.idProyecto ?? (proyectos.estado === "error" ? "No pudimos cargar los proyectos." : undefined)}
              onChange={cambiar("idProyecto")}
            />
            <Select
              name="esRelevante"
              label="Etiqueta"
              hint="¿Es una buena recomendación?"
              opciones={[
                { valor: "si", etiqueta: "Buen match" },
                { valor: "no", etiqueta: "Mal match" },
              ]}
              value={valores.esRelevante}
              onChange={cambiar("esRelevante")}
            />
          </div>
          <Textarea
            name="observacion"
            label="Observación (opcional)"
            rows={2}
            maxLength={300}
            mostrarContador
            value={valores.observacion}
            error={errores.observacion}
            onChange={cambiar("observacion")}
          />
          <Button type="submit" className="self-start" cargando={enviando}>
            Guardar etiqueta
          </Button>
        </form>
      </Card>

      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando el conjunto de referencia"
        tituloError="No pudimos cargar el conjunto de referencia"
        vacio={
          <EmptyState
            icono={<ListChecks className="size-7" />}
            titulo="Todavía no hay pares etiquetados"
            descripcion="Sin pares de referencia no se puede evaluar el motor."
          />
        }
      >
        {(pares) => {
          const buenos = pares.filter((r) => r.esRelevante).length;
          return (
            <section aria-labelledby="titulo-pares">
              <h2 id="titulo-pares" className="font-display text-lg font-semibold">
                Pares etiquetados
              </h2>
              <p role="status" className="mb-3 text-sm text-muted">
                {pares.length} {pares.length === 1 ? "par etiquetado" : "pares etiquetados"}: {buenos} como buen match y{" "}
                {pares.length - buenos} como mal match.
              </p>
              <DataTable
                caption="Conjunto de referencia"
                filas={pares}
                idDeFila={(r) => r.idMatchReferencia}
                columnas={[
                  {
                    clave: "estudiante",
                    titulo: "Estudiante",
                    celda: (r) => (
                      <>
                        <p className="font-semibold">{r.estudiante}</p>
                        <p className="text-sm text-muted">N.º {r.idEstudiante}</p>
                      </>
                    ),
                  },
                  {
                    clave: "proyecto",
                    titulo: "Proyecto",
                    celda: (r) => (
                      <>
                        <p>{r.proyecto}</p>
                        <p className="text-sm text-muted">N.º {r.idProyecto}</p>
                      </>
                    ),
                  },
                  {
                    clave: "etiqueta",
                    titulo: "Etiqueta",
                    celda: (r) => (
                      <Badge variante={r.esRelevante ? "success" : "danger"}>{r.esRelevante ? "Buen match" : "Mal match"}</Badge>
                    ),
                  },
                  { clave: "observacion", titulo: "Observación", celda: (r) => <span className="text-muted">{r.observacion ?? "—"}</span> },
                  {
                    clave: "acciones",
                    titulo: "Acciones",
                    alinear: "derecha",
                    celda: (r) => {
                      const destino = r.esRelevante ? "mal match" : "buen match";
                      return (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variante="ghost"
                            tamano="sm"
                            aria-label={`Cambiar a ${destino}: ${nombreDelPar(r)}`}
                            onClick={() => invertir(r)}
                          >
                            Cambiar a {destino}
                          </Button>
                          <Button variante="ghost" tamano="sm" aria-label={`Eliminar: ${nombreDelPar(r)}`} onClick={() => setAEliminar(r)}>
                            Eliminar
                          </Button>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </section>
          );
        }}
      </AsyncView>

      <ConfirmDialog
        abierto={aEliminar !== null}
        alCerrar={() => setAEliminar(null)}
        titulo="¿Eliminar el par?"
        descripcion={aEliminar ? `${nombreDelPar(aEliminar)} deja de contar para las evaluaciones.` : undefined}
        textoConfirmar="Sí, eliminar"
        variante="danger"
        alConfirmar={() => (aEliminar ? eliminar(aEliminar) : Promise.resolve())}
      />
    </div>
  );
}

// --- Evaluaciones -------------------------------------------------------------

interface ValoresEvaluacion {
  idConfiguracion: string;
  k: string;
}

const ORDEN_EVALUACION = ["idConfiguracion", "k"] as const;

function validarEvaluacion(v: ValoresEvaluacion): Errores<keyof ValoresEvaluacion> {
  const errores: Errores<keyof ValoresEvaluacion> = {};
  if (!v.idConfiguracion) errores.idConfiguracion = "Elegí qué configuración evaluar.";
  // El servidor admite k de 1 a 50 (docs/api/CONTRATO.md, sección 5.3).
  if (!esEnteroPositivo(v.k) || Number(v.k) > 50) errores.k = "k tiene que ser un número entero entre 1 y 50.";
  return errores;
}

function Evaluaciones() {
  const toast = useToast();
  const [valores, setValores] = useState<ValoresEvaluacion>({ idConfiguracion: "", k: "5" });
  const [ultima, setUltima] = useState<Evaluacion | null>(null);
  const configuraciones = useApiQuery("matching:configuraciones", (signal) => api.matching.configuraciones({ signal }));
  const historial = useApiQuery("matching:evaluaciones", (signal) => api.matching.evaluaciones({ signal }), {
    esVacio: (lista) => lista.length === 0,
  });
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar: validarEvaluacion,
    orden: ORDEN_EVALUACION,
    construirPayload: (v) => ({ idConfiguracion: Number(v.idConfiguracion), k: Number(v.k) }),
    alGuardar: async (payload) => {
      const evaluacion = await api.matching.evaluar(payload);
      setUltima(evaluacion);
      toast.exito(`La evaluación de «${evaluacion.configuracion}» quedó guardada en el historial.`, "Evaluación terminada");
      historial.recargar();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card como="section" variante="plana" aria-labelledby="titulo-evaluar">
        <CardTitle id="titulo-evaluar" className="text-lg">
          Evaluar una configuración
        </CardTitle>
        <p className="mt-1 text-sm text-muted">
          Calcula la precisión, el recall y la precisión en el top-k usando solo los pares del conjunto de referencia.
        </p>
        <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-4 flex flex-col gap-4">
          {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              name="idConfiguracion"
              label="Configuración"
              required
              placeholder="Elegí una configuración"
              opciones={(configuraciones.data ?? []).map((c) => ({
                valor: c.idConfiguracion,
                etiqueta: c.activa ? `${c.nombre} (activa)` : c.nombre,
              }))}
              value={valores.idConfiguracion}
              error={
                errores.idConfiguracion ??
                (configuraciones.estado === "error" ? "No pudimos cargar las configuraciones. Recargá la página." : undefined)
              }
              onChange={(e) => setValores((v) => ({ ...v, idConfiguracion: e.target.value }))}
            />
            <Input
              name="k"
              label="k (tamaño del top)"
              hint="Cuántas recomendaciones por estudiante mira la precisión en el top-k."
              type="number"
              min={1}
              max={50}
              step={1}
              required
              value={valores.k}
              error={errores.k}
              onChange={(e) => setValores((v) => ({ ...v, k: e.target.value }))}
            />
          </div>
          <Button
            type="submit"
            className="self-start"
            cargando={enviando}
            iconoIzquierda={<Play aria-hidden="true" className="size-4" />}
          >
            Ejecutar evaluación
          </Button>
        </form>
      </Card>

      {ultima && (
        <Card
          como="section"
          variante="sticker"
          aria-label={`Resultado de ${ultima.configuracion} con k = ${ultima.k}`}
          className="flex flex-col gap-4"
        >
          <div>
            <CardTitle className="text-lg">
              Resultado de {ultima.configuracion} con k = {ultima.k}
            </CardTitle>
            <p className="mt-1 text-sm text-muted">
              {ultima.cantidadEstudiantes} estudiantes evaluados · {formatearFechaHora(ultima.fechaEjecucion)}
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            {([
              ["Precisión global", ultima.precisionGlobal],
              ["Recall global", ultima.recallGlobal],
              [`Precisión en el top-${ultima.k}`, ultima.precisionTopK],
            ] as const).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-lg bg-sunken p-4">
                <dt className="text-sm text-muted">{etiqueta}</dt>
                <dd className="mt-1 font-display text-3xl font-bold tabular-nums">{formatearPorcentaje(valor)}</dd>
              </div>
            ))}
          </dl>
          {ultima.observaciones && <p className="text-sm text-muted">{ultima.observaciones}</p>}
        </Card>
      )}

      <section aria-labelledby="titulo-historial">
        <h2 id="titulo-historial" className="mb-3 font-display text-lg font-semibold">
          Historial
        </h2>
        <AsyncView
          consulta={historial}
          etiquetaCarga="Cargando el historial"
          tituloError="No pudimos cargar el historial"
          vacio={
            <EmptyState
              icono={<FlaskConical className="size-7" />}
              titulo="Todavía no hay evaluaciones"
              descripcion="Ejecutá la primera para comparar configuraciones."
            />
          }
        >
          {(evaluaciones) => (
            <DataTable
              caption="Historial de evaluaciones"
              filas={evaluaciones}
              idDeFila={(e) => e.idEvaluacion}
              columnas={[
                { clave: "fecha", titulo: "Fecha", celda: (e) => formatearFechaHora(e.fechaEjecucion) },
                { clave: "configuracion", titulo: "Configuración", celda: (e) => <span className="font-semibold">{e.configuracion}</span> },
                { clave: "k", titulo: "k", alinear: "derecha", celda: (e) => e.k },
                { clave: "estudiantes", titulo: "Estudiantes", alinear: "derecha", celda: (e) => e.cantidadEstudiantes },
                { clave: "precision", titulo: "Precisión", alinear: "derecha", celda: (e) => formatearPorcentaje(e.precisionGlobal) },
                { clave: "recall", titulo: "Recall", alinear: "derecha", celda: (e) => formatearPorcentaje(e.recallGlobal) },
                { clave: "topk", titulo: "Precisión top-k", alinear: "derecha", celda: (e) => formatearPorcentaje(e.precisionTopK) },
                { clave: "observaciones", titulo: "Observaciones", celda: (e) => <span className="text-muted">{e.observaciones ?? "—"}</span> },
              ]}
            />
          )}
        </AsyncView>
      </section>
    </div>
  );
}
