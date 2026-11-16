import { Check, Clock, MapPin, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ScoreBreakdown } from "@/components/ui/ScoreBreakdown";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { HeroAcciones } from "./HeroAcciones";

/** Tarjeta ilustrativa: muestra cómo se ve una recomendación. Los datos son de ejemplo. */
function TarjetaEjemplo() {
  return (
    <Card variante="sticker" relleno="lg" como="article" aria-label="Ejemplo ilustrativo de una recomendación">
      <p className="label-mono text-subtle">Ejemplo ilustrativo</p>
      <div className="mt-4 flex items-start justify-between gap-5">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold leading-tight">Tablero de ventas para una pyme</h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4" />
              Remoto
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4" />8 semanas · 10 h por semana
            </span>
          </p>
        </div>
        <ScoreRing valor={0.84} tamano="lg" mostrarBanda />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-success-ink">
          <Check aria-hidden="true" className="size-4" />
          React
          <span className="sr-only">(la tenés)</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-success-ink">
          <Check aria-hidden="true" className="size-4" />
          PostgreSQL
          <span className="sr-only">(la tenés)</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-warning-ink">
          <Minus aria-hidden="true" className="size-4" />
          Docker
          <span className="sr-only">(te falta)</span>
        </span>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <ScoreBreakdown puntajes={{ tecnologias: 0.9, texto: 0.7, contexto: 0.8 }} />
      </div>
    </Card>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="bg-grid absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-10 lg:py-24">
        <div className="animate-rise">
          <p className="label-mono inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-accent ring-1 ring-ink" />
            Estudiantes, empresas y cátedras de la UTN
          </p>
          <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
            Tu primera experiencia real empieza con un{" "}
            <span className="box-decoration-clone rounded-lg bg-accent px-2 text-on-accent">buen match</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
            Empresas y docentes publican proyectos acotados. Vos armás tu perfil y la plataforma te muestra primero los que
            mejor encajan con tus tecnologías, tu tiempo disponible y tu año de cursada.
          </p>
          <div className="mt-9">
            <HeroAcciones />
          </div>
          <p className="mt-6 max-w-xl text-sm text-muted">
            Sin listas infinitas ni decisiones a ojo: cada recomendación viene con su porcentaje de compatibilidad y el detalle
            de cómo se calculó.
          </p>
        </div>
        <div className="animate-rise [animation-delay:120ms]">
          <TarjetaEjemplo />
        </div>
      </div>
    </section>
  );
}
