"use client";

import type { ReactNode } from "react";
import type { Consulta } from "@/lib/hooks/useApiQuery";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { RegionCargando, SkeletonCard } from "./Skeleton";

interface AsyncViewProps<T> {
  consulta: Consulta<T>;
  /** Contenido cuando hay datos. Recibe el dato ya sin `null`. */
  children: (data: T) => ReactNode;
  /** Qué mostrar mientras carga. Por defecto, tres tarjetas de esqueleto. */
  cargando?: ReactNode;
  etiquetaCarga?: string;
  /** Estado vacío (cuando la consulta definió `esVacio`). Por defecto, un aviso genérico. */
  vacio?: ReactNode;
  tituloError?: string;
}

/**
 * Traduce el estado de un `useApiQuery` a la pantalla correcta:
 * skeleton, error con reintento, estado vacío o contenido.
 */
export function AsyncView<T>({
  consulta,
  children,
  cargando,
  etiquetaCarga = "Cargando",
  vacio,
  tituloError,
}: AsyncViewProps<T>) {
  switch (consulta.estado) {
    case "inactiva":
    case "cargando":
      return (
        cargando ?? (
          <RegionCargando etiqueta={etiquetaCarga}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </RegionCargando>
        )
      );
    case "error":
      return (
        <ErrorState titulo={tituloError} mensaje={consulta.error?.message} alReintentar={consulta.recargar} />
      );
    case "vacio":
      return <>{vacio ?? <EmptyState titulo="No hay nada por acá todavía" />}</>;
    case "ok":
      return consulta.data === null ? null : <>{children(consulta.data)}</>;
  }
}
