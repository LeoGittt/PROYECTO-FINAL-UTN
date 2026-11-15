import { Card } from "@/components/ui/Card";
import { HeroAcciones } from "./HeroAcciones";

export function CtaFinal() {
  return (
    <section aria-labelledby="titulo-cta" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-10">
      <Card variante="sticker" relleno="lg" className="bg-primary-soft text-center">
        <h2 id="titulo-cta" className="mx-auto max-w-2xl text-3xl font-bold text-primary-soft-ink sm:text-4xl">
          Armá tu perfil y mirá qué proyectos están esperando a alguien como vos
        </h2>
        <div className="mt-8 flex justify-center">
          <HeroAcciones />
        </div>
      </Card>
    </section>
  );
}
