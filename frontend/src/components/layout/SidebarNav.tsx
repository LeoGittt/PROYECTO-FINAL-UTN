"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { elegirActivo, navegacionParaRol } from "@/lib/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

interface SidebarNavProps {
  /** Se llama al elegir un destino (el menú móvil lo usa para cerrarse). */
  alNavegar?: () => void;
}

/** Navegación principal según el rol del usuario. */
export function SidebarNav({ alNavegar }: SidebarNavProps) {
  const { usuario } = useAuth();
  const ruta = usePathname();
  if (!usuario) return null;

  const grupos = navegacionParaRol(usuario.rol);
  const activo = elegirActivo(grupos, ruta);

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-5">
      {grupos.map((grupo, i) => (
        <div key={grupo.titulo ?? `grupo-${i}`}>
          {grupo.titulo && <p className="label-mono mb-2 px-3 text-subtle">{grupo.titulo}</p>}
          <ul className="flex flex-col gap-0.5">
            {grupo.items.map((item) => {
              const esActivo = item.href === activo;
              const Icono = item.icono;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={alNavegar}
                    aria-current={esActivo ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-semibold transition-colors",
                      esActivo ? "bg-primary-soft text-primary-soft-ink" : "text-muted hover:bg-sunken hover:text-ink",
                    )}
                  >
                    <Icono aria-hidden="true" className="size-5 shrink-0" />
                    {item.etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
