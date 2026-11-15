import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/cn";

/** Marca: dos aros que se superponen; la intersección en lima es el "match". */
export function LogoMarca({ className }: { className?: string }) {
  const id = useId();
  const recorte = `lente-${id}`;
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <defs>
        <clipPath id={recorte}>
          <circle cx="16" cy="22" r="12" />
        </clipPath>
      </defs>
      <circle cx="28" cy="22" r="12" fill="var(--accent)" clipPath={`url(#${recorte})`} />
      <circle cx="16" cy="22" r="12" fill="none" stroke="var(--primary)" strokeWidth="3.5" />
      <circle cx="28" cy="22" r="12" fill="none" stroke="var(--ink)" strokeWidth="3.5" />
    </svg>
  );
}

interface LogoProps {
  /** Destino del enlace. `null` renderiza solo la marca, sin enlace. */
  href?: string | null;
  className?: string;
}

export function Logo({ href = "/", className }: LogoProps) {
  const contenido = (
    <>
      <LogoMarca />
      <span className="whitespace-nowrap font-display text-xl font-extrabold tracking-tight text-ink">
        UTN <span className="text-primary">Match</span>
      </span>
    </>
  );
  if (href === null) return <span className={cn("inline-flex items-center gap-2", className)}>{contenido}</span>;
  return (
    <Link href={href} aria-label="UTN Match, ir al inicio" className={cn("inline-flex items-center gap-2 rounded-lg", className)}>
      {contenido}
    </Link>
  );
}
