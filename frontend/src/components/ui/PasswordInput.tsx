"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/cn";
import { Campo, estilosControl, useIdsCampo, type PropsCampo } from "./Campo";

export interface PasswordInputProps
  extends PropsCampo,
    Omit<InputHTMLAttributes<HTMLInputElement>, "required" | "type"> {
  ref?: Ref<HTMLInputElement>;
}

/** Campo de contraseña con botón para mostrarla u ocultarla (con estado anunciado: `aria-pressed`). */
export function PasswordInput({
  label,
  hint,
  error,
  required,
  ocultarLabel,
  className,
  id,
  ref,
  ...resto
}: PasswordInputProps) {
  const ids = useIdsCampo(id, { hint: !!hint, error: !!error });
  const [visible, setVisible] = useState(false);
  return (
    <Campo label={label} hint={hint} error={error} required={required} ocultarLabel={ocultarLabel} ids={ids} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={ids.id}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cn(estilosControl(!!error), "h-11 pr-12")}
          {...resto}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label="Mostrar contraseña"
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      </div>
    </Campo>
  );
}
