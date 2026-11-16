"use client";

import { AsyncView } from "@/components/ui/AsyncView";
import { RegionCargando, SkeletonTexto } from "@/components/ui/Skeleton";
import { api } from "@/lib/api/endpoints";
import { formatearFechaHora } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ESTADO_POSTULACION_ETIQUETA } from "@/lib/labels";

/** Historial con fechas: se pide recién cuando la persona lo abre (el listado no lo trae). */
export function Historial({ idPostulacion }: { idPostulacion: number }) {
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
