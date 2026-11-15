"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Combobox, type OpcionCombobox } from "@/components/ui/Combobox";
import type { NivelTecnologia, Tecnologia } from "@/lib/api/types";
import { CATEGORIA_ETIQUETA, NIVEL_ETIQUETA } from "@/lib/labels";
import type { TecnologiaElegida } from "./valores";

interface TechnologyPickerProps {
  catalogo: Tecnologia[];
  valor: TecnologiaElegida[];
  alCambiar: (valor: TecnologiaElegida[]) => void;
  error?: string;
}

const NIVELES = Object.keys(NIVEL_ETIQUETA) as NivelTecnologia[];

/**
 * Tecnologías con nivel: se busca y se suma una tecnología del catálogo, y cada una
 * lleva su nivel (básico, intermedio, avanzado). El nivel pesa en el cálculo de compatibilidad.
 */
export function TechnologyPicker({ catalogo, valor, alCambiar, error }: TechnologyPickerProps) {
  const opciones = useMemo<OpcionCombobox[]>(
    () => catalogo.map((t) => ({ valor: t.idTecnologia, etiqueta: t.nombre, detalle: CATEGORIA_ETIQUETA[t.categoria] })),
    [catalogo],
  );
  const porId = useMemo(() => new Map(catalogo.map((t) => [t.idTecnologia, t])), [catalogo]);

  return (
    <div>
      <Combobox
        label="Agregar una tecnología"
        hint="Buscá por nombre y elegí tu nivel en cada una. Cuanto más completo, mejores recomendaciones."
        placeholder="Por ejemplo: React, Node.js, PostgreSQL"
        opciones={opciones}
        excluidos={valor.map((t) => t.idTecnologia)}
        error={error}
        alElegir={(o) => alCambiar([...valor, { idTecnologia: Number(o.valor), nivel: "basico" }])}
      />
      <ul aria-label="Tecnologías elegidas" className="mt-4 flex flex-col gap-2">
        {valor.map((t) => {
          const tecnologia = porId.get(t.idTecnologia);
          const nombre = tecnologia?.nombre ?? `Tecnología ${t.idTecnologia}`;
          return (
            <li key={t.idTecnologia} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface px-3 py-2">
              <span className="min-w-0 flex-1 font-semibold">{nombre}</span>
              {tecnologia && <Badge>{CATEGORIA_ETIQUETA[tecnologia.categoria]}</Badge>}
              <select
                aria-label={`Nivel en ${nombre}`}
                value={t.nivel}
                onChange={(e) =>
                  alCambiar(valor.map((x) => (x.idTecnologia === t.idTecnologia ? { ...x, nivel: e.target.value as NivelTecnologia } : x)))
                }
                className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm font-medium text-ink"
              >
                {NIVELES.map((n) => (
                  <option key={n} value={n}>
                    {NIVEL_ETIQUETA[n]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Quitar ${nombre}`}
                onClick={() => alCambiar(valor.filter((x) => x.idTecnologia !== t.idTecnologia))}
                className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          );
        })}
        {valor.length === 0 && <li className="text-sm text-muted">Todavía no agregaste ninguna tecnología.</li>}
      </ul>
    </div>
  );
}
