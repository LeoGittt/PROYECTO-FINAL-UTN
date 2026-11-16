"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Materia } from "@/lib/api/types";

interface MateriasPickerProps {
  /** Materias de la carrera elegida. */
  materias: Materia[];
  valor: number[];
  alCambiar: (valor: number[]) => void;
}

/** Materias aprobadas, agrupadas por año del plan de estudios. */
export function MateriasPicker({ materias, valor, alCambiar }: MateriasPickerProps) {
  const porAnio = useMemo(() => {
    const grupos = new Map<number, Materia[]>();
    for (const m of [...materias].sort((a, b) => a.anioPlan - b.anioPlan || a.nombre.localeCompare(b.nombre, "es"))) {
      grupos.set(m.anioPlan, [...(grupos.get(m.anioPlan) ?? []), m]);
    }
    return [...grupos.entries()];
  }, [materias]);

  const alternar = (id: number, marcada: boolean) =>
    alCambiar(marcada ? [...valor, id] : valor.filter((v) => v !== id));

  const aprobadas = materias.filter((m) => valor.includes(m.idMateria)).length;

  return (
    <div>
      <p className="text-sm text-muted" aria-live="polite">
        Aprobadas: <strong className="text-ink">{aprobadas}</strong> de {materias.length}
      </p>
      <div className="mt-3 grid gap-5 md:grid-cols-2">
        {porAnio.map(([anio, lista]) => (
          <fieldset key={anio} className="rounded-lg border border-line bg-surface p-3">
            <legend className="px-1 text-sm font-semibold text-ink">{anio}.º año</legend>
            <div className="flex flex-col">
              {lista.map((m) => (
                <Checkbox
                  key={m.idMateria}
                  label={m.nombre}
                  checked={valor.includes(m.idMateria)}
                  onChange={(e) => alternar(m.idMateria, e.target.checked)}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
