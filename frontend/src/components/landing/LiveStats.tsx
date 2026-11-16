"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api/endpoints";
import { formatearNumero } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";

/**
 * Cifras en vivo de la plataforma (`GET /publico/estadisticas`).
 * Si la API no responde, no se inventa nada: se muestran guiones y un aviso con reintento.
 */
export function LiveStats() {
  const consulta = useApiQuery("publico:estadisticas", (signal) => api.publico.estadisticas({ signal }));
  const datos = consulta.data;

  const cifras = [
    { etiqueta: "Estudiantes", valor: datos?.estudiantes },
    { etiqueta: "Proyectos publicados", valor: datos?.proyectosPublicados },
    { etiqueta: "Empresas y cátedras", valor: datos?.publicadores },
    { etiqueta: "Postulaciones", valor: datos?.postulaciones },
  ];

  return (
    <section aria-labelledby="titulo-cifras" className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-mono text-subtle">En vivo</p>
            <h2 id="titulo-cifras" className="text-2xl font-bold sm:text-3xl">
              La plataforma en números
            </h2>
          </div>
          {consulta.estado === "error" && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span role="status">Las cifras en vivo no están disponibles en este momento.</span>
              <Button
                variante="secondary"
                tamano="sm"
                onClick={consulta.recargar}
                iconoIzquierda={<RotateCw aria-hidden="true" className="size-4" />}
              >
                Reintentar
              </Button>
            </div>
          )}
        </div>
        <dl
          aria-busy={consulta.cargando}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4"
        >
          {cifras.map((c) => (
            <div key={c.etiqueta} className="bg-canvas p-5 sm:p-6">
              <dt className="label-mono text-subtle">{c.etiqueta}</dt>
              <dd className="mt-2 font-display text-4xl font-extrabold tabular-nums text-ink sm:text-5xl">
                {consulta.cargando ? (
                  <>
                    <Skeleton className="h-10 w-20 sm:h-12" />
                    <span className="sr-only">Cargando</span>
                  </>
                ) : (
                  formatearNumero(c.valor)
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
