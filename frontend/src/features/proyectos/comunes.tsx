import { CalendarRange, Check, Clock, GraduationCap, MapPin, Minus, Users, Wallet } from "lucide-react";
import { Badge, type VarianteBadge } from "@/components/ui/Badge";
import type { EstadoInvitacion, EstadoPostulacion, EstadoProyecto, ProyectoDto, TecnologiaDeProyecto } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import {
  ESTADO_INVITACION_ETIQUETA,
  ESTADO_POSTULACION_ETIQUETA,
  ESTADO_PROYECTO_ETIQUETA,
  MODALIDAD_ETIQUETA,
  RETRIBUCION_ETIQUETA,
} from "@/lib/labels";

// Piezas que comparten varias pantallas (búsqueda, detalle, recomendaciones, gestión).

/** Opciones de un `Select` a partir de un diccionario de etiquetas (modalidad, retribución...). */
export function opcionesDe(etiquetas: Record<string, string>) {
  return Object.entries(etiquetas).map(([valor, etiqueta]) => ({ valor, etiqueta }));
}

// --- Estados: el significado va en el texto; el color solo lo refuerza ---------

const COLOR_PROYECTO: Record<EstadoProyecto, VarianteBadge> = {
  borrador: "neutral",
  publicado: "success",
  en_curso: "primary",
  finalizado: "neutral",
  cancelado: "danger",
  suspendido: "warning",
};
const COLOR_POSTULACION: Record<EstadoPostulacion, VarianteBadge> = {
  pendiente: "neutral",
  en_revision: "primary",
  entrevista: "accent",
  aceptada: "success",
  rechazada: "danger",
  retirada: "neutral",
};
const COLOR_INVITACION: Record<EstadoInvitacion, VarianteBadge> = {
  pendiente: "accent",
  aceptada: "success",
  rechazada: "neutral",
};

export function EstadoProyectoBadge({ estado }: { estado: EstadoProyecto }) {
  return <Badge variante={COLOR_PROYECTO[estado]}>{ESTADO_PROYECTO_ETIQUETA[estado]}</Badge>;
}
export function EstadoPostulacionBadge({ estado }: { estado: EstadoPostulacion }) {
  return <Badge variante={COLOR_POSTULACION[estado]}>{ESTADO_POSTULACION_ETIQUETA[estado]}</Badge>;
}
export function EstadoInvitacionBadge({ estado }: { estado: EstadoInvitacion }) {
  return <Badge variante={COLOR_INVITACION[estado]}>{ESTADO_INVITACION_ETIQUETA[estado]}</Badge>;
}

// --- Datos clave del proyecto en una línea ------------------------------------

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

export function ProyectoMeta({ proyecto, sinCupos }: { proyecto: ProyectoDto; sinCupos?: boolean }) {
  const datos = [
    { Icono: Clock, texto: `${proyecto.horasSemanales} h por semana` },
    { Icono: CalendarRange, texto: plural(proyecto.duracionSemanas, "semana", "semanas") },
    { Icono: MapPin, texto: MODALIDAD_ETIQUETA[proyecto.modalidad] },
    { Icono: Wallet, texto: RETRIBUCION_ETIQUETA[proyecto.tipoRetribucion] },
    { Icono: GraduationCap, texto: `Desde ${proyecto.anioMinimo}.º año` },
    ...(sinCupos ? [] : [{ Icono: Users, texto: plural(proyecto.cupos, "cupo", "cupos") }]),
  ];
  return (
    <ul aria-label="Datos del proyecto" className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
      {datos.map(({ Icono, texto }) => (
        <li key={texto} className="inline-flex items-center gap-1.5">
          <Icono aria-hidden="true" className="size-4 shrink-0 text-subtle" />
          {texto}
        </li>
      ))}
    </ul>
  );
}

// --- Tecnologías que pide el proyecto ------------------------------------------

interface TecnologiasProps {
  tecnologias: TecnologiaDeProyecto[];
  /** Nombres que la persona ya domina: cada etiqueta lleva tilde (la tiene) o guion (le falta). */
  coincidentes?: string[];
  /** Máximo de etiquetas visibles; el resto se resume en "+N". */
  limite?: number;
}

/**
 * Obligatorias con relleno y deseables con borde punteado: la diferencia no depende del color y
 * además se dice en texto para lectores de pantalla.
 */
export function TecnologiasDeProyecto({ tecnologias, coincidentes, limite }: TecnologiasProps) {
  if (tecnologias.length === 0) return <p className="text-sm text-muted">No pide tecnologías específicas.</p>;

  const ordenadas = [...tecnologias].sort((a, b) => Number(b.obligatoria) - Number(a.obligatoria));
  const visibles = limite === undefined ? ordenadas : ordenadas.slice(0, limite);
  const ocultas = ordenadas.length - visibles.length;

  return (
    <ul aria-label="Tecnologías que pide el proyecto" className="flex flex-wrap gap-1.5">
      {visibles.map((t) => {
        const tiene = coincidentes?.includes(t.nombre);
        return (
          <li
            key={t.idTecnologia}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.8rem] font-semibold",
              t.obligatoria ? "border-primary/40 bg-primary-soft text-primary-soft-ink" : "border-dashed border-line-strong text-ink",
            )}
          >
            {coincidentes &&
              (tiene ? (
                <Check aria-hidden="true" className="size-3.5 text-success-ink" />
              ) : (
                <Minus aria-hidden="true" className="size-3.5 text-muted" />
              ))}
            {t.nombre}
            <span className="sr-only">
              {" "}
              ({t.obligatoria ? "obligatoria" : "deseable"}
              {coincidentes && (tiene ? ", la tenés" : ", te falta")})
            </span>
          </li>
        );
      })}
      {ocultas > 0 && <li className="px-1.5 py-0.5 text-[0.8rem] font-semibold text-muted">+{ocultas} más</li>}
    </ul>
  );
}
