"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROL_ETIQUETA } from "@/lib/labels";

/** Menú de la cuenta (patrón "disclosure"): nombre, rol, acceso al perfil y cierre de sesión. */
export function UserMenu() {
  const { usuario, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: PointerEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", alPulsar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alPulsar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  if (!usuario) return null;

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => setAbierto((a) => !a)}
        className="flex h-11 items-center gap-2 rounded-lg px-1.5 hover:bg-sunken sm:pr-2"
      >
        <Avatar nombre={usuario.nombre} apellido={usuario.apellido} tamano="sm" />
        <span className="hidden max-w-32 truncate text-sm font-semibold text-ink sm:block">{usuario.nombre}</span>
        <span className="sr-only sm:hidden">Cuenta de {usuario.nombre}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </button>
      {abierto && (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-line bg-surface p-2 shadow-pop animate-pop-in"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar nombre={usuario.nombre} apellido={usuario.apellido} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">
                {usuario.nombre} {usuario.apellido}
              </p>
              <p className="truncate text-sm text-muted">{usuario.email}</p>
              <Badge variante="primary" className="mt-1.5">
                {ROL_ETIQUETA[usuario.rol]}
              </Badge>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          {usuario.rol !== "administrador" && (
            <Link
              href="/perfil"
              onClick={() => setAbierto(false)}
              className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-sunken"
            >
              <UserRound aria-hidden="true" className="size-4" />
              Mi perfil
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              logout();
            }}
            className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-sunken"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
