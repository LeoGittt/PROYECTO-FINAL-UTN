import { cn } from "@/lib/cn";
import { bandaDePuntaje, puntajeAPorcentaje, normalizarPuntaje, type BandaCompatibilidad } from "@/lib/score";

type TamanoRing = "sm" | "md" | "lg";

interface ScoreRingProps {
  /** Puntaje de 0 a 1. Se limita a ese rango; `null`/`undefined` indican "sin dato". */
  valor: number | null | undefined;
  tamano?: TamanoRing;
  /** Muestra bajo el aro la banda en texto ("Alta", "Media", "Baja"). */
  mostrarBanda?: boolean;
  className?: string;
}

const LADOS: Record<TamanoRing, string> = { sm: "size-14", md: "size-24", lg: "size-36" };
const NUMEROS: Record<TamanoRing, string> = { sm: "text-lg", md: "text-3xl", lg: "text-5xl" };
const SIGNOS: Record<TamanoRing, string> = { sm: "text-[0.6rem]", md: "text-sm", lg: "text-xl" };

const COLOR_ARCO: Record<BandaCompatibilidad, string> = {
  alta: "stroke-success",
  media: "stroke-warning",
  baja: "stroke-danger",
};
const COLOR_BANDA: Record<BandaCompatibilidad, string> = {
  alta: "bg-success-soft text-success-ink",
  media: "bg-warning-soft text-warning-ink",
  baja: "bg-danger-soft text-danger-ink",
};
const TEXTO_BANDA: Record<BandaCompatibilidad, string> = { alta: "alta", media: "media", baja: "baja" };

const RADIO = 44;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/**
 * Aro de compatibilidad. El aro y el número son visuales; lo que leen los lectores
 * de pantalla es el `aria-label` ("Compatibilidad: 82 % (alta)"). La banda nunca se
 * comunica solo con color: va en el texto.
 */
export function ScoreRing({ valor, tamano = "md", mostrarBanda = false, className }: ScoreRingProps) {
  const normalizado = normalizarPuntaje(valor);
  const porcentaje = puntajeAPorcentaje(valor);
  const banda = bandaDePuntaje(valor);
  const etiqueta =
    porcentaje === null || banda === null
      ? "Compatibilidad no disponible"
      : `Compatibilidad: ${porcentaje} % (${TEXTO_BANDA[banda]})`;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div role="img" aria-label={etiqueta} className={cn("relative grid place-items-center", LADOS[tamano])}>
        <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="50" cy="50" r={RADIO} fill="none" strokeWidth="9" className="stroke-line" />
          {normalizado !== null && normalizado > 0 && banda && (
            <circle
              cx="50"
              cy="50"
              r={RADIO}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={CIRCUNFERENCIA * (1 - normalizado)}
              className={cn(COLOR_ARCO[banda], "transition-[stroke-dashoffset] duration-700 ease-out")}
            />
          )}
        </svg>
        <span aria-hidden="true" className="relative flex items-baseline font-display font-semibold leading-none text-ink">
          {porcentaje === null ? (
            <span className={NUMEROS[tamano]}>—</span>
          ) : (
            <>
              <span className={cn(NUMEROS[tamano], "tabular-nums")}>{porcentaje}</span>
              <span className={cn(SIGNOS[tamano], "ml-0.5 text-muted")}>%</span>
            </>
          )}
        </span>
      </div>
      {mostrarBanda && banda && (
        <span aria-hidden="true" className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", COLOR_BANDA[banda])}>
          Compatibilidad {TEXTO_BANDA[banda]}
        </span>
      )}
    </div>
  );
}
