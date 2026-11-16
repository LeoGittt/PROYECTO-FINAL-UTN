import { cn } from "@/lib/cn";

export interface OpcionFiltro<V extends string> {
  valor: V;
  etiqueta: string;
  /** Cantidad de elementos que cumplen el filtro. */
  contador?: number;
}

interface FilterChipsProps<V extends string> {
  /** Qué filtra el grupo, para lectores de pantalla (por ejemplo, "Filtrar por estado"). */
  etiqueta: string;
  opciones: OpcionFiltro<V>[];
  valor: V;
  alCambiar: (valor: V) => void;
  className?: string;
}

/**
 * Filtro de una sola opción con botones tipo píldora. Cada botón es un conmutador (`aria-pressed`)
 * y la opción elegida se distingue con relleno y una tilde de peso, no solo con color.
 */
export function FilterChips<V extends string>({ etiqueta, opciones, valor, alCambiar, className }: FilterChipsProps<V>) {
  return (
    <div role="group" aria-label={etiqueta} className={cn("flex flex-wrap gap-2", className)}>
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activa}
            onClick={() => alCambiar(opcion.valor)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
              activa
                ? "border-primary bg-primary text-on-primary"
                : "border-line-strong bg-surface text-ink hover:border-ink hover:bg-sunken",
            )}
          >
            {opcion.etiqueta}
            {/* El espacio separa etiqueta y contador en el nombre accesible ("Todas 5"); no se ve en el flex. */}
            {opcion.contador !== undefined && " "}
            {opcion.contador !== undefined && (
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 text-center text-xs tabular-nums",
                  activa ? "bg-on-primary/20 text-on-primary" : "bg-sunken text-ink",
                )}
              >
                {opcion.contador}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
