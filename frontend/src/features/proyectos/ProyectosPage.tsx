"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { AsyncView } from "@/components/ui/AsyncView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api/endpoints";
import type { Modalidad, ProyectoDto, TipoRetribucion } from "@/lib/api/types";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { formatearFecha } from "@/lib/format";
import { CATEGORIA_ETIQUETA, MODALIDAD_ETIQUETA, RETRIBUCION_ETIQUETA } from "@/lib/labels";
import { opcionesDe, ProyectoMeta, TecnologiasDeProyecto } from "./comunes";

const TAMANO_PAGINA = 10;

interface Filtros {
  q: string;
  tecnologias: number[];
  modalidad: Modalidad | "";
  tipoRetribucion: TipoRetribucion | "";
  horasMax: string;
  anioMax: string;
}

const SIN_FILTROS: Filtros = { q: "", tecnologias: [], modalidad: "", tipoRetribucion: "", horasMax: "", anioMax: "" };

const HORAS = [5, 10, 15, 20, 30, 40].map((h) => ({ valor: h, etiqueta: `Hasta ${h} h por semana` }));
const ANIOS = [1, 2, 3, 4, 5, 6].map((n) => ({ valor: n, etiqueta: `${n}.º año` }));

// El contrato no define un orden para GET /proyectos: estas opciones reordenan solo la página que se está viendo.
const ORDENES = [
  { valor: "servidor", etiqueta: "Orden por defecto" },
  { valor: "compatibilidad", etiqueta: "Mayor compatibilidad" },
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "horas", etiqueta: "Menos horas por semana" },
];

function ordenar(proyectos: ProyectoDto[], orden: string): ProyectoDto[] {
  const copia = [...proyectos];
  if (orden === "compatibilidad") copia.sort((a, b) => (b.compatibilidad ?? -1) - (a.compatibilidad ?? -1));
  if (orden === "recientes") copia.sort((a, b) => (b.fechaPublicacion ?? "").localeCompare(a.fechaPublicacion ?? ""));
  if (orden === "horas") copia.sort((a, b) => a.horasSemanales - b.horasSemanales);
  return copia;
}

/** Toda la tarjeta es clicable (enlace extendido sobre el título) pero hay un solo punto de foco. */
function ProyectoCard({ proyecto }: { proyecto: ProyectoDto }) {
  const { publicador } = proyecto;
  return (
    <Card
      como="article"
      variante="plana"
      className="group relative flex flex-col gap-4 transition-[border-color,box-shadow] hover:border-primary hover:shadow-soft has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono text-subtle">
            {publicador.tipo === "empresa" ? "Empresa" : "Docente"} · {publicador.nombre}
          </p>
          <h3 className="mt-1.5 font-display text-xl font-semibold leading-tight">
            <Link
              href={`/proyectos/${proyecto.idProyecto}`}
              className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
            >
              {proyecto.titulo}
            </Link>
          </h3>
        </div>
        {/* La API solo informa la compatibilidad a un estudiante con perfil completo. */}
        {proyecto.compatibilidad !== undefined && <ScoreRing valor={proyecto.compatibilidad} tamano="sm" />}
      </div>
      <p className="line-clamp-3 text-[0.95rem] text-muted">{proyecto.descripcion}</p>
      <ProyectoMeta proyecto={proyecto} sinCupos />
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
        <TecnologiasDeProyecto tecnologias={proyecto.tecnologias} limite={6} />
        {proyecto.fechaPublicacion && <p className="text-xs text-subtle">Publicado el {formatearFecha(proyecto.fechaPublicacion)}</p>}
      </div>
    </Card>
  );
}

/** `/proyectos`: búsqueda de proyectos publicados con filtros, orden y paginación. */
export function ProyectosPage() {
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState("servidor");
  const tituloResultados = useRef<HTMLHeadingElement>(null);

  const catalogo = useApiQuery("catalogos:tecnologias", (signal) => api.catalogos.tecnologias({ signal }));
  const consulta = useApiQuery(
    `proyectos:${JSON.stringify([filtros, pagina])}`,
    (signal) =>
      api.proyectos.buscar(
        {
          q: filtros.q,
          tecnologias: filtros.tecnologias,
          modalidad: filtros.modalidad || undefined,
          tipoRetribucion: filtros.tipoRetribucion || undefined,
          horasMax: Number(filtros.horasMax) || undefined,
          anioMax: Number(filtros.anioMax) || undefined,
          pagina,
          tamano: TAMANO_PAGINA,
        },
        { signal },
      ),
    { esVacio: (datos) => datos.items.length === 0 },
  );

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);

  /** Cada cambio de filtro vuelve a la primera página. */
  function cambiar(parcial: Partial<Filtros>) {
    setFiltros((actuales) => ({ ...actuales, ...parcial }));
    setPagina(1);
  }

  function limpiar() {
    setFiltros(SIN_FILTROS);
    setTexto("");
    setPagina(1);
  }

  function irAPagina(n: number) {
    setPagina(n);
    // Se lleva el foco a los resultados para que quien navega con teclado o lector no se pierda.
    tituloResultados.current?.focus();
    tituloResultados.current?.scrollIntoView?.({ block: "start" });
  }

  const opcionesTecnologias = (catalogo.data ?? []).map((t) => ({
    valor: t.idTecnologia,
    etiqueta: t.nombre,
    detalle: CATEGORIA_ETIQUETA[t.categoria],
  }));

  return (
    <>
      <PageHeader
        etiqueta="Proyectos"
        titulo="Buscar proyectos"
        descripcion="Explorá los proyectos publicados por empresas y docentes. Si completaste tu perfil, vas a ver qué tan bien encajás en cada uno."
      />

      <Card como="section" variante="plana" aria-labelledby="titulo-filtros" className="mb-8">
        <h2 id="titulo-filtros" className="sr-only">
          Filtros
        </h2>
        <form
          role="search"
          aria-label="Buscar proyectos"
          onSubmit={(evento) => {
            evento.preventDefault();
            cambiar({ q: texto.trim() });
          }}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              className="flex-1"
              type="search"
              label="Título o descripción"
              placeholder="Por ejemplo: aplicación web, datos, inventario"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <Button type="submit" iconoIzquierda={<Search aria-hidden="true" className="size-4" />}>
              Buscar
            </Button>
          </div>

          <MultiSelect
            label="Tecnologías"
            hint="Muestra los proyectos que piden al menos una de las que elijas."
            opciones={opcionesTecnologias}
            valores={filtros.tecnologias}
            alCambiar={(valores) => cambiar({ tecnologias: valores.map(Number) })}
            error={catalogo.estado === "error" ? "No pudimos cargar las tecnologías. Recargá la página para volver a intentar." : undefined}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Modalidad"
              placeholder="Todas"
              opciones={opcionesDe(MODALIDAD_ETIQUETA)}
              value={filtros.modalidad}
              onChange={(e) => cambiar({ modalidad: e.target.value as Modalidad | "" })}
            />
            <Select
              label="Retribución"
              placeholder="Todas"
              opciones={opcionesDe(RETRIBUCION_ETIQUETA)}
              value={filtros.tipoRetribucion}
              onChange={(e) => cambiar({ tipoRetribucion: e.target.value as TipoRetribucion | "" })}
            />
            <Select
              label="Dedicación"
              placeholder="Cualquiera"
              opciones={HORAS}
              value={filtros.horasMax}
              onChange={(e) => cambiar({ horasMax: e.target.value })}
            />
            <Select
              label="Tu año de cursada"
              placeholder="Cualquiera"
              hint="Solo proyectos que aceptan ese año."
              opciones={ANIOS}
              value={filtros.anioMax}
              onChange={(e) => cambiar({ anioMax: e.target.value })}
            />
          </div>

          {hayFiltros && (
            <div>
              <Button variante="ghost" tamano="sm" onClick={limpiar}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </form>
      </Card>

      <section aria-labelledby="titulo-resultados">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-resultados" ref={tituloResultados} tabIndex={-1} className="text-2xl font-bold outline-none">
              Resultados
            </h2>
            <p role="status" className="mt-1 text-sm text-muted">
              {consulta.data ? `${consulta.data.total} ${consulta.data.total === 1 ? "proyecto encontrado" : "proyectos encontrados"}` : ""}
            </p>
          </div>
          <Select
            label="Ordenar por"
            hint="Se aplica a los resultados de esta página."
            opciones={ORDENES}
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          />
        </div>

        <AsyncView
          consulta={consulta}
          etiquetaCarga="Buscando proyectos"
          tituloError="No pudimos buscar proyectos"
          vacio={
            <EmptyState
              icono={<Search className="size-7" />}
              titulo="No encontramos proyectos"
              descripcion={
                hayFiltros
                  ? "Ningún proyecto publicado cumple con esos filtros. Probá con menos condiciones."
                  : "Todavía no hay proyectos publicados. Volvé a mirar en unos días."
              }
              accion={hayFiltros ? <Button onClick={limpiar}>Limpiar filtros</Button> : undefined}
            />
          }
        >
          {(datos) => (
            <>
              <ul className="flex flex-col gap-4">
                {ordenar(datos.items, orden).map((proyecto) => (
                  <li key={proyecto.idProyecto}>
                    <ProyectoCard proyecto={proyecto} />
                  </li>
                ))}
              </ul>
              {datos.total > TAMANO_PAGINA && (
                <Pagination className="mt-8" pagina={datos.pagina} tamano={datos.tamano} total={datos.total} alCambiar={irAPagina} />
              )}
            </>
          )}
        </AsyncView>
      </section>
    </>
  );
}
