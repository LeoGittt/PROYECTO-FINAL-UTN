import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type VarianteBadge = "neutral" | "primary" | "success" | "warning" | "danger" | "accent";

const VARIANTES: Record<VarianteBadge, string> = {
  neutral: "bg-sunken text-ink border border-line",
  primary: "bg-primary-soft text-primary-soft-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  accent: "bg-accent text-on-accent",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variante?: VarianteBadge;
}

/** Etiqueta corta de estado o categoría. El significado va en el texto, nunca solo en el color. */
export function Badge({ variante = "neutral", className, ...resto }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        VARIANTES[variante],
        className,
      )}
      {...resto}
    />
  );
}
