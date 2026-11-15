"use client";

import {
  ArrowRight,
  BarChart3,
  Bell,
  FolderCheck,
  FolderKanban,
  Mail,
  PlusCircle,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Rol } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROL_ETIQUETA } from "@/lib/labels";
import { completitudDePerfil } from "@/features/perfil/completitud";

interface Accion {
  href: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
}

const ACCIONES: Record<Rol, Accion[]> = {
  estudiante: [
    { href: "/recomendaciones", titulo: "Ver recomendaciones", descripcion: "Los proyectos que mejor encajan con tu perfil, ordenados por compatibilidad.", icono: Sparkles },
    { href: "/proyectos", titulo: "Buscar proyectos", descripcion: "Explorá todos los proyectos publicados y filtralos por tecnología, modalidad u horas.", icono: Search },
    { href: "/postulaciones", titulo: "Mis postulaciones", descripcion: "Seguí el estado de cada postulación y su historial.", icono: Send },
    { href: "/invitaciones", titulo: "Invitaciones", descripcion: "Respondé a quienes te invitaron a sus proyectos.", icono: Mail },
  ],
  empresa: [
    { href: "/mis-proyectos/nuevo", titulo: "Publicar un proyecto", descripcion: "Definí qué necesitás y recibí recomendaciones de estudiantes.", icono: PlusCircle },
    { href: "/mis-proyectos", titulo: "Mis proyectos", descripcion: "Gestioná tus proyectos, sus postulantes y su estado.", icono: FolderKanban },
    { href: "/notificaciones", titulo: "Notificaciones", descripcion: "Postulaciones nuevas y cambios que requieren tu atención.", icono: Bell },
  ],
  docente: [
    { href: "/mis-proyectos/nuevo", titulo: "Publicar un proyecto", descripcion: "Proponé un proyecto para tu cátedra o tu investigación.", icono: PlusCircle },
    { href: "/mis-proyectos", titulo: "Mis proyectos", descripcion: "Gestioná tus proyectos, sus postulantes y su estado.", icono: FolderKanban },
    { href: "/notificaciones", titulo: "Notificaciones", descripcion: "Postulaciones nuevas y cambios que requieren tu atención.", icono: Bell },
  ],
  administrador: [
    { href: "/admin/dashboard", titulo: "Dashboard de métricas", descripcion: "Tecnologías demandadas, matches por carrera, embudo y evaluación del motor.", icono: BarChart3 },
    { href: "/admin/usuarios", titulo: "Usuarios", descripcion: "Activá, desactivá y cambiá roles; dá de alta administradores.", icono: Users },
    { href: "/admin/proyectos", titulo: "Moderar proyectos", descripcion: "Suspendé o reactivá proyectos publicados.", icono: FolderCheck },
    { href: "/admin/catalogos", titulo: "Catálogos", descripcion: "Mantené el catálogo de tecnologías.", icono: Tags },
    { href: "/admin/motor", titulo: "Motor de matching", descripcion: "Configuraciones, conjunto de referencia y evaluaciones.", icono: SlidersHorizontal },
  ],
};

const SUBTITULO: Record<Rol, string> = {
  estudiante: "Esto es lo que podés hacer hoy para acercarte a tu primera experiencia real.",
  empresa: "Publicá proyectos y encontrá a los estudiantes que mejor encajan.",
  docente: "Proponé proyectos para tu cátedra y seguí a quienes se postulan.",
  administrador: "Herramientas para gestionar y moderar la plataforma.",
};

/** Inicio con sesión: saludo, completitud del perfil y los próximos pasos según el rol. */
export function PanelInicio() {
  const { usuario, perfil } = useAuth();
  if (!usuario) return null;

  const completitud = completitudDePerfil(usuario.rol, perfil);
  const perfilIncompleto = completitud !== null && completitud.porcentaje < 100;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">Hola, {usuario.nombre}</h1>
          <Badge variante="primary">{ROL_ETIQUETA[usuario.rol]}</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-muted">{SUBTITULO[usuario.rol]}</p>
      </header>

      {completitud && (
        <Card como="section" aria-labelledby="titulo-perfil-panel" variante={perfilIncompleto ? "sticker" : "elevada"} relleno="lg">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="label-mono text-subtle">Tu perfil</p>
              <h2 id="titulo-perfil-panel" className="mt-1 text-2xl font-bold">
                {perfilIncompleto ? `Tu perfil está completo al ${completitud.porcentaje} %` : "Tu perfil está completo"}
              </h2>
              <ProgressBar valor={completitud.porcentaje} etiqueta="Completitud del perfil" className="mt-4 max-w-xl" />
              {perfilIncompleto ? (
                <p className="mt-3 text-sm text-muted">
                  Siguiente paso: {completitud.faltantes[0].pendiente.charAt(0).toLowerCase()}
                  {completitud.faltantes[0].pendiente.slice(1)}.
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">Mantenelo al día para que las recomendaciones sigan siendo precisas.</p>
              )}
            </div>
            <Button
              href="/perfil"
              variante={perfilIncompleto ? "accent" : "secondary"}
              iconoIzquierda={<UserRound aria-hidden="true" className="size-4" />}
            >
              {perfilIncompleto ? "Completar mi perfil" : "Editar mi perfil"}
            </Button>
          </div>
        </Card>
      )}

      <section aria-labelledby="titulo-siguientes">
        <h2 id="titulo-siguientes" className="text-2xl font-bold">
          Próximos pasos
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACCIONES[usuario.rol].map((accion) => (
            <li key={accion.href}>
              <Link
                href={accion.href}
                className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-[border-color,box-shadow] hover:border-primary hover:shadow-soft"
              >
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-ink">
                  <accion.icono className="size-5" />
                </span>
                <span className="mt-4 flex items-center gap-2 font-display text-lg font-semibold">
                  {accion.titulo}
                  <ArrowRight aria-hidden="true" className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
                <span className="mt-1 text-sm text-muted">{accion.descripcion}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
