import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

export function Footer({ compacto = false, className }: { compacto?: boolean; className?: string }) {
  return (
    <footer className={cn("border-t border-line bg-surface", className)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:px-6 lg:px-10",
          compacto ? "py-5 text-xs" : "py-10 text-sm sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        {!compacto && <Logo />}
        <p className="max-w-xl text-muted">
          Proyecto Final de la Tecnicatura Universitaria en Programación (UTN). Es un trabajo académico:
          no es un sitio oficial de la universidad.
        </p>
      </div>
    </footer>
  );
}
