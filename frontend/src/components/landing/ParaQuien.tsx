import { Building2, Check, GraduationCap, School } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const PERFILES = [
  {
    rol: "estudiante",
    icono: GraduationCap,
    titulo: "Estudiantes",
    texto: "Sumá experiencia real mientras cursás.",
    puntos: [
      "Recomendaciones ordenadas por compatibilidad",
      "Postulate o aceptá invitaciones",
      "Seguí cada postulación y recibí avisos",
    ],
    cta: "Soy estudiante",
  },
  {
    rol: "empresa",
    icono: Building2,
    titulo: "Empresas",
    texto: "Resolvé tareas acotadas con talento de la UTN.",
    puntos: [
      "Publicá un proyecto en pocos minutos",
      "Mirá los estudiantes que mejor encajan",
      "Invitá y gestioná las postulaciones",
    ],
    cta: "Represento a una empresa",
  },
  {
    rol: "docente",
    icono: School,
    titulo: "Docentes",
    texto: "Armá proyectos para tu cátedra o tu investigación.",
    puntos: [
      "Definí tecnologías, tiempo y modalidad",
      "Recibí recomendaciones de estudiantes",
      "Seguí el estado de cada postulación",
    ],
    cta: "Soy docente",
  },
] as const;

export function ParaQuien() {
  return (
    <section id="para-quien" aria-labelledby="titulo-quien" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-10">
      <p className="label-mono text-subtle">Para quién</p>
      <h2 id="titulo-quien" className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">
        Una plataforma, tres maneras de usarla
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PERFILES.map((p) => (
          <Card como="article" key={p.rol} variante="plana" relleno="lg" className="flex flex-col">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary-soft-ink">
              <p.icono className="size-6" />
            </span>
            <h3 className="mt-5 text-2xl font-bold">{p.titulo}</h3>
            <p className="mt-1 text-muted">{p.texto}</p>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
              {p.puntos.map((punto) => (
                <li key={punto} className="flex gap-2.5">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{punto}</span>
                </li>
              ))}
            </ul>
            <Button href={`/registro?rol=${p.rol}`} variante="secondary" className="mt-6">
              {p.cta}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
