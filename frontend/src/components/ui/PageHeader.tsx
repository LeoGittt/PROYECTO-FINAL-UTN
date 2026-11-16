import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  titulo: ReactNode;
  descripcion?: ReactNode;
  /** Rótulo técnico en mayúsculas sobre el título (por ejemplo, "Proyectos"). */
  etiqueta?: string;
  /** Contenido junto al título (por ejemplo, un `Badge` de estado). */
  junto?: ReactNode;
  /** Botones de acción, a la derecha en pantallas anchas. */
  acciones?: ReactNode;
  /** Enlace para volver a la pantalla anterior. */
  volver?: { href: string; texto: string };
  className?: string;
}

/** Encabezado de pantalla: el `h1`, su descripción y las acciones principales. Una sola vez por página. */
export function PageHeader({ titulo, descripcion, etiqueta, junto, acciones, volver, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      {volver && (
        <Link
          href={volver.href}
          className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {volver.texto}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {etiqueta && <p className="label-mono mb-1.5 text-primary">{etiqueta}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-bold sm:text-4xl">{titulo}</h1>
            {junto}
          </div>
          {descripcion && <div className="mt-2 text-muted">{descripcion}</div>}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap gap-3">{acciones}</div>}
      </div>
    </header>
  );
}
