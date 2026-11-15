import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface PaginationProps {
  /** Página actual, desde 1. */
  pagina: number;
  tamano: number;
  total: number;
  alCambiar: (pagina: number) => void;
  className?: string;
}

/** Números de página a mostrar; `null` es un salto ("…"). */
export function paginasVisibles(actual: number, totalPaginas: number): (number | null)[] {
  if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  const conjunto = new Set<number>([1, totalPaginas, actual - 1, actual, actual + 1]);
  if (actual <= 3) [2, 3, 4].forEach((n) => conjunto.add(n));
  if (actual >= totalPaginas - 2) [totalPaginas - 3, totalPaginas - 2, totalPaginas - 1].forEach((n) => conjunto.add(n));
  const ordenadas = [...conjunto].filter((n) => n >= 1 && n <= totalPaginas).sort((a, b) => a - b);
  const resultado: (number | null)[] = [];
  ordenadas.forEach((n, i) => {
    if (i > 0 && n - ordenadas[i - 1] > 1) resultado.push(null);
    resultado.push(n);
  });
  return resultado;
}

const BASE = "grid h-10 min-w-10 place-items-center rounded-lg px-2 text-sm font-semibold tabular-nums";

/** Paginación: resumen "Mostrando a–b de n" y navegación con `aria-current` en la página activa. */
export function Pagination({ pagina, tamano, total, alCambiar, className }: PaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / Math.max(1, tamano)));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const desde = total === 0 ? 0 : (actual - 1) * tamano + 1;
  const hasta = Math.min(total, actual * tamano);

  return (
    <nav aria-label="Paginación" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-sm text-muted" aria-live="polite">
        Mostrando {desde}–{hasta} de {total}
      </p>
      <ul className="flex items-center gap-1">
        <li>
          <button
            type="button"
            aria-label="Página anterior"
            disabled={actual <= 1}
            onClick={() => alCambiar(actual - 1)}
            className={cn(BASE, "border border-line-strong bg-surface text-ink hover:bg-sunken disabled:opacity-50")}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
        </li>
        {paginasVisibles(actual, totalPaginas).map((n, i) =>
          n === null ? (
            <li key={`salto-${i}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                aria-label={`Ir a la página ${n}`}
                aria-current={n === actual ? "page" : undefined}
                onClick={() => alCambiar(n)}
                className={cn(
                  BASE,
                  n === actual ? "bg-primary text-on-primary" : "text-ink hover:bg-sunken",
                )}
              >
                {n}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={actual >= totalPaginas}
            onClick={() => alCambiar(actual + 1)}
            className={cn(BASE, "border border-line-strong bg-surface text-ink hover:bg-sunken disabled:opacity-50")}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
