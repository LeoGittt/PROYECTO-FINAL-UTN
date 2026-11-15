import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";

export type VarianteBoton = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type TamanoBoton = "sm" | "md" | "lg";

interface BaseProps {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  /** Muestra un spinner, deshabilita el botón y marca `aria-busy`. */
  cargando?: boolean;
  iconoIzquierda?: ReactNode;
  iconoDerecha?: ReactNode;
  /** Ocupa todo el ancho disponible. */
  bloque?: boolean;
}

type BotonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined; ref?: Ref<HTMLButtonElement> };
type EnlaceProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; ref?: Ref<HTMLAnchorElement> };

const VARIANTES: Record<VarianteBoton, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:translate-y-px",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-sunken active:translate-y-px",
  ghost: "text-ink hover:bg-sunken active:translate-y-px",
  danger: "bg-danger text-on-danger hover:brightness-110 active:translate-y-px",
  accent:
    "border-2 border-ink bg-accent text-on-accent shadow-[3px_3px_0_0_var(--ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_var(--ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
};

const TAMANOS: Record<TamanoBoton, string> = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-11 gap-2 px-5 text-[0.95rem]",
  lg: "h-12 gap-2.5 px-6 text-base",
};

export function estilosBoton({
  variante = "primary",
  tamano = "md",
  bloque,
  className,
}: Pick<BaseProps, "variante" | "tamano" | "bloque"> & { className?: string }): string {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-[background-color,box-shadow,transform,filter] duration-150",
    "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
    VARIANTES[variante],
    TAMANOS[tamano],
    bloque && "w-full",
    className,
  );
}

/** Botón accesible. Con `href` se renderiza como enlace de Next.js con el mismo aspecto. */
export function Button(props: BotonProps | EnlaceProps) {
  const { variante, tamano, cargando, iconoIzquierda, iconoDerecha, bloque, className, children, ...resto } =
    props;
  const clases = estilosBoton({ variante, tamano, bloque, className });
  const contenido = (
    <>
      {cargando ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : iconoIzquierda}
      {children}
      {!cargando && iconoDerecha}
    </>
  );

  if (props.href !== undefined) {
    const { href, ref, ...enlace } = resto as Omit<EnlaceProps, keyof BaseProps | "children" | "className">;
    return (
      <Link href={href} ref={ref} className={clases} {...enlace}>
        {contenido}
      </Link>
    );
  }

  const { ref, type = "button", disabled, ...boton } = resto as Omit<
    BotonProps,
    keyof BaseProps | "children" | "className"
  >;
  return (
    <button
      ref={ref}
      type={type}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...boton}
    >
      {contenido}
    </button>
  );
}
