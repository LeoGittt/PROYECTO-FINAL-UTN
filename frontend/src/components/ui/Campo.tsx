import { AlertCircle } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Props comunes de los campos de formulario (Input, Textarea, Select). */
export interface PropsCampo {
  label: string;
  /** Ayuda visible bajo la etiqueta; se asocia con `aria-describedby`. */
  hint?: string;
  /** Mensaje de error; marca el campo con `aria-invalid`. */
  error?: string;
  /** Agrega el asterisco y el atributo `required`. */
  required?: boolean;
  /** Oculta la etiqueta visualmente (sigue disponible para lectores de pantalla). */
  ocultarLabel?: boolean;
}

export interface IdsCampo {
  id: string;
  hintId: string | undefined;
  errorId: string | undefined;
  describedBy: string | undefined;
}

/** Genera los ids que enlazan etiqueta, ayuda y error con el control. */
export function useIdsCampo(idPropio: string | undefined, hay: { hint: boolean; error: boolean }): IdsCampo {
  const generado = useId();
  const id = idPropio ?? `campo-${generado}`;
  const hintId = hay.hint ? `${id}-hint` : undefined;
  const errorId = hay.error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return { id, hintId, errorId, describedBy };
}

interface CampoProps extends PropsCampo {
  ids: IdsCampo;
  /** Contenido a la derecha de la etiqueta (por ejemplo, un contador). */
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Envoltorio visual: etiqueta, ayuda, control y error. */
export function Campo({ label, hint, error, required, ocultarLabel, ids, extra, children, className }: CampoProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={ids.id}
          className={cn("text-sm font-semibold text-ink", ocultarLabel && "sr-only")}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-danger-ink">
              *
            </span>
          )}
        </label>
        {extra}
      </div>
      {hint && (
        <p id={ids.hintId} className="-mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={ids.errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger-ink">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Clases base del control (input, textarea, select). */
export function estilosControl(conError: boolean): string {
  return cn(
    "w-full rounded-lg border bg-surface px-3.5 text-ink transition-colors placeholder:text-subtle",
    "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted",
    conError ? "border-danger" : "border-line-strong hover:border-ink",
  );
}
