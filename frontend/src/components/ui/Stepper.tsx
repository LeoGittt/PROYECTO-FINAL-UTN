import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PasoStepper {
  id: string;
  titulo: string;
  descripcion?: string;
}

interface StepperProps {
  pasos: PasoStepper[];
  /** Índice (desde 0) del paso actual. Los anteriores se marcan como completados. */
  actual: number;
  etiqueta?: string;
  className?: string;
}

/** Indicador de pasos. El estado de cada paso se dice con texto, no solo con color. */
export function Stepper({ pasos, actual, etiqueta = "Progreso", className }: StepperProps) {
  return (
    <ol aria-label={etiqueta} className={cn("flex flex-col gap-3 sm:flex-row sm:gap-0", className)}>
      {pasos.map((paso, i) => {
        const completado = i < actual;
        const esActual = i === actual;
        return (
          <li
            key={paso.id}
            aria-current={esActual ? "step" : undefined}
            className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-2"
          >
            <div className="flex items-center sm:w-full">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border-2 font-display text-sm font-semibold",
                  completado && "border-success bg-success text-on-success",
                  esActual && "border-primary bg-primary text-on-primary",
                  !completado && !esActual && "border-line-strong bg-surface text-muted",
                )}
              >
                {completado ? <Check className="size-4" /> : i + 1}
              </span>
              {i < pasos.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn("mx-2 hidden h-0.5 flex-1 sm:block", completado ? "bg-success" : "bg-line")}
                />
              )}
            </div>
            <div className="min-w-0 pr-2">
              <p className={cn("text-sm font-semibold", esActual ? "text-ink" : "text-muted")}>
                {paso.titulo}
                <span className="sr-only">{completado ? " (completado)" : esActual ? " (paso actual)" : " (pendiente)"}</span>
              </p>
              {paso.descripcion && <p className="text-xs text-muted">{paso.descripcion}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
