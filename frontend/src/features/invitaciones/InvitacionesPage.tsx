"use client";

import { MailOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AsyncView } from "@/components/ui/AsyncView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { esApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { Invitacion } from "@/lib/api/types";
import { formatearFecha } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { EstadoInvitacionBadge } from "@/features/proyectos/comunes";

interface Respuesta {
  invitacion: Invitacion;
  aceptar: boolean;
}

function InvitacionCard({
  invitacion,
  alResponder,
}: {
  invitacion: Invitacion;
  alResponder: (aceptar: boolean) => void;
}) {
  const { proyecto } = invitacion;
  return (
    <Card como="article" variante="plana" className="flex flex-col gap-3">
      <div>
        <p className="label-mono text-subtle">{proyecto.publicador}</p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
          <Link href={`/proyectos/${proyecto.idProyecto}`} className="hover:text-primary hover:underline">
            {proyecto.titulo}
          </Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <EstadoInvitacionBadge estado={invitacion.estado} />
          Te invitaron el {formatearFecha(invitacion.fechaInvitacion)}
          {invitacion.fechaRespuesta && ` · Respondiste el ${formatearFecha(invitacion.fechaRespuesta)}`}
        </p>
      </div>

      {invitacion.mensaje && <blockquote className="border-l-4 border-line-strong pl-3 text-sm text-muted">{invitacion.mensaje}</blockquote>}

      {invitacion.estado === "pendiente" && (
        <div className="flex flex-wrap gap-3">
          <Button tamano="sm" onClick={() => alResponder(true)}>
            Aceptar invitación
          </Button>
          <Button variante="secondary" tamano="sm" onClick={() => alResponder(false)}>
            Rechazar
          </Button>
        </div>
      )}
    </Card>
  );
}

/** `/invitaciones`: invitaciones que recibió el estudiante. Aceptar crea la postulación; rechazar la descarta. */
export function InvitacionesPage() {
  const toast = useToast();
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const consulta = useApiQuery("invitaciones:mias", (signal) => api.invitaciones.mias({ signal }), {
    esVacio: (lista) => lista.length === 0,
  });

  async function responder({ invitacion, aceptar }: Respuesta) {
    try {
      await api.invitaciones.responder(invitacion.idInvitacion, aceptar);
    } catch (falla) {
      // 409: ya estaba respondida o el proyecto se cerró. Se refresca el listado y el diálogo muestra el motivo.
      if (esApiError(falla) && falla.statusCode === 409) consulta.recargar();
      throw falla;
    }
    if (aceptar) {
      toast.exito("Tu postulación quedó en estado Pendiente. Podés seguirla desde «Mis postulaciones».", "Invitación aceptada");
    } else {
      toast.info(`Rechazaste la invitación a «${invitacion.proyecto.titulo}».`, "Invitación rechazada");
    }
    consulta.recargar();
  }

  return (
    <>
      <PageHeader
        etiqueta="Para vos"
        titulo="Invitaciones"
        descripcion="Empresas y docentes que vieron tu perfil y te invitan a sumarte a un proyecto."
      />
      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando tus invitaciones"
        tituloError="No pudimos cargar tus invitaciones"
        vacio={
          <EmptyState
            icono={<MailOpen className="size-7" />}
            titulo="Todavía no recibiste invitaciones"
            descripcion="Cuando un publicador te invite a un proyecto, lo vas a ver acá. Mientras tanto, completar tu perfil ayuda a que te encuentren."
            accion={
              <div className="flex flex-wrap justify-center gap-3">
                <Button href="/perfil" variante="secondary">
                  Revisar mi perfil
                </Button>
                <Button href="/proyectos">Explorar proyectos</Button>
              </div>
            }
          />
        }
      >
        {(todas) => {
          const grupos = [
            { titulo: "Pendientes", items: todas.filter((i) => i.estado === "pendiente") },
            { titulo: "Respondidas", items: todas.filter((i) => i.estado !== "pendiente") },
          ].filter((grupo) => grupo.items.length > 0);
          return (
            <div className="flex flex-col gap-8">
              {grupos.map((grupo) => (
                <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`}>
                  <h2 id={`grupo-${grupo.titulo}`} className="mb-4 font-display text-lg font-semibold">
                    {grupo.titulo} <span className="text-muted">({grupo.items.length})</span>
                  </h2>
                  <ul className="flex flex-col gap-4">
                    {grupo.items.map((invitacion) => (
                      <li key={invitacion.idInvitacion}>
                        <InvitacionCard invitacion={invitacion} alResponder={(aceptar) => setRespuesta({ invitacion, aceptar })} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          );
        }}
      </AsyncView>

      <ConfirmDialog
        abierto={respuesta !== null}
        alCerrar={() => setRespuesta(null)}
        titulo={respuesta?.aceptar ? "¿Aceptar la invitación?" : "¿Rechazar la invitación?"}
        descripcion={
          respuesta?.aceptar
            ? `Al aceptar, se crea tu postulación a «${respuesta.invitacion.proyecto.titulo}» en estado Pendiente y el publicador la va a ver.`
            : respuesta
              ? `Vas a rechazar la invitación a «${respuesta.invitacion.proyecto.titulo}». Esta acción no se puede deshacer.`
              : undefined
        }
        textoConfirmar={respuesta?.aceptar ? "Sí, aceptar" : "Sí, rechazar"}
        variante={respuesta?.aceptar ? "primary" : "danger"}
        alConfirmar={() => (respuesta ? responder(respuesta) : Promise.resolve())}
      />
    </>
  );
}
