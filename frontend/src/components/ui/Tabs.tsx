"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PestanaItem {
  id: string;
  etiqueta: string;
  contenido: ReactNode;
  /** Número opcional junto a la etiqueta (por ejemplo, la cantidad de postulaciones). */
  contador?: number;
}

interface TabsProps {
  pestanas: PestanaItem[];
  /** Descripción de la lista de pestañas para lectores de pantalla. */
  etiqueta: string;
  /** Pestaña inicial (modo no controlado). */
  inicial?: string;
  /** Modo controlado. */
  valor?: string;
  alCambiar?: (id: string) => void;
  className?: string;
}

/**
 * Pestañas con el patrón ARIA "tabs": flechas, Inicio y Fin cambian de pestaña
 * (activación automática) y solo la pestaña activa entra en el orden de tabulación.
 */
export function Tabs({ pestanas, etiqueta, inicial, valor, alCambiar, className }: TabsProps) {
  const base = useId();
  const [interna, setInterna] = useState(inicial ?? pestanas[0]?.id);
  const activa = valor ?? interna;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function elegir(id: string) {
    if (valor === undefined) setInterna(id);
    alCambiar?.(id);
    refs.current[id]?.focus();
  }

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = pestanas.findIndex((p) => p.id === activa);
    let destino = -1;
    if (evento.key === "ArrowRight") destino = (indice + 1) % pestanas.length;
    else if (evento.key === "ArrowLeft") destino = (indice - 1 + pestanas.length) % pestanas.length;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = pestanas.length - 1;
    if (destino < 0) return;
    evento.preventDefault();
    elegir(pestanas[destino].id);
  }

  const actual = pestanas.find((p) => p.id === activa);

  return (
    <div className={className}>
      <div role="tablist" aria-label={etiqueta} onKeyDown={alTeclear} className="flex gap-1 overflow-x-auto border-b border-line">
        {pestanas.map((p) => {
          const seleccionada = p.id === activa;
          return (
            <button
              key={p.id}
              ref={(el) => {
                refs.current[p.id] = el;
              }}
              id={`${base}-tab-${p.id}`}
              type="button"
              role="tab"
              aria-selected={seleccionada}
              aria-controls={`${base}-panel-${p.id}`}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => elegir(p.id)}
              className={cn(
                "-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-semibold transition-colors",
                seleccionada ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {p.etiqueta}
              {p.contador !== undefined && (
                <span className="rounded-full bg-sunken px-2 text-xs tabular-nums text-ink">{p.contador}</span>
              )}
            </button>
          );
        })}
      </div>
      {actual && (
        <div
          role="tabpanel"
          id={`${base}-panel-${actual.id}`}
          aria-labelledby={`${base}-tab-${actual.id}`}
          tabIndex={0}
          className="pt-5"
        >
          {actual.contenido}
        </div>
      )}
    </div>
  );
}
