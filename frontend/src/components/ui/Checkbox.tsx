import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  descripcion?: string;
}

/** Casilla nativa con etiqueta clickeable y área de toque amplia. */
export function Checkbox({ label, descripcion, className, ...resto }: CheckboxProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-sunken has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        className,
      )}
    >
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary" {...resto} />
      <span className="text-sm leading-snug">
        <span className="font-medium text-ink">{label}</span>
        {descripcion && <span className="block text-muted">{descripcion}</span>}
      </span>
    </label>
  );
}
