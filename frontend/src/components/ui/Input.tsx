import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";
import { Campo, estilosControl, useIdsCampo, type PropsCampo } from "./Campo";

export interface InputProps
  extends PropsCampo,
    Omit<InputHTMLAttributes<HTMLInputElement>, "required"> {
  ref?: Ref<HTMLInputElement>;
}

/** Campo de una línea con etiqueta, ayuda y error asociados. */
export function Input({ label, hint, error, required, ocultarLabel, className, id, ref, ...resto }: InputProps) {
  const ids = useIdsCampo(id, { hint: !!hint, error: !!error });
  return (
    <Campo label={label} hint={hint} error={error} required={required} ocultarLabel={ocultarLabel} ids={ids} className={className}>
      <input
        ref={ref}
        id={ids.id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(estilosControl(!!error), "h-11")}
        {...resto}
      />
    </Campo>
  );
}
