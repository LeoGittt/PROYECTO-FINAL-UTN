import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type VarianteCard = "plana" | "elevada" | "sticker";
type RellenoCard = "ninguno" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Elemento HTML a renderizar (`section`, `article`, `li`...). */
  como?: ElementType;
  /** `sticker` lleva sombra dura: se reserva para lo más importante de la pantalla. */
  variante?: VarianteCard;
  relleno?: RellenoCard;
}

const VARIANTES: Record<VarianteCard, string> = {
  plana: "border border-line bg-surface",
  elevada: "border border-line bg-surface shadow-soft",
  sticker: "border-2 border-ink bg-surface shadow-hard",
};

const RELLENOS: Record<RellenoCard, string> = {
  ninguno: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({ como: Componente = "div", variante = "elevada", relleno = "md", className, ...resto }: CardProps) {
  return <Componente className={cn("rounded-xl", VARIANTES[variante], RELLENOS[relleno], className)} {...resto} />;
}

export function CardTitle({ como: Componente = "h2", className, ...resto }: HTMLAttributes<HTMLHeadingElement> & { como?: ElementType }) {
  return <Componente className={cn("font-display text-xl font-semibold text-ink", className)} {...resto} />;
}
