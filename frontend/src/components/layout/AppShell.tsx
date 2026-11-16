"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Footer } from "./Footer";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { SidebarNav } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

/**
 * Estructura de las pantallas con sesión:
 * barra lateral fija en escritorio, menú desplegable en móvil, encabezado con
 * notificaciones, tema y cuenta, y el contenido en `<main id="contenido">`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 overflow-y-auto px-4 py-5">
          <Logo href="/panel" className="px-2" />
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú de navegación"
              className="grid size-10 place-items-center rounded-lg text-ink hover:bg-sunken lg:hidden"
            >
              <Menu aria-hidden="true" className="size-6" />
            </button>
            <Logo href="/panel" className="lg:hidden" />
            <div className="ml-auto flex items-center gap-1">
              {usuario && usuario.rol !== "administrador" && <NotificationsBell />}
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none sm:px-6 lg:px-10"
        >
          {children}
        </main>
        <Footer compacto />
      </div>

      <Modal posicion="izquierda" abierto={menuAbierto} alCerrar={() => setMenuAbierto(false)} titulo="Menú">
        <SidebarNav alNavegar={() => setMenuAbierto(false)} />
      </Modal>
    </div>
  );
}
