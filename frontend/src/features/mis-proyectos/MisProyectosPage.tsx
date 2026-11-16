"use client";

import { FolderPlus, PlusCircle, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionCargando, SkeletonCard } from "@/components/ui/Skeleton";
import { EstadoProyectoBadge, ProyectoMeta } from "@/features/proyectos/comunes";
import { api } from "@/lib/api/endpoints";
import type { EstadoProyecto } from "@/lib/api/types";
import { formatearFecha } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ESTADO_PROYECTO_ETIQUETA } from "@/lib/labels";

type Filtro = "todos" | EstadoProyecto;

const ESTADOS = Object.keys(ESTADO_PROYECTO_ETIQUETA) as EstadoProyecto[];

const plural = (n: number) => `${n} ${n === 1 ? "postulación" : "postulaciones"}`;

/** `/mis-proyectos`: los proyectos del publicador, con su estado y cuántas postulaciones tienen. */
export function MisProyectosPage() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const consulta = useApiQuery("proyectos:mios", (signal) => api.proyectos.mios(undefined, { signal }));
  const publicar = (
    <Button href="/mis-proyectos/nuevo" iconoIzquierda={<PlusCircle aria-hidden="true" className="size-5" />}>
      Publicar proyecto
    </Button>
  );

  let contenido: React.ReactNode;
  if (consulta.estado === "error" && consulta.error?.statusCode === 422) {
    // Sin perfil de empresa o docente no se puede publicar (ni tener proyectos).
    contenido = (
      <EmptyState
        icono={<UserRoundPen className="size-7" />}
        titulo="Completá tu perfil para publicar proyectos"
        descripcion="Los estudiantes ven quién publica cada proyecto: primero contá quién sos."
        accion={<Button href="/perfil">Completar mi perfil</Button>}
      />
    );
  } else if (consulta.estado === "error") {
    contenido = (
      <ErrorState titulo="No pudimos cargar tus proyectos" mensaje={consulta.error?.message} alReintentar={consulta.recargar} />
    );
  } else if (!consulta.data) {
    contenido = (
      <RegionCargando etiqueta="Cargando tus proyectos">
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </RegionCargando>
    );
  } else if (consulta.data.length === 0) {
    contenido = (
      <EmptyState
        icono={<FolderPlus className="size-7" />}
        titulo="Todavía no publicaste ningún proyecto"
        descripcion="Cuando publiques uno, el sistema te va a recomendar estudiantes compatibles."
        accion={publicar}
      />
    );
  } else {
    const todos = consulta.data;
    const visibles = filtro === "todos" ? todos : todos.filter((p) => p.estado === filtro);
    const opciones = [
      { valor: "todos" as Filtro, etiqueta: "Todos", contador: todos.length },
      ...ESTADOS.map((estado) => ({
        valor: estado as Filtro,
        etiqueta: ESTADO_PROYECTO_ETIQUETA[estado],
        contador: todos.filter((p) => p.estado === estado).length,
      })).filter((opcion) => opcion.contador > 0),
    ];
    contenido = (
      <>
        <FilterChips etiqueta="Filtrar por estado" opciones={opciones} valor={filtro} alCambiar={setFiltro} className="mb-6" />
        <h2 className="sr-only">Proyectos</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {visibles.map((p) => (
            <li key={p.idProyecto}>
              <Card como="article" variante="plana" className="flex h-full flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoProyectoBadge estado={p.estado} />
                  <span className="text-sm text-muted">
                    {p.fechaPublicacion ? `Publicado el ${formatearFecha(p.fechaPublicacion)}` : "Sin publicar"}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold leading-tight">
                  <Link href={`/mis-proyectos/${p.idProyecto}`} className="hover:text-primary hover:underline">
                    {p.titulo}
                  </Link>
                </h3>
                <ProyectoMeta proyecto={p} />
                <p className="mt-auto text-sm font-semibold">{plural(p.cantidadPostulaciones ?? 0)}</p>
              </Card>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <PageHeader
        etiqueta="Proyectos"
        titulo="Mis proyectos"
        descripcion="Gestioná tus proyectos: publicalos, revisá a quién se postuló e invitá a estudiantes recomendados."
        acciones={publicar}
      />
      {contenido}
    </>
  );
}
