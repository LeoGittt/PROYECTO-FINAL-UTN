import { Card } from "@/components/ui/Card";
import { ScoreBreakdown } from "@/components/ui/ScoreBreakdown";

/** Explica el motor sin cajas negras: las tres señales que componen el porcentaje. */
export function Compatibilidad() {
  return (
    <section id="compatibilidad" aria-labelledby="titulo-compat" className="border-y border-line bg-ink text-canvas">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10">
        <div>
          <p className="label-mono inline-block rounded bg-accent px-2 py-0.5 text-on-accent">Compatibilidad</p>
          <h2 id="titulo-compat" className="mt-2 text-3xl font-bold sm:text-4xl">
            Un porcentaje que podés entender
          </h2>
          <p className="mt-5 text-lg">
            El puntaje combina tres señales, cada una con su peso, y siempre te mostramos el desglose para que sepas por qué
            un proyecto aparece primero y qué te falta para mejorar.
          </p>
          <dl className="mt-8 flex flex-col gap-5">
            <div>
              <dt className="font-display text-lg font-bold">Tecnologías</dt>
              <dd>Qué parte de lo que pide el proyecto sabés usar. Las obligatorias pesan el doble y tu nivel cuenta.</dd>
            </div>
            <div>
              <dt className="font-display text-lg font-bold">Texto</dt>
              <dd>
                El parecido entre lo que contás de vos y lo que describe el proyecto, para captar lo que las etiquetas no
                dicen.
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-bold">Contexto</dt>
              <dd>Si tus horas semanales y tu año de cursada alcanzan para lo que el proyecto necesita.</dd>
            </div>
          </dl>
        </div>
        <Card como="article" variante="plana" relleno="lg" className="text-ink" aria-label="Ejemplo ilustrativo del desglose de compatibilidad">
          <p className="label-mono text-subtle">Ejemplo ilustrativo</p>
          <h3 className="mt-2 mb-6 text-2xl font-bold">Así se ve el desglose</h3>
          <ScoreBreakdown puntajes={{ tecnologias: 0.9, texto: 0.7, contexto: 0.8 }} mostrarAyuda />
        </Card>
      </div>
    </section>
  );
}
