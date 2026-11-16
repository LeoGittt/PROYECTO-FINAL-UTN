import { Check } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RadioCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "title"> {
  titulo: string;
  descripcion: string;
  icono?: ReactNode;
}

/**
 * Opción de un grupo de radios con formato de tarjeta. El radio nativo queda
 * oculto visualmente pero sigue recibiendo foco y teclado (flechas); la selección
 * se indica con borde, relleno y una tilde, no solo con color.
 */
export function RadioCard({ titulo, descripcion, icono, className, ...resto }: RadioCardProps) {
  return (
    <label className={cn("relative block cursor-pointer", className)}>
      <input type="radio" className="peer sr-only" {...resto} />
      <span
        className={cn(
          "flex h-full gap-3 rounded-xl border-2 border-line bg-surface p-4 transition-colors",
          "hover:border-line-strong peer-checked:border-primary peer-checked:bg-primary-soft",
          "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
          "[&_[data-check]]:opacity-0 peer-checked:[&_[data-check]]:opacity-100",
        )}
      >
        {icono && <span className="mt-0.5 shrink-0 text-primary-soft-ink">{icono}</span>}
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-semibold leading-tight text-ink">{titulo}</span>
          <span className="mt-1 block text-sm text-muted">{descripcion}</span>
        </span>
        <span
          data-check
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition-opacity"
        >
          <Check className="size-4" />
        </span>
      </span>
    </label>
  );
}
