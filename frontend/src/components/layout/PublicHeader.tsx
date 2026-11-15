"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface PublicHeaderProps {
  /** Enlaces de anclas de la portada ("Cómo funciona", etc.). Se ocultan en pantallas chicas. */
  anclas?: { href: string; etiqueta: string }[];
}

/** Encabezado de las páginas públicas (portada, login, registro). */
export function PublicHeader({ anclas = [] }: PublicHeaderProps) {
  const { estado } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          {anclas.length > 0 && (
            <nav aria-label="Secciones de la portada" className="mr-2 hidden items-center gap-1 md:flex">
              {anclas.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-sunken hover:text-ink"
                >
                  {a.etiqueta}
                </Link>
              ))}
            </nav>
          )}
          <ThemeToggle />
          {estado === "autenticado" ? (
            <Button href="/panel" tamano="sm" iconoDerecha={<ArrowRight aria-hidden="true" className="size-4" />}>
              Ir a mi panel
            </Button>
          ) : (
            <>
              <Button href="/login" variante="ghost" tamano="sm">
                Ingresar
              </Button>
              <Button href="/registro" tamano="sm" className="max-sm:hidden">
                Crear cuenta
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
