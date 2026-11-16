"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Rol } from "@/lib/api/types";

/** Destino seguro después del login: solo rutas internas ("/algo"), nunca URLs externas. */
export function rutaInternaSegura(ruta: string | null | undefined, porDefecto = "/panel"): string {
  if (!ruta || !ruta.startsWith("/") || ruta.startsWith("//") || ruta.includes("\\")) return porDefecto;
  return ruta;
}

export function PantallaCarga({ mensaje = "Cargando…" }: { mensaje?: string }) {
  return (
    <div role="status" className="grid min-h-[50dvh] place-items-center p-8">
      <p className="flex items-center gap-3 text-muted">
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        {mensaje}
      </p>
    </div>
  );
}

interface RoleGuardProps {
  /** Roles autorizados. Si se omite, alcanza con tener sesión iniciada. */
  roles?: Rol[];
  children: ReactNode;
}

/**
 * Protege una sección del lado del cliente:
 * - sin sesión: redirige a /login conservando la ruta pedida;
 * - con sesión pero sin el rol: muestra "sin acceso" (la API igual rechaza con 403);
 * - mientras se verifica la sesión: pantalla de carga.
 * La protección real está en el backend; esto evita mostrar pantallas que no corresponden.
 */
export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { estado, usuario, cerradaPorUsuario } = useAuth();
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    // Si cerró la sesión él mismo, el cierre ya lo lleva al inicio.
    if (estado === "anonimo" && !cerradaPorUsuario) router.replace(`/login?siguiente=${encodeURIComponent(ruta)}`);
  }, [estado, cerradaPorUsuario, router, ruta]);

  if (estado === "cargando") return <PantallaCarga mensaje="Verificando tu sesión…" />;
  if (estado === "anonimo" || !usuario) return <PantallaCarga mensaje="Redirigiendo al inicio de sesión…" />;

  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <span aria-hidden="true" className="mb-4 grid size-14 place-items-center rounded-full bg-warning-soft text-warning-ink">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-semibold">No tenés acceso a esta sección</h1>
        <p className="mt-2 text-muted">Tu rol no incluye esta pantalla. Volvé al panel para ver lo que sí podés hacer.</p>
        <Button href="/panel" className="mt-6">
          Ir al panel
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
