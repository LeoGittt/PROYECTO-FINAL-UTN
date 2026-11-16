"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

/** Error dentro de una pantalla con sesión: la navegación sigue disponible. */
export default function ErrorDePantalla({
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
    <ErrorState
      titulo="Algo salió mal en esta pantalla"
      mensaje="Ocurrió un error inesperado. Podés intentar de nuevo o elegir otra sección del menú."
      alReintentar={() => retry()}
    />
  );
}
