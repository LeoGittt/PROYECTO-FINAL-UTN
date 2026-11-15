import { ChevronDown } from "lucide-react";
import type { Ref, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Campo, estilosControl, useIdsCampo, type PropsCampo } from "./Campo";

export interface OpcionSelect {
  valor: string | number;
  etiqueta: string;
  deshabilitada?: boolean;
}

export interface SelectProps
  extends PropsCampo,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "required" | "children"> {
  ref?: Ref<HTMLSelectElement>;
  opciones: OpcionSelect[];
  /** Texto de la opción vacía inicial (valor ""). Si se omite no hay opción vacía. */
  placeholder?: string;
}

/** Selector nativo (teclado y lectores de pantalla funcionan solos) con el aspecto del sistema. */
export function Select({
  label,
  hint,
  error,
  required,
  ocultarLabel,
  className,
  id,
  ref,
  opciones,
  placeholder,
  ...resto
}: SelectProps) {
  const ids = useIdsCampo(id, { hint: !!hint, error: !!error });
  return (
    <Campo label={label} hint={hint} error={error} required={required} ocultarLabel={ocultarLabel} ids={ids} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={ids.id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cn(estilosControl(!!error), "h-11 appearance-none pr-10")}
          {...resto}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor} disabled={o.deshabilitada}>
              {o.etiqueta}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
      </div>
    </Campo>
  );
}
