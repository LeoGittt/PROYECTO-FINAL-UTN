import { FileQuestion, ShieldAlert } from "lucide-react";
import type { ApiError } from "@/lib/api/client";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

interface ErrorRecursoProps {
  error: ApiError | null;
  /** Cómo nombrar lo que se intentó abrir, con artículo (por ejemplo, "este proyecto"). */
  recurso: string;
  alReintentar?: () => void;
  /** Adónde ofrecer volver cuando el recurso no existe o no se puede ver. */
  volver?: { href: string; texto: string };
}

/**
 * Error al abrir un recurso puntual: distingue "no existe" (404) y "no tenés permiso" (403) de una
 * falla de red o del servidor, que sí admite reintento.
 */
export function ErrorRecurso({ error, recurso, alReintentar, volver }: ErrorRecursoProps) {
  const accion = volver ? <Button href={volver.href}>{volver.texto}</Button> : undefined;

  if (error?.statusCode === 404) {
    return (
      <EmptyState
        icono={<FileQuestion className="size-7" />}
        titulo={`No encontramos ${recurso}`}
        descripcion="Puede que se haya eliminado, que todavía no esté publicado o que el enlace sea incorrecto."
        accion={accion}
      />
    );
  }
  if (error?.statusCode === 403) {
    return (
      <EmptyState
        icono={<ShieldAlert className="size-7" />}
        titulo={`No tenés permiso para ver ${recurso}`}
        descripcion="Tu cuenta no tiene acceso a esta información. Si creés que es un error, volvé al listado."
        accion={accion}
      />
    );
  }
  return <ErrorState titulo={`No pudimos cargar ${recurso}`} mensaje={error?.message} alReintentar={alReintentar} />;
}
