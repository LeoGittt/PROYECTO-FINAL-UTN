"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { normalizarTexto } from "@/lib/format";
import { Campo, estilosControl, useIdsCampo, type PropsCampo } from "./Campo";

export interface OpcionCombobox {
  valor: number | string;
  etiqueta: string;
  /** Texto secundario a la derecha (por ejemplo, la categoría de una tecnología). */
  detalle?: string;
}

interface ComboboxProps extends PropsCampo {
  opciones: OpcionCombobox[];
  /** Valores que no se ofrecen porque ya están elegidos. */
  excluidos?: (number | string)[];
  alElegir: (opcion: OpcionCombobox) => void;
  placeholder?: string;
  textoSinResultados?: string;
  /** Máximo de opciones que se muestran a la vez. */
  limite?: number;
  id?: string;
  className?: string;
}

/**
 * Buscador con lista de sugerencias (patrón ARIA 1.2 "combobox" con listbox).
 * Cada elección se informa con `alElegir` y el campo se limpia, de modo que sirve
 * para ir sumando elementos (tecnologías, habilidades). La búsqueda ignora tildes.
 *
 * Teclado: flechas para recorrer, Enter para elegir, Escape para cerrar.
 */
export function Combobox({
  label,
  hint,
  error,
  required,
  ocultarLabel,
  opciones,
  excluidos = [],
  alElegir,
  placeholder = "Escribí para buscar",
  textoSinResultados = "No hay coincidencias",
  limite = 50,
  id,
  className,
}: ComboboxProps) {
  const ids = useIdsCampo(id, { hint: !!hint, error: !!error });
  const listaId = `${ids.id}-lista`;
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const filtradas = useMemo(() => {
    const buscado = normalizarTexto(consulta.trim());
    return opciones
      .filter((o) => !excluidos.includes(o.valor))
      .filter((o) => buscado === "" || normalizarTexto(o.etiqueta).includes(buscado))
      .slice(0, limite);
  }, [opciones, excluidos, consulta, limite]);

  const indiceActivo = filtradas.length === 0 ? -1 : Math.min(activo, filtradas.length - 1);
  const idOpcion = (i: number) => `${ids.id}-op-${i}`;

  useEffect(() => {
    if (!abierto || indiceActivo < 0) return;
    document.getElementById(`${ids.id}-op-${indiceActivo}`)?.scrollIntoView?.({ block: "nearest" });
  }, [abierto, indiceActivo, ids.id]);

  function elegir(opcion: OpcionCombobox) {
    alElegir(opcion);
    setConsulta("");
    setActivo(0);
    setAbierto(false);
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        if (!abierto) setAbierto(true);
        else setActivo((i) => (filtradas.length === 0 ? 0 : (Math.min(i, filtradas.length - 1) + 1) % filtradas.length));
        break;
      case "ArrowUp":
        evento.preventDefault();
        if (!abierto) setAbierto(true);
        else setActivo((i) => (filtradas.length === 0 ? 0 : (Math.min(i, filtradas.length - 1) - 1 + filtradas.length) % filtradas.length));
        break;
      case "Enter":
        if (abierto && indiceActivo >= 0) {
          evento.preventDefault();
          elegir(filtradas[indiceActivo]);
        }
        break;
      case "Escape":
        if (abierto) {
          evento.preventDefault();
          evento.stopPropagation();
          setAbierto(false);
        }
        break;
      default:
    }
  }

  return (
    <Campo label={label} hint={hint} error={error} required={required} ocultarLabel={ocultarLabel} ids={ids} className={className}>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          id={ids.id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-activedescendant={abierto && indiceActivo >= 0 ? idOpcion(indiceActivo) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          value={consulta}
          placeholder={placeholder}
          onChange={(e) => {
            setConsulta(e.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={alTeclear}
          className={cn(estilosControl(!!error), "h-11 pl-10")}
        />
        <ul
          id={listaId}
          role="listbox"
          aria-label={label}
          hidden={!abierto}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-lg border border-line-strong bg-surface py-1 shadow-pop"
        >
          {filtradas.map((opcion, i) => (
            <li
              key={opcion.valor}
              id={idOpcion(i)}
              role="option"
              aria-selected={i === indiceActivo}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActivo(i)}
              onClick={() => elegir(opcion)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-sm",
                i === indiceActivo ? "bg-primary-soft text-primary-soft-ink" : "text-ink",
              )}
            >
              <span className="font-medium">{opcion.etiqueta}</span>
              {opcion.detalle && <span className="text-xs text-muted">{opcion.detalle}</span>}
            </li>
          ))}
          {filtradas.length === 0 && (
            <li role="presentation" className="px-3.5 py-2 text-sm text-muted">
              {textoSinResultados}
            </li>
          )}
        </ul>
      </div>
      <span className="sr-only" aria-live="polite">
        {abierto ? (filtradas.length === 0 ? textoSinResultados : `${filtradas.length} opciones disponibles`) : ""}
      </span>
    </Campo>
  );
}
