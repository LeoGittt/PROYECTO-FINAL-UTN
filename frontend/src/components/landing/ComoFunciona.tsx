import { ClipboardList, Rocket, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

const PASOS = [
  {
    numero: "01",
    icono: ClipboardList,
    titulo: "Armá tu perfil",
    texto:
      "Cargás tu carrera, tu año, las materias que aprobaste, las tecnologías que manejás con su nivel y cuántas horas por semana tenés libres. Lleva pocos minutos.",
  },
  {
    numero: "02",
    icono: Sparkles,
    titulo: "El motor te recomienda",
    texto:
      "Empresas y cátedras publican proyectos acotados. Para cada uno calculamos tu porcentaje de compatibilidad y te mostramos primero los que mejor encajan.",
  },
  {
    numero: "03",
    icono: Rocket,
    titulo: "Te postulás y seguís el proceso",
    texto:
      "Te postulás con un mensaje, o te invitan. Seguís el estado de cada postulación y recibís un aviso cada vez que algo cambia.",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-10">
      <p className="label-mono text-subtle">Cómo funciona</p>
      <h2 id="titulo-como" className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">
        De tu perfil a tu primer proyecto, en tres pasos
      </h2>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {PASOS.map((paso) => (
          <Card como="li" key={paso.numero} variante="plana" relleno="lg" className="relative">
            <span aria-hidden="true" className="font-mono text-sm font-semibold text-primary">
              {paso.numero}
            </span>
            <span aria-hidden="true" className="mt-3 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary-soft-ink">
              <paso.icono className="size-6" />
            </span>
            <h3 className="mt-5 text-xl font-bold">{paso.titulo}</h3>
            <p className="mt-2 text-muted">{paso.texto}</p>
          </Card>
        ))}
      </ol>
    </section>
  );
}
