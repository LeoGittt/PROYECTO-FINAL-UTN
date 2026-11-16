"use client";

import {
  BellOff,
  CheckCheck,
  ClipboardCheck,
  FolderKanban,
  Mail,
  MessageSquare,
  PartyPopper,
  Send,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { rutaInternaSegura } from "@/components/auth/RoleGuard";
import { avisarCambioDeNotificaciones } from "@/components/layout/NotificationsBell";
import { AsyncView } from "@/components/ui/AsyncView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { mensajeDeError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Notificacion, TipoNotificacion } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatearFechaHora } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { TIPO_NOTIFICACION_ETIQUETA } from "@/lib/labels";

type Filtro = "todas" | "sin-leer";

const LIMITE = 30;

const ICONO: Record<TipoNotificacion, LucideIcon> = {
  nuevo_match: Sparkles,
  invitacion: Mail,
  nueva_postulacion: Send,
  cambio_estado_postulacion: ClipboardCheck,
  cambio_estado_proyecto: FolderKanban,
  mensaje_nuevo: MessageSquare,
};

/** `/notificaciones`: los avisos del usuario (para todos los roles), con marcar una o todas como leídas. */
export function NotificacionesPage() {
  const toast = useToast();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [marcando, setMarcando] = useState<number | "todas" | null>(null);
  const consulta = useApiQuery(
    `notificaciones:${filtro}`,
    (signal) => api.notificaciones.listar({ soloNoLeidas: filtro === "sin-leer" || undefined, limite: LIMITE }, { signal }),
    { esVacio: (respuesta) => respuesta.items.length === 0 },
  );
  const noLeidas = consulta.data?.noLeidas;

  async function marcar(id: number | "todas") {
    setMarcando(id);
    try {
      if (id === "todas") await api.notificaciones.leerTodas();
      else await api.notificaciones.leer(id);
      if (id === "todas") toast.exito("Ya no tenés notificaciones sin leer.", "Todo al día");
      avisarCambioDeNotificaciones();
      consulta.recargar();
    } catch (falla) {
      toast.error(mensajeDeError(falla), id === "todas" ? "No pudimos marcarlas como leídas" : "No pudimos marcarla como leída");
    } finally {
      setMarcando(null);
    }
  }

  /** Abrir el detalle de un aviso sin leer también lo marca como leído (sin frenar la navegación). */
  function alAbrir(notificacion: Notificacion) {
    if (notificacion.leida) return;
    api.notificaciones.leer(notificacion.idNotificacion).then(avisarCambioDeNotificaciones, () => {});
  }

  return (
    <>
      <PageHeader
        etiqueta="Seguimiento"
        titulo="Notificaciones"
        descripcion="Te avisamos acá y por email cuando hay un match nuevo, una invitación, una postulación o un cambio de estado."
        acciones={
          noLeidas !== undefined &&
          noLeidas > 0 && (
            <Button
              variante="secondary"
              cargando={marcando === "todas"}
              iconoIzquierda={<CheckCheck aria-hidden="true" className="size-4" />}
              onClick={() => marcar("todas")}
            >
              Marcar todas como leídas
            </Button>
          )
        }
      />

      <FilterChips
        etiqueta="Qué notificaciones ver"
        opciones={[
          { valor: "todas", etiqueta: "Todas" },
          { valor: "sin-leer", etiqueta: "Sin leer", contador: noLeidas },
        ]}
        valor={filtro}
        alCambiar={setFiltro}
        className="mb-6"
      />

      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando tus notificaciones"
        tituloError="No pudimos cargar tus notificaciones"
        vacio={
          filtro === "todas" ? (
            <EmptyState
              icono={<BellOff className="size-7" />}
              titulo="Todavía no tenés notificaciones"
              descripcion="Cuando pase algo importante con tus proyectos o postulaciones, te avisamos acá."
            />
          ) : (
            <EmptyState
              icono={<PartyPopper className="size-7" />}
              titulo="Estás al día"
              descripcion="No tenés notificaciones sin leer."
              accion={<Button onClick={() => setFiltro("todas")}>Ver todas</Button>}
            />
          )
        }
      >
        {({ items }) => (
          <>
            <h2 className="sr-only">Notificaciones</h2>
            <ul className="flex flex-col gap-3">
              {items.map((n) => {
                const Icono = ICONO[n.tipo];
                const destino = rutaInternaSegura(n.urlReferencia, "");
                return (
                  <li key={n.idNotificacion}>
                    <Card
                      como="article"
                      variante="plana"
                      className={cn("flex flex-wrap items-start gap-4", !n.leida && "border-l-4 border-l-primary")}
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-soft-ink"
                      >
                        <Icono className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <Badge variante={n.leida ? "neutral" : "primary"}>{TIPO_NOTIFICACION_ETIQUETA[n.tipo]}</Badge>
                          {!n.leida && <span className="font-semibold text-primary">Sin leer</span>}
                          <time dateTime={n.fecha} className="text-muted">
                            {formatearFechaHora(n.fecha)}
                          </time>
                        </p>
                        <p className={cn("mt-1.5 text-ink", !n.leida && "font-semibold")}>{n.mensaje}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {destino && (
                          <Button href={destino} variante="secondary" tamano="sm" onClick={() => alAbrir(n)}>
                            Ver detalle
                          </Button>
                        )}
                        {!n.leida && (
                          <Button
                            variante="ghost"
                            tamano="sm"
                            cargando={marcando === n.idNotificacion}
                            onClick={() => marcar(n.idNotificacion)}
                          >
                            Marcar como leída
                          </Button>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
            {items.length === LIMITE && (
              <p className="mt-4 text-sm text-muted">Se muestran las {LIMITE} notificaciones más recientes.</p>
            )}
          </>
        )}
      </AsyncView>
    </>
  );
}
