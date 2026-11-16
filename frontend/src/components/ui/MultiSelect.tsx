"use client";

import { useMemo } from "react";
import { Chip } from "./Chip";
import { Combobox, type OpcionCombobox } from "./Combobox";
import type { PropsCampo } from "./Campo";

interface MultiSelectProps extends PropsCampo {
  opciones: OpcionCombobox[];
  /** Valores seleccionados. */
  valores: (number | string)[];
  alCambiar: (valores: (number | string)[]) => void;
  placeholder?: string;
  textoVacio?: string;
  className?: string;
}

/** Selección múltiple: un buscador para sumar y chips para ver y quitar lo elegido. */
export function MultiSelect({
  opciones,
  valores,
  alCambiar,
  placeholder,
  textoVacio = "Todavía no elegiste ninguna opción.",
  className,
  ...campo
}: MultiSelectProps) {
  const elegidas = useMemo(
    () => valores.map((v) => opciones.find((o) => o.valor === v)).filter((o): o is OpcionCombobox => !!o),
    [valores, opciones],
  );

  return (
    <div className={className}>
      <Combobox
        {...campo}
        opciones={opciones}
        excluidos={valores}
        alElegir={(o) => alCambiar([...valores, o.valor])}
        placeholder={placeholder}
      />
      <ul aria-label={`${campo.label}: seleccionadas`} className="mt-3 flex flex-wrap gap-2">
        {elegidas.map((o) => (
          <li key={o.valor}>
            <Chip etiquetaQuitar={`Quitar ${o.etiqueta}`} alQuitar={() => alCambiar(valores.filter((v) => v !== o.valor))}>
              {o.etiqueta}
            </Chip>
          </li>
        ))}
        {elegidas.length === 0 && <li className="text-sm text-muted">{textoVacio}</li>}
      </ul>
    </div>
  );
}
