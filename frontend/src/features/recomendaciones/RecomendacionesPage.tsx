"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AsyncView } from "@/components/ui/AsyncView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreBreakdown } from "@/components/ui/ScoreBreakdown";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api/endpoints";
import type { RecomendacionProyecto } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { MODALIDAD_ETIQUETA } from "@/lib/labels";
import { EstadoPostulacionBadge, opcionesDe, ProyectoMeta, TecnologiasDeProyecto } from "@/features/proyectos/comunes";

/** El contrato usa 10 por defecto; se piden más para que los filtros tengan de dónde elegir. */
const LIMITE = 30;

const MINIMOS = [
  { valor: 50, etiqueta: "50 % o más" },
  { valor: 75, etiqueta: "75 % o más" },
];

const formatoLista = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

function RecomendacionCard({ rec }: { rec: RecomendacionProyecto }) {
  const { proyecto, puntajes } = rec;
  const cumple = rec.tecnologiasCoincidentes.length;
  const total = cumple + rec.tecnologiasFaltantes.length;

  return (
    <Card como="article" variante="plana" className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_16rem] md:items-start">
      <ScoreRing valor={rec.puntajeTotal} tamano="md" mostrarBanda />

      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <p className="label-mono text-subtle">
            {proyecto.publicador.tipo === "empresa" ? "Empresa" : "Docente"} · {proyecto.publicador.nombre}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
            <Link href={`/proyectos/${proyecto.idProyecto}`} className="hover:text-primary hover:underline">
              {proyecto.titulo}
            </Link>
          </h3>
        </div>

        {(rec.postulacion || rec.invitacionPendiente) && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {rec.postulacion && (
              <>
                Ya te postulaste: <EstadoPostulacionBadge estado={rec.postulacion.estado} />
              </>
            )}
            {rec.invitacionPendiente && (
              <Link href="/invitaciones" className="font-semibold underline">
                <Badge variante="accent">Te invitaron a este proyecto</Badge>
              </Link>
            )}
          </p>
        )}

        {/* Por qué coincide: el motor informa qué tecnologías se cumplen y cuáles faltan. */}
        <div>
          <p className="text-sm">
            {total === 0
              ? "Este proyecto no pide tecnologías específicas."
              : `Coincidís en ${cumple} de ${total} ${total === 1 ? "tecnología" : "tecnologías"} que pide el proyecto.`}
          </p>
          <div className="mt-2">
            <TecnologiasDeProyecto tecnologias={proyecto.tecnologias} coincidentes={rec.tecnologiasCoincidentes} />
          </div>
          {rec.tecnologiasFaltantes.length > 0 && (
            <p className="mt-2 text-sm text-muted">Te {rec.tecnologiasFaltantes.length === 1 ? "falta" : "faltan"}: {formatoLista.format(rec.tecnologiasFaltantes)}.</p>
          )}
        </div>

        <ProyectoMeta proyecto={proyecto} sinCupos />
        <div>
          <Button href={`/proyectos/${proyecto.idProyecto}`} variante="secondary" tamano="sm">
            Ver proyecto
          </Button>
        </div>
      </div>

      <ScoreBreakdown puntajes={puntajes} />
    </Card>
  );
}

/** `/recomendaciones`: los proyectos que mejor encajan con el perfil del estudiante, ordenados por compatibilidad. */
export function RecomendacionesPage() {
  const { usuario } = useAuth();
  const [modalidad, setModalidad] = useState("");
  const [minimo, setMinimo] = useState("");
  const [ocultarPostulados, setOcultarPostulados] = useState(false);

  const perfilCompleto = usuario?.perfilCompleto === true;
  const consulta = useApiQuery("matching:recomendaciones", (signal) => api.matching.recomendaciones(LIMITE, { signal }), {
    habilitada: perfilCompleto,
    esVacio: (recomendaciones) => recomendaciones.length === 0,
  });

  if (!usuario) return null;

  const encabezado = (
    <PageHeader
      etiqueta="Para vos"
      titulo="Recomendaciones"
      descripcion="Proyectos ordenados por qué tan bien encajan con tus tecnologías, tus horas disponibles y tu año de cursada."
    />
  );

  if (!perfilCompleto) {
    return (
      <>
        {encabezado}
        <EmptyState
          icono={<Sparkles className="size-7" />}
          titulo="Completá tu perfil para ver recomendaciones"
          descripcion="Necesitamos conocer tu carrera, tus horas disponibles y tus tecnologías para calcular qué proyectos te convienen."
          accion={<Button href="/perfil">Completar mi perfil</Button>}
        />
      </>
    );
  }

  function visibles(todas: RecomendacionProyecto[]) {
    return todas.filter(
      (r) =>
        (!modalidad || r.proyecto.modalidad === modalidad) &&
        Math.round(r.puntajeTotal * 100) >= Number(minimo || 0) &&
        !(ocultarPostulados && r.postulacion),
    );
  }

  return (
    <>
      {encabezado}
      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando tus recomendaciones"
        tituloError="No pudimos cargar tus recomendaciones"
        vacio={
          <EmptyState
            icono={<Sparkles className="size-7" />}
            titulo="Todavía no hay recomendaciones para vos"
            descripcion="Ningún proyecto alcanzó el nivel mínimo de compatibilidad. Sumá tecnologías a tu perfil o explorá todos los proyectos publicados."
            accion={
              <div className="flex flex-wrap justify-center gap-3">
                <Button href="/perfil" variante="secondary">
                  Mejorar mi perfil
                </Button>
                <Button href="/proyectos">Explorar proyectos</Button>
              </div>
            }
          />
        }
      >
        {(todas) => {
          const lasVisibles = visibles(todas);
          return (
            <>
              <section aria-label="Filtros" className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                <Select
                  label="Modalidad"
                  placeholder="Todas"
                  opciones={opcionesDe(MODALIDAD_ETIQUETA)}
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value)}
                />
                <Select
                  label="Compatibilidad mínima"
                  placeholder="Cualquiera"
                  opciones={MINIMOS}
                  value={minimo}
                  onChange={(e) => setMinimo(e.target.value)}
                />
                <Checkbox
                  label="Ocultar los que ya me postulé"
                  checked={ocultarPostulados}
                  onChange={(e) => setOcultarPostulados(e.target.checked)}
                />
              </section>

              <h2 className="sr-only">Proyectos recomendados</h2>
              <p role="status" className="mb-4 text-sm text-muted">
                Mostrando {lasVisibles.length} de {todas.length} {todas.length === 1 ? "recomendación" : "recomendaciones"}.
              </p>

              {lasVisibles.length === 0 ? (
                <EmptyState
                  titulo="Ninguna recomendación cumple esos filtros"
                  descripcion="Probá con otra modalidad o bajá la compatibilidad mínima."
                  accion={
                    <Button
                      onClick={() => {
                        setModalidad("");
                        setMinimo("");
                        setOcultarPostulados(false);
                      }}
                    >
                      Quitar los filtros
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-4">
                  {lasVisibles.map((rec) => (
                    <li key={rec.proyecto.idProyecto}>
                      <RecomendacionCard rec={rec} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          );
        }}
      </AsyncView>
    </>
  );
}
