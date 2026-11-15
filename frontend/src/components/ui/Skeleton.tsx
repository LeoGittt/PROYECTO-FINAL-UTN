import { cn } from "@/lib/cn";

/** Bloque de carga con brillo suave. Decorativo: el contenedor debe llevar `aria-busy`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--sunken)_25%,var(--line)_50%,var(--sunken)_75%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

/** Varias líneas de texto; la última es más corta. */
export function SkeletonTexto({ lineas = 3, className }: { lineas?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lineas }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lineas - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Tarjeta de carga con título y texto. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("rounded-xl border border-line bg-surface p-5", className)}>
      <Skeleton className="mb-4 h-6 w-1/2" />
      <SkeletonTexto lineas={3} />
    </div>
  );
}

/** Contenedor de una zona en carga: avisa a lectores de pantalla y muestra un texto oculto. */
export function RegionCargando({
  etiqueta = "Cargando contenido",
  children,
  className,
}: {
  etiqueta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{etiqueta}</span>
      {children}
    </div>
  );
}
