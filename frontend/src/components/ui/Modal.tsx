"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useDialogBehavior } from "@/lib/hooks/useDialogBehavior";

type TamanoModal = "sm" | "md" | "lg";

interface ModalProps {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  /** Botones de acción, alineados a la derecha al pie. */
  pie?: ReactNode;
  tamano?: TamanoModal;
  /** `izquierda` lo muestra como panel lateral (menú móvil). */
  posicion?: "centro" | "izquierda";
  cerrarAlClickFuera?: boolean;
}

const ANCHOS: Record<TamanoModal, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/**
 * Diálogo modal accesible: `role="dialog"` con `aria-modal`, foco atrapado,
 * Escape para cerrar y retorno del foco al elemento que lo abrió.
 * Un hijo con `data-autofocus` recibe el foco inicial (útil en confirmaciones).
 */
export function Modal({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  children,
  pie,
  tamano = "md",
  posicion = "centro",
  cerrarAlClickFuera = true,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const descripcionId = useId();
  useDialogBehavior(abierto, alCerrar, ref);

  if (!abierto || typeof document === "undefined") return null;

  const lateral = posicion === "izquierda";
  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex", lateral ? "justify-start" : "items-end justify-center p-0 sm:items-center sm:p-4")}>
      <div aria-hidden="true" className="absolute inset-0 bg-overlay" onClick={cerrarAlClickFuera ? alCerrar : undefined} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcion ? descripcionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-dvh w-full flex-col bg-surface shadow-pop animate-pop-in",
          lateral
            ? "h-dvh max-w-xs border-r border-line"
            : cn("max-h-[90dvh] rounded-t-2xl border border-line sm:rounded-2xl", ANCHOS[tamano]),
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={tituloId} className="font-display text-xl font-semibold text-ink">
              {titulo}
            </h2>
            {descripcion && (
              <p id={descripcionId} className="mt-1 text-sm text-muted">
                {descripcion}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}
