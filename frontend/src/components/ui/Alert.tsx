import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type VarianteAlert = "info" | "success" | "warning" | "danger";

const ESTILOS: Record<VarianteAlert, { caja: string; icono: ReactNode }> = {
  info: { caja: "border-primary bg-primary-soft text-primary-soft-ink", icono: <Info className="size-5" /> },
  success: { caja: "border-success bg-success-soft text-success-ink", icono: <CircleCheck className="size-5" /> },
  warning: { caja: "border-warning bg-warning-soft text-warning-ink", icono: <TriangleAlert className="size-5" /> },
  danger: { caja: "border-danger bg-danger-soft text-danger-ink", icono: <CircleAlert className="size-5" /> },
};

interface AlertProps {
  variante?: VarianteAlert;
  titulo?: string;
  children?: ReactNode;
  className?: string;
}

/** Mensaje en línea. `danger` y `warning` se anuncian de inmediato (`role="alert"`); el resto es `status`. */
export function Alert({ variante = "info", titulo, children, className }: AlertProps) {
  const { caja, icono } = ESTILOS[variante];
  return (
    <div
      role={variante === "danger" || variante === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border-l-4 px-4 py-3 text-sm", caja, className)}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icono}
      </span>
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={cn(titulo && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}
