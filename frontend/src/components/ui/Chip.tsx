import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChipProps {
  children: ReactNode;
  /** Si se pasa, el chip muestra un botón para quitarlo. */
  alQuitar?: () => void;
  /** Texto accesible del botón de quitar (por ejemplo, "Quitar React"). */
  etiquetaQuitar?: string;
  className?: string;
}

export function Chip({ children, alQuitar, etiquetaQuitar = "Quitar", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft py-1 pl-3 text-sm font-medium text-primary-soft-ink",
        alQuitar ? "pr-1" : "pr-3",
        className,
      )}
    >
      {children}
      {alQuitar && (
        <button
          type="button"
          onClick={alQuitar}
          aria-label={etiquetaQuitar}
          className="grid size-6 place-items-center rounded-full hover:bg-primary/15"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </span>
  );
}
