import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  titulo: string;
  descripcion?: string;
  /** Icono de lucide-react ya instanciado. Por defecto, una bandeja vacía. */
  icono?: ReactNode;
  /** Acción sugerida (por ejemplo, un `Button`). */
  accion?: ReactNode;
  className?: string;
}

/** Estado vacío: explica por qué no hay nada y qué hacer a continuación. */
export function EmptyState({ titulo, descripcion, icono, accion, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border-2 border-dashed border-line-strong bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span aria-hidden="true" className="mb-4 grid size-14 place-items-center rounded-full bg-primary-soft text-primary-soft-ink">
        {icono ?? <Inbox className="size-7" />}
      </span>
      <h2 className="font-display text-xl font-semibold text-ink">{titulo}</h2>
      {descripcion && <p className="mt-1.5 max-w-md text-muted">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
