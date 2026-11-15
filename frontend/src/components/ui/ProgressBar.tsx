import { cn } from "@/lib/cn";

interface ProgressBarProps {
  /** Valor de 0 a 100. Se limita a ese rango. */
  valor: number;
  /** Texto accesible: qué se está midiendo. */
  etiqueta: string;
  className?: string;
}

/** Barra de progreso con semántica `progressbar` (por ejemplo, la completitud del perfil). */
export function ProgressBar({ valor, etiqueta, className }: ProgressBarProps) {
  const limitado = Number.isFinite(valor) ? Math.min(100, Math.max(0, Math.round(valor))) : 0;
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={limitado}
      aria-valuetext={`${limitado} %`}
      className={cn("h-3 w-full overflow-hidden rounded-full border border-line-strong bg-sunken", className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${limitado}%` }}
      />
    </div>
  );
}
