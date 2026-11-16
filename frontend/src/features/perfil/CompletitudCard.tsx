import { Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import type { Completitud } from "./completitud";

interface CompletitudCardProps {
  completitud: Completitud;
  className?: string;
}

/** Indicador de completitud del perfil: porcentaje, barra y lista de lo que falta. */
export function CompletitudCard({ completitud, className }: CompletitudCardProps) {
  const completo = completitud.faltantes.length === 0;
  return (
    <Card como="section" aria-labelledby="titulo-completitud" variante="elevada" relleno="md" className={className}>
      <p id="titulo-completitud" className="label-mono text-subtle">
        Completitud del perfil
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-5xl font-extrabold tabular-nums">
          {completitud.porcentaje}
        </span>
        <span aria-hidden="true" className="font-display text-xl font-semibold text-muted">
          %
        </span>
      </div>
      <ProgressBar valor={completitud.porcentaje} etiqueta="Completitud del perfil" className="mt-3" />
      <p className="mt-3 text-sm text-muted">
        {completo
          ? "Tu perfil está completo. Mientras más al día lo tengas, mejores son las recomendaciones."
          : "Un perfil completo mejora las recomendaciones. Esto es lo que falta:"}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {completitud.items.map((item) => (
          <li key={item.clave} className={cn("flex items-start gap-2 text-sm", item.cumplido ? "text-muted" : "font-medium text-ink")}>
            {item.cumplido ? (
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-line-strong" />
            )}
            <span>
              {item.cumplido ? item.hecho : item.pendiente}
              <span className="sr-only">{item.cumplido ? " (hecho)" : " (pendiente)"}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
