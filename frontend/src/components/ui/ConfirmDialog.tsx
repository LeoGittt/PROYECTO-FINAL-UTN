"use client";

import { useState, type ReactNode } from "react";
import { mensajeDeError } from "@/lib/api/client";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: string;
  /** Contenido extra entre la descripción y los botones (por ejemplo, un campo de mensaje). */
  children?: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  /** `danger` para acciones destructivas o irreversibles. */
  variante?: "primary" | "danger";
  /**
   * Lo que se hace al confirmar. Si falla (lanza), el diálogo sigue abierto y muestra el mensaje
   * del error; si termina bien, se cierra solo.
   */
  alConfirmar: () => Promise<void>;
  /** Para bloquear la confirmación hasta que el contenido extra sea válido. */
  confirmarDeshabilitado?: boolean;
}

function Contenido({
  alCerrar,
  titulo,
  descripcion,
  children,
  textoConfirmar,
  textoCancelar = "Cancelar",
  variante = "primary",
  alConfirmar,
  confirmarDeshabilitado,
}: Omit<ConfirmDialogProps, "abierto">) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null);
    setEnviando(true);
    try {
      await alConfirmar();
      alCerrar();
    } catch (falla) {
      setError(mensajeDeError(falla));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto
      // Mientras la acción está en curso no se puede cerrar: evita perder el resultado de lo que se envió.
      alCerrar={() => {
        if (!enviando) alCerrar();
      }}
      titulo={titulo}
      descripcion={descripcion}
      tamano="sm"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar} disabled={enviando}>
            {textoCancelar}
          </Button>
          <Button
            variante={variante === "danger" ? "danger" : "primary"}
            cargando={enviando}
            disabled={confirmarDeshabilitado}
            onClick={confirmar}
          >
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        {error && <Alert variante="danger">{error}</Alert>}
      </div>
    </Modal>
  );
}

/**
 * Diálogo de confirmación para acciones que cambian datos. Se monta recién al abrirse, así que su
 * estado (cargando, error) arranca limpio cada vez. El foco inicial queda en el botón de cerrar del
 * diálogo (o en un hijo con `data-autofocus`), nunca en la acción de confirmar.
 */
export function ConfirmDialog({ abierto, ...resto }: ConfirmDialogProps) {
  if (!abierto) return null;
  return <Contenido {...resto} />;
}
