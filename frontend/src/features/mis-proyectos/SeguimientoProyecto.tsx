"use client";

import { History, Mail, Sparkles, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { AsyncView } from "@/components/ui/AsyncView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreBreakdown } from "@/components/ui/ScoreBreakdown";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { transicionesPermitidas } from "@/features/postulaciones/estados";
import { Historial } from "@/features/postulaciones/Historial";
import { EstadoInvitacionBadge, EstadoPostulacionBadge } from "@/features/proyectos/comunes";
import { api } from "@/lib/api/endpoints";
import type { EstadoPostulacion, Postulacion, ProyectoDto, RecomendacionEstudiante } from "@/lib/api/types";
import { formatearFecha } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ESTADO_POSTULACION_ETIQUETA, NIVEL_ETIQUETA } from "@/lib/labels";

// Pestañas de `/mis-proyectos/[id]`: quién se postuló, a quién recomienda el motor y a quién se invitó.
// `Tabs` monta solo la pestaña activa, así que cada lista se vuelve a pedir al entrar en ella.

const tecnologiasEnTexto = (tecnologias: { nombre: string; nivel: keyof typeof NIVEL_ETIQUETA }[]) =>
  tecnologias.length === 0
    ? "Sin tecnologías cargadas"
    : tecnologias.map((t) => `${t.nombre} (${NIVEL_ETIQUETA[t.nivel].toLowerCase()})`).join(", ");

/** Las postulaciones del proyecto, con los botones de la máquina de estados que le tocan al publicador. */
export function Postulantes({ proyecto }: { proyecto: ProyectoDto }) {
  const toast = useToast();
  const [cambio, setCambio] = useState<{ postulacion: Postulacion; estado: EstadoPostulacion } | null>(null);
  // Una postulación con el historial abierto a la vez.
  const [conHistorial, setConHistorial] = useState<number | null>(null);
  const consulta = useApiQuery(
    `proyectos:${proyecto.idProyecto}:postulaciones`,
    (signal) => api.postulaciones.delProyecto(proyecto.idProyecto, undefined, { signal }),
    { esVacio: (lista) => lista.length === 0 },
  );

  async function confirmar() {
    if (!cambio) return;
    const { postulacion, estado } = cambio;
    await api.postulaciones.cambiarEstado(postulacion.idPostulacion, estado);
    toast.exito(
      `La postulación de ${postulacion.estudiante.nombre} pasó a «${ESTADO_POSTULACION_ETIQUETA[estado]}».`,
      "Postulación actualizada",
    );
    consulta.recargar();
  }

  return (
    <>
      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando las postulaciones"
        tituloError="No pudimos cargar las postulaciones"
        vacio={
          <EmptyState
            icono={<Users className="size-7" />}
            titulo="Todavía nadie se postuló"
            descripcion="Mirá la pestaña de recomendados: podés invitar a estudiantes compatibles."
          />
        }
      >
        {(postulaciones) => (
          <ul className="flex flex-col gap-4">
            {postulaciones.map((p) => (
              <li key={p.idPostulacion}>
                <Card como="article" variante="plana" className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">
                        {p.estudiante.nombre} {p.estudiante.apellido}
                      </h3>
                      <p className="text-sm text-muted">
                        {p.estudiante.carrera} · {p.estudiante.anioCursada}.º año · se postuló el{" "}
                        {formatearFecha(p.fechaPostulacion)}
                      </p>
                      {p.estudiante.email && (
                        <a href={`mailto:${p.estudiante.email}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary underline">
                          <Mail aria-hidden="true" className="size-4" />
                          {p.estudiante.email}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {!p.estudiante.activo && <Badge variante="warning">Cuenta desactivada</Badge>}
                      <EstadoPostulacionBadge estado={p.estado} />
                      {p.puntajeTotal !== null && <ScoreRing valor={p.puntajeTotal} tamano="sm" />}
                    </div>
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">Tecnologías: </span>
                    {tecnologiasEnTexto(p.estudiante.tecnologias)}
                  </p>
                  {p.mensajePresentacion && (
                    <blockquote className="border-l-4 border-line-strong pl-3 text-sm text-muted">{p.mensajePresentacion}</blockquote>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {transicionesPermitidas(p.estado, "publicador").map((estado) => (
                      <Button
                        key={estado}
                        tamano="sm"
                        variante={estado === "rechazada" ? "secondary" : "primary"}
                        onClick={() => setCambio({ postulacion: p, estado })}
                      >
                        Pasar a {ESTADO_POSTULACION_ETIQUETA[estado].toLowerCase()}
                      </Button>
                    ))}
                    <Button
                      tamano="sm"
                      variante="ghost"
                      aria-expanded={conHistorial === p.idPostulacion}
                      iconoIzquierda={<History aria-hidden="true" className="size-4" />}
                      onClick={() => setConHistorial(conHistorial === p.idPostulacion ? null : p.idPostulacion)}
                    >
                      {conHistorial === p.idPostulacion ? "Ocultar el historial" : "Ver el historial"}
                    </Button>
                  </div>
                  {/* key: al cambiar el estado se vuelve a pedir el historial. */}
                  {conHistorial === p.idPostulacion && <Historial key={p.estado} idPostulacion={p.idPostulacion} />}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
      <ConfirmDialog
        abierto={cambio !== null}
        alCerrar={() => setCambio(null)}
        titulo="¿Cambiar el estado de la postulación?"
        descripcion={
          cambio
            ? `La postulación de ${cambio.postulacion.estudiante.nombre} ${cambio.postulacion.estudiante.apellido} pasa a «${ESTADO_POSTULACION_ETIQUETA[cambio.estado]}». Le vamos a avisar.`
            : undefined
        }
        textoConfirmar="Sí, cambiar"
        variante={cambio?.estado === "rechazada" ? "danger" : "primary"}
        alConfirmar={confirmar}
      />
    </>
  );
}

/** Los estudiantes que recomienda el motor, con la opción de invitarlos. */
export function Recomendados({ proyecto }: { proyecto: ProyectoDto }) {
  const toast = useToast();
  const [aInvitar, setAInvitar] = useState<RecomendacionEstudiante | null>(null);
  const [mensaje, setMensaje] = useState("");
  const publicado = proyecto.estado === "publicado";
  const consulta = useApiQuery(
    `proyectos:${proyecto.idProyecto}:recomendados`,
    (signal) => api.matching.recomendados(proyecto.idProyecto, 20, { signal }),
    { esVacio: (lista) => lista.length === 0, habilitada: publicado },
  );

  if (!publicado) {
    return (
      <EmptyState
        icono={<Sparkles className="size-7" />}
        titulo="Las recomendaciones son para proyectos publicados"
        descripcion={
          proyecto.estado === "borrador"
            ? "Publicá el proyecto y el sistema calcula qué estudiantes son compatibles."
            : "Este proyecto ya no recibe postulaciones ni invitaciones."
        }
      />
    );
  }

  async function invitar() {
    if (!aInvitar) return;
    await api.invitaciones.crear({
      idProyecto: proyecto.idProyecto,
      idEstudiante: aInvitar.estudiante.idEstudiante,
      mensaje: mensaje.trim() || null,
    });
    toast.exito(`Le avisamos a ${aInvitar.estudiante.nombre}.`, "Invitación enviada");
    setMensaje("");
    consulta.recargar();
  }

  return (
    <>
      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando los estudiantes recomendados"
        tituloError="No pudimos cargar los recomendados"
        vacio={
          <EmptyState
            icono={<Sparkles className="size-7" />}
            titulo="Todavía no hay estudiantes compatibles"
            descripcion="Ningún estudiante alcanza el puntaje mínimo. Probá pedir menos tecnologías obligatorias."
          />
        }
      >
        {(recomendados) => (
          <ul className="grid gap-4 lg:grid-cols-2">
            {recomendados.map((r) => (
              <li key={r.estudiante.idEstudiante}>
                <Card como="article" variante="plana" className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">
                        {r.estudiante.nombre} {r.estudiante.apellido}
                      </h3>
                      <p className="text-sm text-muted">
                        {r.estudiante.carrera} · {r.estudiante.anioCursada}.º año · {r.estudiante.horasSemanales} h por semana
                      </p>
                    </div>
                    <ScoreRing valor={r.puntajeTotal} tamano="sm" />
                  </div>
                  <ScoreBreakdown puntajes={r.puntajes} />
                  <p className="text-sm">
                    <span className="font-semibold">Tiene: </span>
                    {r.tecnologiasCoincidentes.join(", ") || "ninguna de las pedidas"}
                    {r.tecnologiasFaltantes.length > 0 && (
                      <>
                        <br />
                        <span className="font-semibold">Le falta: </span>
                        {r.tecnologiasFaltantes.join(", ")}
                      </>
                    )}
                  </p>
                  <div className="mt-auto">
                    {r.idPostulacion !== null ? (
                      <Badge variante="success">Ya se postuló</Badge>
                    ) : r.idInvitacion !== null ? (
                      <Badge variante="accent">Invitado</Badge>
                    ) : (
                      <Button
                        tamano="sm"
                        iconoIzquierda={<UserPlus aria-hidden="true" className="size-4" />}
                        onClick={() => setAInvitar(r)}
                      >
                        Invitar a {r.estudiante.nombre}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
      <ConfirmDialog
        abierto={aInvitar !== null}
        alCerrar={() => setAInvitar(null)}
        titulo={aInvitar ? `Invitar a ${aInvitar.estudiante.nombre} ${aInvitar.estudiante.apellido}` : "Invitar"}
        descripcion={`Le llega una notificación con la invitación a «${proyecto.titulo}». Si acepta, queda postulado.`}
        textoConfirmar="Enviar invitación"
        alConfirmar={invitar}
      >
        <Textarea
          label="Mensaje (opcional)"
          maxLength={2000}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          hint="Contale por qué te interesa su perfil."
        />
      </ConfirmDialog>
    </>
  );
}

/** Las invitaciones que mandó el publicador para este proyecto. */
export function InvitacionesEnviadas({ idProyecto }: { idProyecto: number }) {
  const consulta = useApiQuery(
    `proyectos:${idProyecto}:invitaciones`,
    (signal) => api.invitaciones.delProyecto(idProyecto, { signal }),
    { esVacio: (lista) => lista.length === 0 },
  );
  return (
    <AsyncView
      consulta={consulta}
      etiquetaCarga="Cargando las invitaciones"
      tituloError="No pudimos cargar las invitaciones"
      vacio={<EmptyState icono={<Mail className="size-7" />} titulo="Todavía no invitaste a nadie" />}
    >
      {(invitaciones) => (
        <ul className="flex flex-col gap-3">
          {invitaciones.map((i) => (
            <li key={i.idInvitacion}>
              <Card variante="plana" className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {i.estudiante.nombre} {i.estudiante.apellido}
                  </p>
                  <p className="text-sm text-muted">
                    Invitado el {formatearFecha(i.fechaInvitacion)}
                    {i.fechaRespuesta && ` · respondió el ${formatearFecha(i.fechaRespuesta)}`}
                  </p>
                </div>
                <EstadoInvitacionBadge estado={i.estado} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AsyncView>
  );
}
