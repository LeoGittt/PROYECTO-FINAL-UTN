import { cn } from "@/lib/cn";
import { bandaDePuntaje, puntajeAPorcentaje, normalizarPuntaje } from "@/lib/score";

export interface PuntajesDesglose {
  tecnologias?: number | null;
  texto?: number | null;
  contexto?: number | null;
}

interface ScoreBreakdownProps {
  puntajes: PuntajesDesglose;
  /** Muestra una línea que explica qué mide cada componente. */
  mostrarAyuda?: boolean;
  className?: string;
}

const FILAS = [
  {
    clave: "tecnologias",
    etiqueta: "Tecnologías",
    ayuda: "Cuánto de lo que pide el proyecto sabés usar, según tu nivel.",
    sinDato: "No se evalúa",
  },
  {
    clave: "texto",
    etiqueta: "Texto",
    ayuda: "Parecido entre tu descripción y la del proyecto.",
    sinDato: "No se evalúa en esta configuración",
  },
  {
    clave: "contexto",
    etiqueta: "Contexto",
    ayuda: "Tus horas semanales y tu año de cursada frente a lo que pide el proyecto.",
    sinDato: "No se evalúa",
  },
] as const;

const COLOR_BARRA = { alta: "bg-success", media: "bg-warning", baja: "bg-danger" } as const;

/**
 * Desglose de la compatibilidad en tres barras (tecnologías, texto, contexto).
 * Cada fila dice su valor en texto ("90 %"); la barra es refuerzo visual. Un componente
 * sin dato (por ejemplo, texto en la configuración v1) se muestra como "No se evalúa".
 */
export function ScoreBreakdown({ puntajes, mostrarAyuda = false, className }: ScoreBreakdownProps) {
  return (
    <ul aria-label="Desglose de la compatibilidad" className={cn("flex flex-col gap-3.5", className)}>
      {FILAS.map((fila) => {
        const valor = puntajes[fila.clave];
        const normalizado = normalizarPuntaje(valor);
        const porcentaje = puntajeAPorcentaje(valor);
        const banda = bandaDePuntaje(valor);
        return (
          <li key={fila.clave}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{fila.etiqueta}</span>
              <span className={cn("tabular-nums", porcentaje === null ? "text-muted" : "font-semibold text-ink")}>
                {porcentaje === null ? fila.sinDato : `${porcentaje} %`}
              </span>
            </div>
            <div aria-hidden="true" className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sunken ring-1 ring-line">
              {normalizado !== null && banda && (
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700", COLOR_BARRA[banda])}
                  style={{ width: `${normalizado * 100}%` }}
                />
              )}
            </div>
            {mostrarAyuda && <p className="mt-1 text-xs text-muted">{fila.ayuda}</p>}
          </li>
        );
      })}
    </ul>
  );
}
