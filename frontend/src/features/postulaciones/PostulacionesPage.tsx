"use client";

import { Check, ClipboardList, History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AsyncView } from "@/components/ui/AsyncView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { RegionCargando, SkeletonTexto } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { esApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { EstadoPostulacion, Postulacion } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatearFecha, formatearFechaHora } from "@/lib/format";
import { ESTADO_POSTULACION_ETIQUETA } from "@/lib/labels";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { EstadoPostulacionBadge } from "@/features/proyectos/comunes";
import { pasosDeLinea, transicionesPermitidas } from "./estados";

type FiltroEstado = "todas" | EstadoPostulacion;

const ESTADOS = Object.keys(ESTADO_POSTULACION_ETIQUETA) as EstadoPostulacion[];

const SITUACION_TEXTO = { hecho: "completada", actual: "etapa actual", siguiente: "todavía no" } as const;

/** Etapas por las que pasa una postulación. Cada paso lo dice con texto; el color y la tilde solo refuerzan. */
function LineaDeTiempo({ estado }: { estado: EstadoPostulacion }) {
  return (
    <ol aria-label="Etapas de la postulación" className="flex flex-wrap gap-x-2 gap-y-2 text-sm">
      {pasosDeLinea(estado).map((paso, i) => (
        <li key={paso.estado} aria-current={paso.situacion === "actual" ? "step" : undefined} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true" className={cn("h-0.5 w-4 sm:w-8", paso.situacion === "siguiente" ? "bg-line" : "bg-ink")} />}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-semibold",
              paso.situacion === "actual" && "border-primary bg-primary text-on-primary",
              paso.situacion === "hecho" && "border-ink bg-surface text-ink",
              paso.situacion === "siguiente" && "border-line bg-sunken text-muted",
            )}
          >
            {paso.situacion === "hecho" && <Check aria-hidden="true" className="size-3.5" />}
            {paso.etiqueta}
            <span className="sr-only"> ({SITUACION_TEXTO[paso.situacion]})</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Historial con fechas: se pide recién cuando la persona lo abre (el listado no lo trae). */
function Historial({ idPostulacion }: { idPostulacion: number }) {
  const consulta = useApiQuery(`postulaciones:${idPostulacion}`, (signal) => api.postulaciones.obtener(idPostulacion, { signal }));
  return (
    <AsyncView
      consulta={consulta}
      cargando={
        <RegionCargando etiqueta="Cargando el historial">
          <SkeletonTexto lineas={2} />
        </RegionCargando>
      }
      tituloError="No pudimos cargar el historial"
    >
      {(detalle) =>
        detalle.historial && detalle.historial.length > 0 ? (
          <ul aria-label="Historial de cambios" className="flex flex-col gap-1.5 text-sm">
            {detalle.historial.map((cambio) => (
              <li key={cambio.fechaCambio + cambio.estadoNuevo}>
                {cambio.estadoAnterior
                  ? `${ESTADO_POSTULACION_ETIQUETA[cambio.estadoAnterior]} → ${ESTADO_POSTULACION_ETIQUETA[cambio.estadoNuevo]}`
                  : `Postulación enviada (${ESTADO_POSTULACION_ETIQUETA[cambio.estadoNuevo]})`}
                <span className="text-muted"> · {formatearFechaHora(cambio.fechaCambio)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Todavía no hay cambios de estado.</p>
        )
      }
    </AsyncView>
  );
}

function PostulacionCard({ postulacion, alRetirar }: { postulacion: Postulacion; alRetirar: () => void }) {
  const [verHistorial, setVerHistorial] = useState(false);
  const { proyecto } = postulacion;
  const puedeRetirar = transicionesPermitidas(postulacion.estado, "estudiante").includes("retirada");

  return (
    <Card como="article" variante="plana" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono text-subtle">{proyecto.publicador}</p>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
            <Link href={`/proyectos/${proyecto.idProyecto}`} className="hover:text-primary hover:underline">
              {proyecto.titulo}
            </Link>
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <EstadoPostulacionBadge estado={postulacion.estado} />
            Postulaste el {formatearFecha(postulacion.fechaPostulacion)}
          </p>
        </div>
        {postulacion.puntajeTotal !== null && <ScoreRing valor={postulacion.puntajeTotal} tamano="sm" />}
      </div>

      {postulacion.mensajePresentacion && (
        <blockquote className="border-l-4 border-line-strong pl-3 text-sm text-muted">{postulacion.mensajePresentacion}</blockquote>
      )}

      <LineaDeTiempo estado={postulacion.estado} />

      <div className="flex flex-wrap gap-3">
        <Button
          variante="ghost"
          tamano="sm"
          aria-expanded={verHistorial}
          iconoIzquierda={<History aria-hidden="true" className="size-4" />}
          onClick={() => setVerHistorial((abierto) => !abierto)}
        >
          {verHistorial ? "Ocultar el historial" : "Ver el historial"}
        </Button>
        {puedeRetirar && (
          <Button variante="secondary" tamano="sm" onClick={alRetirar}>
            Retirar postulación
          </Button>
        )}
      </div>

      {verHistorial && <Historial idPostulacion={postulacion.idPostulacion} />}
    </Card>
  );
}

/** `/postulaciones`: seguimiento de las postulaciones del estudiante, con su estado y la opción de retirarlas. */
export function PostulacionesPage() {
  const toast = useToast();
  const [filtro, setFiltro] = useState<FiltroEstado>("todas");
  const [aRetirar, setARetirar] = useState<Postulacion | null>(null);
  const consulta = useApiQuery("postulaciones:mias", (signal) => api.postulaciones.mias(undefined, { signal }), {
    esVacio: (lista) => lista.length === 0,
  });

  async function retirar(postulacion: Postulacion) {
    try {
      await api.postulaciones.cambiarEstado(postulacion.idPostulacion, "retirada");
    } catch (falla) {
      // 409: el publicador ya la resolvió. Se refresca el listado y el diálogo muestra el motivo.
      if (esApiError(falla) && falla.statusCode === 409) consulta.recargar();
      throw falla;
    }
    toast.exito(`Retiraste tu postulación a «${postulacion.proyecto.titulo}».`, "Postulación retirada");
    consulta.recargar();
  }

  return (
    <>
      <PageHeader
        etiqueta="Seguimiento"
        titulo="Mis postulaciones"
        descripcion="Mirá en qué etapa está cada postulación. Te avisamos cuando el publicador la revise."
      />
      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando tus postulaciones"
        tituloError="No pudimos cargar tus postulaciones"
        vacio={
          <EmptyState
            icono={<ClipboardList className="size-7" />}
            titulo="Todavía no te postulaste a ningún proyecto"
            descripcion="Cuando te postules vas a poder seguir acá cada etapa."
            accion={
              <div className="flex flex-wrap justify-center gap-3">
                <Button href="/recomendaciones" variante="secondary">
                  Ver recomendaciones
                </Button>
                <Button href="/proyectos">Explorar proyectos</Button>
              </div>
            }
          />
        }
      >
        {(todas) => {
          const visibles = filtro === "todas" ? todas : todas.filter((p) => p.estado === filtro);
          const opciones = [
            { valor: "todas" as FiltroEstado, etiqueta: "Todas", contador: todas.length },
            ...ESTADOS.map((estado) => ({
              valor: estado as FiltroEstado,
              etiqueta: ESTADO_POSTULACION_ETIQUETA[estado],
              contador: todas.filter((p) => p.estado === estado).length,
            })).filter((opcion) => opcion.contador > 0),
          ];
          return (
            <>
              <FilterChips etiqueta="Filtrar por estado" opciones={opciones} valor={filtro} alCambiar={setFiltro} className="mb-6" />
              <h2 className="sr-only">Postulaciones</h2>
              {visibles.length === 0 ? (
                <EmptyState
                  titulo="No tenés postulaciones en ese estado"
                  accion={<Button onClick={() => setFiltro("todas")}>Ver todas</Button>}
                />
              ) : (
                <ul className="flex flex-col gap-4">
                  {visibles.map((postulacion) => (
                    <li key={postulacion.idPostulacion}>
                      <PostulacionCard postulacion={postulacion} alRetirar={() => setARetirar(postulacion)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          );
        }}
      </AsyncView>

      <ConfirmDialog
        abierto={aRetirar !== null}
        alCerrar={() => setARetirar(null)}
        titulo="¿Retirar tu postulación?"
        descripcion={aRetirar ? `Vas a retirar tu postulación a «${aRetirar.proyecto.titulo}». Esta acción no se puede deshacer.` : undefined}
        textoConfirmar="Sí, retirar"
        textoCancelar="Mantener postulación"
        variante="danger"
        alConfirmar={() => (aRetirar ? retirar(aRetirar) : Promise.resolve())}
      />
    </>
  );
}
