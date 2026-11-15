"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** Límite de errores de la aplicación: algo falló al mostrar la pantalla. */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="contenido" tabIndex={-1} className="grid min-h-dvh place-items-center px-4 py-16 outline-none">
      <div role="alert" className="max-w-lg text-center">
        <span aria-hidden="true" className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-danger-soft text-danger-ink">
          <TriangleAlert className="size-8" />
        </span>
        <h1 className="font-display text-3xl font-bold">Algo salió mal</h1>
        <p className="mt-3 text-muted">
          Ocurrió un error inesperado al mostrar esta pantalla. Podés intentar de nuevo; si sigue pasando, volvé al inicio.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-subtle">Código: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => retry()} iconoIzquierda={<RotateCw aria-hidden="true" className="size-4" />}>
            Intentar de nuevo
          </Button>
          <Button href="/" variante="secondary">
            Ir al inicio
          </Button>
        </div>
      </div>
    </main>
  );
}
