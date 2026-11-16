import { cn } from "@/lib/cn";
import { iniciales } from "@/lib/format";

type TamanoAvatar = "sm" | "md" | "lg";

interface AvatarProps {
  nombre: string;
  apellido?: string;
  tamano?: TamanoAvatar;
  /** URL de imagen opcional; si falta se muestran las iniciales. */
  src?: string;
  className?: string;
}

const TAMANOS: Record<TamanoAvatar, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

// Pares de fondo/texto verificados en contraste (ver contraste.test.ts).
const TONOS = [
  "bg-primary-soft text-primary-soft-ink",
  "bg-success-soft text-success-ink",
  "bg-warning-soft text-warning-ink",
  "bg-danger-soft text-danger-ink",
  "bg-accent text-on-accent",
];

function tonoDe(texto: string): string {
  let hash = 0;
  for (const caracter of texto) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0;
  return TONOS[hash % TONOS.length];
}

/**
 * Avatar con iniciales. Es decorativo (`aria-hidden`): el nombre de la persona
 * debe estar siempre al lado en texto.
 */
export function Avatar({ nombre, apellido, tamano = "md", src, className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full font-display font-semibold",
        TAMANOS[tamano],
        !src && tonoDe(`${nombre} ${apellido ?? ""}`),
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar externo, tamaño fijo
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        iniciales(nombre, apellido)
      )}
    </span>
  );
}
