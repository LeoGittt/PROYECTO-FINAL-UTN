import {
  BarChart3,
  Bell,
  FolderCheck,
  FolderKanban,
  LayoutDashboard,
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
import type { Rol } from "@/lib/api/types";

export interface ItemNavegacion {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
}

export interface GrupoNavegacion {
  /** Título del grupo (si falta, el grupo no lleva encabezado). */
  titulo?: string;
  items: ItemNavegacion[];
}

const PANEL: ItemNavegacion = { href: "/panel", etiqueta: "Panel", icono: LayoutDashboard };
const NOTIFICACIONES: ItemNavegacion = { href: "/notificaciones", etiqueta: "Notificaciones", icono: Bell };
const PERFIL: ItemNavegacion = { href: "/perfil", etiqueta: "Mi perfil", icono: UserRound };

/**
 * Navegación principal según el rol. Los destinos son las rutas de S10; las que
 * todavía no existen devuelven 404 hasta que se construyan.
 */
export function navegacionParaRol(rol: Rol): GrupoNavegacion[] {
  switch (rol) {
    case "estudiante":
      return [
        { items: [PANEL] },
        {
          titulo: "Proyectos",
          items: [
            { href: "/recomendaciones", etiqueta: "Recomendaciones", icono: Sparkles },
            { href: "/proyectos", etiqueta: "Buscar proyectos", icono: Search },
          ],
        },
        {
          titulo: "Seguimiento",
          items: [
            { href: "/postulaciones", etiqueta: "Mis postulaciones", icono: Send },
            { href: "/invitaciones", etiqueta: "Invitaciones", icono: Mail },
            NOTIFICACIONES,
          ],
        },
        { titulo: "Cuenta", items: [PERFIL] },
      ];
    case "empresa":
    case "docente":
      return [
        { items: [PANEL] },
        {
          titulo: "Proyectos",
          items: [
            { href: "/mis-proyectos", etiqueta: "Mis proyectos", icono: FolderKanban },
            { href: "/mis-proyectos/nuevo", etiqueta: "Publicar proyecto", icono: PlusCircle },
          ],
        },
        { titulo: "Seguimiento", items: [NOTIFICACIONES] },
        { titulo: "Cuenta", items: [PERFIL] },
      ];
    case "administrador":
      return [
        { items: [PANEL] },
        {
          titulo: "Administración",
          items: [
            { href: "/admin/dashboard", etiqueta: "Dashboard", icono: BarChart3 },
            { href: "/admin/usuarios", etiqueta: "Usuarios", icono: Users },
            { href: "/admin/proyectos", etiqueta: "Proyectos", icono: FolderCheck },
            { href: "/admin/catalogos", etiqueta: "Catálogos", icono: Tags },
            { href: "/admin/motor", etiqueta: "Motor de matching", icono: SlidersHorizontal },
          ],
        },
      ];
  }
}

/** `true` si la ruta actual corresponde al ítem (coincidencia exacta o por segmento). */
export function estaActivo(href: string, rutaActual: string): boolean {
  if (rutaActual === href) return true;
  // "/mis-proyectos/nuevo" no debe activar "/mis-proyectos" si existe un ítem más específico:
  // eso lo resuelve quien llama con `elegirActivo`.
  return rutaActual.startsWith(`${href}/`);
}

/** Entre todos los ítems, el que mejor coincide con la ruta (el href más largo). */
export function elegirActivo(grupos: GrupoNavegacion[], rutaActual: string): string | null {
  let mejor: string | null = null;
  for (const grupo of grupos) {
    for (const item of grupo.items) {
      if (estaActivo(item.href, rutaActual) && (mejor === null || item.href.length > mejor.length)) {
        mejor = item.href;
      }
    }
  }
  return mejor;
}
