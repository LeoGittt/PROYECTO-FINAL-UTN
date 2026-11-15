import { RotateCw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface ErrorStateProps {
  titulo?: string;
  /** Mensaje para el usuario (el de la API ya viene en español). */
  mensaje?: string;
  /** Si se pasa, aparece el botón para reintentar. */
  alReintentar?: () => void;
  className?: string;
}

/** Estado de error con reintento. Se anuncia a lectores de pantalla con `role="alert"`. */
export function ErrorState({
  titulo = "No pudimos cargar esta información",
  mensaje = "Revisá tu conexión e intentá de nuevo.",
  alReintentar,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-xl border-2 border-danger bg-danger-soft px-6 py-10 text-center",
        className,
      )}
    >
      <span aria-hidden="true" className="mb-3 grid size-12 place-items-center rounded-full bg-danger text-on-danger">
        <TriangleAlert className="size-6" />
      </span>
      <h2 className="font-display text-xl font-semibold text-danger-ink">{titulo}</h2>
      <p className="mt-1.5 max-w-md text-danger-ink">{mensaje}</p>
      {alReintentar && (
        <Button variante="secondary" tamano="sm" className="mt-5" iconoIzquierda={<RotateCw aria-hidden="true" className="size-4" />} onClick={alReintentar}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
