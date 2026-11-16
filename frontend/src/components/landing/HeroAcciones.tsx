"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";

/** Llamadas a la acción de la portada: cambian si ya hay una sesión iniciada. */
export function HeroAcciones() {
  const { estado } = useAuth();

  if (estado === "autenticado") {
    return (
      <div className="flex flex-wrap gap-3">
        <Button href="/panel" tamano="lg" variante="accent" iconoDerecha={<ArrowRight aria-hidden="true" className="size-5" />}>
          Ir a mi panel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button href="/registro" tamano="lg" variante="accent" iconoDerecha={<ArrowRight aria-hidden="true" className="size-5" />}>
        Crear mi cuenta
      </Button>
      <Button href="/login" tamano="lg" variante="secondary">
        Ya tengo cuenta
      </Button>
    </div>
  );
}
