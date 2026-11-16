import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Campo, estilosControl, useIdsCampo, type PropsCampo } from "./Campo";

export interface TextareaProps
  extends PropsCampo,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "required"> {
  ref?: Ref<HTMLTextAreaElement>;
  /** Muestra "n/máximo" usando `maxLength`. */
  mostrarContador?: boolean;
}

export function Textarea({
  label,
  hint,
  error,
  required,
  ocultarLabel,
  className,
  id,
  ref,
  mostrarContador,
  value,
  maxLength,
  rows = 4,
  ...resto
}: TextareaProps) {
  const ids = useIdsCampo(id, { hint: !!hint, error: !!error });
  const largo = typeof value === "string" ? value.length : 0;
  const contador =
    mostrarContador && maxLength ? (
      <span className="text-xs tabular-nums text-subtle" aria-hidden="true">
        {largo}/{maxLength}
      </span>
    ) : undefined;

  return (
    <Campo
      label={label}
      hint={hint}
      error={error}
      required={required}
      ocultarLabel={ocultarLabel}
      ids={ids}
      extra={contador}
      className={className}
    >
      <textarea
        ref={ref}
        id={ids.id}
        required={required}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(estilosControl(!!error), "min-h-24 resize-y py-2.5 leading-relaxed")}
        {...resto}
      />
    </Campo>
  );
}
