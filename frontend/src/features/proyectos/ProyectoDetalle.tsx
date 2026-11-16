"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorRecurso } from "@/components/ui/ErrorRecurso";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreBreakdown } from "@/components/ui/ScoreBreakdown";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { RegionCargando, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { ApiError, esApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { esPerfilEstudiante } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatearFecha } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ESTADO_PROYECTO_ETIQUETA, RETRIBUCION_ETIQUETA } from "@/lib/labels";
import { EstadoPostulacionBadge, EstadoProyectoBadge, ProyectoMeta, TecnologiasDeProyecto } from "./comunes";

/**
 * Cuántas recomendaciones se piden para encontrar el desglose de este proyecto: el contrato no
 * ofrece un endpoint por proyecto, así que se busca en la lista de recomendaciones del estudiante.
 */
const LIMITE_RECOMENDACIONES = 50;

const VOLVER = { href: "/proyectos", texto: "Volver a la búsqueda" };

/** `/proyectos/[id]`: detalle de un proyecto. Un estudiante ve además su compatibilidad y puede postularse. */
export function ProyectoDetalle({ idProyecto }: { idProyecto: number }) {
  const { usuario, perfil } = useAuth();
  const toast = useToast();
  const [postulando, setPostulando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const idValido = Number.isInteger(idProyecto) && idProyecto > 0;
  const esEstudiante = usuario?.rol === "estudiante";
  const conPerfil = esEstudiante && usuario.perfilCompleto;

  const proyecto = useApiQuery(`proyecto:${idProyecto}`, (signal) => api.proyectos.obtener(idProyecto, { signal }), {
    habilitada: idValido,
  });
  const mias = useApiQuery("postulaciones:mias", (signal) => api.postulaciones.mias(undefined, { signal }), {
    habilitada: esEstudiante,
  });
  const recomendaciones = useApiQuery(
    "matching:recomendaciones:detalle",
    (signal) => api.matching.recomendaciones(LIMITE_RECOMENDACIONES, { signal }),
    { habilitada: conPerfil },
  );

  if (!idValido) {
    const noExiste = new ApiError({ statusCode: 404, error: "Not Found", message: "El identificador no es válido." });
    return <ErrorRecurso error={noExiste} recurso="este proyecto" volver={VOLVER} />;
  }
  if (proyecto.estado === "error") {
    return <ErrorRecurso error={proyecto.error} recurso="este proyecto" alReintentar={proyecto.recargar} volver={VOLVER} />;
  }
  const p = proyecto.data;
  if (!p || !usuario) {
    return (
      <RegionCargando etiqueta="Cargando el proyecto">
        <Skeleton className="mb-3 h-10 w-2/3" />
        <Skeleton className="mb-8 h-5 w-1/2" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </RegionCargando>
    );
  }

  const id = p.idProyecto;
  const esDuenio = usuario.idUsuario === p.publicador.idUsuario;
  const miPostulacion = mias.data?.find((x) => x.proyecto.idProyecto === id);
  const recomendacion = recomendaciones.data?.find((r) => r.proyecto.idProyecto === id);
  // Sin recomendación (por debajo del umbral) se marcan las tecnologías con las del propio perfil.
  const misTecnologias = esPerfilEstudiante(perfil) ? perfil.tecnologias.map((t) => t.nombre) : undefined;
  const coincidentes = recomendacion?.tecnologiasCoincidentes ?? misTecnologias;
  const cumple = coincidentes ? p.tecnologias.filter((t) => coincidentes.includes(t.nombre)).length : 0;
  const compatibilidad = recomendacion?.puntajeTotal ?? p.compatibilidad;

  async function postularme() {
    const texto = mensaje.trim();
    try {
      await api.postulaciones.crear({ idProyecto: id, ...(texto ? { mensajePresentacion: texto } : {}) });
    } catch (error) {
      // 409: ya estaba postulado; se actualiza la pantalla y el diálogo muestra el mensaje del servidor.
      if (esApiError(error) && error.statusCode === 409) mias.recargar();
      throw error;
    }
    setMensaje("");
    toast.exito("Podés seguirla desde «Mis postulaciones».", "Postulación enviada");
    mias.recargar();
  }

  return (
    <>
      <PageHeader
        volver={VOLVER}
        etiqueta={`${p.publicador.tipo === "empresa" ? "Empresa" : "Docente"} · ${p.publicador.nombre}`}
        titulo={p.titulo}
        junto={<EstadoProyectoBadge estado={p.estado} />}
        descripcion={<ProyectoMeta proyecto={p} />}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card como="section" variante="plana" aria-labelledby="titulo-descripcion">
            <h2 id="titulo-descripcion" className="text-xl font-semibold">
              Sobre el proyecto
            </h2>
            <p className="mt-3 whitespace-pre-line">{p.descripcion}</p>
            {p.objetivos && (
              <>
                <h3 className="mt-6 text-lg font-semibold">Objetivos</h3>
                <p className="mt-2 whitespace-pre-line">{p.objetivos}</p>
              </>
            )}
            {p.perfilBuscado && (
              <>
                <h3 className="mt-6 text-lg font-semibold">Perfil buscado</h3>
                <p className="mt-2 whitespace-pre-line">{p.perfilBuscado}</p>
              </>
            )}
          </Card>

          <Card como="section" variante="plana" aria-labelledby="titulo-tecnologias">
            <h2 id="titulo-tecnologias" className="text-xl font-semibold">
              Tecnologías y habilidades
            </h2>
            <div className="mt-3">
              <TecnologiasDeProyecto tecnologias={p.tecnologias} coincidentes={esEstudiante ? coincidentes : undefined} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Relleno: obligatoria. Borde punteado: deseable.
              {esEstudiante && coincidentes && " Tilde: ya la tenés. Guion: te falta."}
            </p>
            {p.habilidades.length > 0 && (
              <ul aria-label="Habilidades deseadas" className="mt-4 flex flex-wrap gap-2">
                {p.habilidades.map((h) => (
                  <li key={h.idHabilidad}>
                    <Badge>{h.nombre}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card como="section" variante="plana" aria-labelledby="titulo-condiciones">
            <h2 id="titulo-condiciones" className="text-xl font-semibold">
              Condiciones
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">Retribución</dt>
                <dd className="font-medium">
                  {RETRIBUCION_ETIQUETA[p.tipoRetribucion]}
                  {p.detalleRetribucion && ` · ${p.detalleRetribucion}`}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Cupos</dt>
                <dd className="font-medium">{p.cupos}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Publicado</dt>
                <dd className="font-medium">{formatearFecha(p.fechaPublicacion)}</dd>
              </div>
              {p.fechaCierre && (
                <div>
                  <dt className="text-sm text-muted">Cierre</dt>
                  <dd className="font-medium">{formatearFecha(p.fechaCierre)}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        <aside aria-label="Acciones y compatibilidad" className="flex flex-col gap-4 lg:sticky lg:top-24">
          {esDuenio && (
            <Card como="section" variante="sticker" aria-labelledby="titulo-duenio">
              <h2 id="titulo-duenio" className="text-xl font-semibold">
                Es tu proyecto
              </h2>
              <p className="mt-2 text-sm text-muted">
                {p.cantidadPostulaciones === undefined
                  ? "Administralo desde tus proyectos."
                  : `${p.cantidadPostulaciones} ${p.cantidadPostulaciones === 1 ? "postulación recibida" : "postulaciones recibidas"}.`}
              </p>
              <Button href={`/mis-proyectos/${p.idProyecto}`} className="mt-4" bloque>
                Administrar proyecto
              </Button>
            </Card>
          )}

          {esEstudiante && !usuario.perfilCompleto && (
            <Card como="section" variante="sticker" aria-labelledby="titulo-perfil">
              <h2 id="titulo-perfil" className="text-xl font-semibold">
                Tu compatibilidad
              </h2>
              <p className="mt-2 text-sm text-muted">
                Completá tu perfil para ver qué tan bien encajás en este proyecto y poder postularte.
              </p>
              <Button href="/perfil" className="mt-4" bloque>
                Completar mi perfil
              </Button>
            </Card>
          )}

          {conPerfil && (
            <Card como="section" variante="sticker" aria-labelledby="titulo-compatibilidad">
              <h2 id="titulo-compatibilidad" className="text-xl font-semibold">
                Tu compatibilidad
              </h2>
              <div className="mt-4 flex justify-center">
                <ScoreRing valor={compatibilidad} tamano="lg" mostrarBanda />
              </div>
              {coincidentes && p.tecnologias.length > 0 && (
                <p className="mt-4 text-sm">
                  Ya cumplís {cumple} de {p.tecnologias.length} {p.tecnologias.length === 1 ? "tecnología" : "tecnologías"} que pide el proyecto.
                </p>
              )}
              {recomendacion ? (
                <ScoreBreakdown puntajes={recomendacion.puntajes} mostrarAyuda className="mt-5" />
              ) : (
                recomendaciones.estado !== "cargando" && (
                  <p className="mt-4 text-sm text-muted">
                    Este proyecto no figura entre tus recomendaciones, por eso no hay desglose del puntaje.
                  </p>
                )
              )}

              <div className="mt-6">
                {mias.estado === "cargando" ? (
                  <Skeleton className="h-12 w-full" />
                ) : miPostulacion ? (
                  <Alert variante="success" titulo="Ya te postulaste">
                    <p className="flex flex-wrap items-center gap-2">
                      Estado: <EstadoPostulacionBadge estado={miPostulacion.estado} />
                    </p>
                    <Link href="/postulaciones" className="mt-1 inline-block font-semibold underline">
                      Ver el seguimiento
                    </Link>
                  </Alert>
                ) : recomendacion?.invitacionPendiente ? (
                  <Alert variante="info" titulo="Te invitaron a este proyecto">
                    <Link href="/invitaciones" className="font-semibold underline">
                      Responder la invitación
                    </Link>
                  </Alert>
                ) : p.estado !== "publicado" ? (
                  <Alert variante="info">
                    Este proyecto está {ESTADO_PROYECTO_ETIQUETA[p.estado].toLowerCase()} y no recibe postulaciones.
                  </Alert>
                ) : (
                  <Button variante="accent" tamano="lg" bloque onClick={() => setPostulando(true)}>
                    Postularme
                  </Button>
                )}
              </div>
            </Card>
          )}
        </aside>
      </div>

      <ConfirmDialog
        abierto={postulando}
        alCerrar={() => setPostulando(false)}
        titulo="Confirmar postulación"
        descripcion={`Vas a postularte a «${p.titulo}». El publicador va a ver tu perfil y tu compatibilidad.`}
        textoConfirmar="Enviar postulación"
        alConfirmar={postularme}
      >
        <Textarea
          data-autofocus
          label="Mensaje de presentación (opcional)"
          hint="Contá en pocas líneas por qué te interesa."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          maxLength={1000}
          mostrarContador
        />
      </ConfirmDialog>
    </>
  );
}
