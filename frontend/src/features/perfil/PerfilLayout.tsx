import type { ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { Completitud } from "./completitud";
import { CompletitudCard } from "./CompletitudCard";

interface PerfilLayoutProps {
  titulo: string;
  descripcion: string;
  completitud: Completitud;
  children: ReactNode;
}

/** Estructura común de las pantallas de perfil: formulario a la izquierda y completitud a la derecha. */
export function PerfilLayout({ titulo, descripcion, completitud, children }: PerfilLayoutProps) {
  return (
    <div>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{titulo}</h1>
        <p className="mt-2 text-muted">{descripcion}</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-6">{children}</div>
        <aside aria-label="Estado del perfil" className="lg:sticky lg:top-24">
          <CompletitudCard completitud={completitud} />
        </aside>
      </div>
    </div>
  );
}

interface SeccionPerfilProps {
  numero: string;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}

/** Sección numerada del formulario de perfil. */
export function SeccionPerfil({ numero, titulo, descripcion, children }: SeccionPerfilProps) {
  return (
    <Card como="section" variante="plana" relleno="md" aria-labelledby={`seccion-${numero}`}>
      <p aria-hidden="true" className="label-mono text-primary">
        {numero}
      </p>
      <CardTitle id={`seccion-${numero}`}>{titulo}</CardTitle>
      {descripcion && <p className="mt-1 text-sm text-muted">{descripcion}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </Card>
  );
}
