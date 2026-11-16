"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorRecurso } from "@/components/ui/ErrorRecurso";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionCargando, SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { EstadoProyectoBadge, ProyectoMeta, TecnologiasDeProyecto } from "@/features/proyectos/comunes";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import type { EstadoProyecto, ProyectoDto } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ProyectoForm } from "./ProyectoForm";
import { InvitacionesEnviadas, Postulantes, Recomendados } from "./SeguimientoProyecto";
import { valoresDesdeProyecto } from "./valores";

/** Lo que puede hacer el dueño en cada estado (contrato 4). Publicar va por su propia ruta. */
const ACCIONES: Partial<Record<EstadoProyecto, { estado: EstadoProyecto; texto: string; confirmacion: string }[]>> = {
  // Un borrador no se cancela (contrato 4): si no se publica, solo lo ve su dueño.
  borrador: [{ estado: "publicado", texto: "Publicar", confirmacion: "Los estudiantes lo van a poder ver y postularse." }],
  publicado: [
    { estado: "en_curso", texto: "Pasar a en curso", confirmacion: "Deja de recibir postulaciones e invitaciones." },
    { estado: "cancelado", texto: "Cancelar", confirmacion: "Deja de recibir postulaciones y no se puede reabrir." },
  ],
  en_curso: [
    { estado: "finalizado", texto: "Finalizar", confirmacion: "El proyecto queda cerrado y ya no se puede editar." },
    { estado: "cancelado", texto: "Cancelar", confirmacion: "El proyecto queda cerrado y ya no se puede editar." },
  ],
};

const NO_EDITABLES: EstadoProyecto[] = ["finalizado", "cancelado", "suspendido"];

/** `/mis-proyectos/[id]`: el dueño cambia el estado, edita el proyecto y sigue a postulantes, recomendados e invitados. */
export function GestionProyectoPage({ idProyecto }: { idProyecto: number }) {
  const { usuario } = useAuth();
  const idValido = Number.isInteger(idProyecto) && idProyecto > 0;
  const consulta = useApiQuery(`proyectos:${idProyecto}`, (signal) => api.proyectos.obtener(idProyecto, { signal }), {
    habilitada: idValido,
  });
  const volver = { href: "/mis-proyectos", texto: "Mis proyectos" };

  if (!idValido) {
    const noExiste = new ApiError({ statusCode: 404, error: "Not Found", message: "El identificador no es válido." });
    return <ErrorRecurso error={noExiste} recurso="este proyecto" volver={volver} />;
  }
  if (consulta.estado === "error") {
    return <ErrorRecurso error={consulta.error} recurso="este proyecto" alReintentar={consulta.recargar} volver={volver} />;
  }
  if (!consulta.data || !usuario) {
    return (
      <RegionCargando etiqueta="Cargando el proyecto">
        <SkeletonCard />
      </RegionCargando>
    );
  }
  if (consulta.data.publicador.idUsuario !== usuario.idUsuario) {
    return (
      <EmptyState
        titulo="Este proyecto no es tuyo"
        descripcion="Solo quien lo publicó puede gestionarlo."
        accion={<Button href={`/proyectos/${idProyecto}`}>Ver el proyecto</Button>}
      />
    );
  }
  return <Gestion proyecto={consulta.data} alCambiar={consulta.recargar} />;
}

function Gestion({ proyecto, alCambiar }: { proyecto: ProyectoDto; alCambiar: () => void }) {
  const toast = useToast();
  const [accion, setAccion] = useState<{ estado: EstadoProyecto; texto: string; confirmacion: string } | null>(null);
  const editable = !NO_EDITABLES.includes(proyecto.estado);

  async function aplicar() {
    if (!accion) return;
    if (accion.estado === "publicado") await api.proyectos.publicar(proyecto.idProyecto);
    else await api.proyectos.cambiarEstado(proyecto.idProyecto, accion.estado);
    toast.exito(`«${proyecto.titulo}» quedó actualizado.`, "Estado cambiado");
    alCambiar();
  }

  return (
    <>
      <PageHeader
        etiqueta="Mis proyectos"
        titulo={proyecto.titulo}
        volver={{ href: "/mis-proyectos", texto: "Mis proyectos" }}
        junto={<EstadoProyectoBadge estado={proyecto.estado} />}
        acciones={
          <div className="flex flex-wrap gap-2">
            {(ACCIONES[proyecto.estado] ?? []).map((a) => (
              <Button
                key={a.estado}
                variante={a.estado === "cancelado" ? "secondary" : "primary"}
                onClick={() => setAccion(a)}
              >
                {a.texto}
              </Button>
            ))}
            {proyecto.estado !== "borrador" && (
              <Button href={`/proyectos/${proyecto.idProyecto}`} variante="ghost" iconoIzquierda={<Eye aria-hidden="true" className="size-4" />}>
                Ver como estudiante
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-6 flex flex-col gap-3">
        <ProyectoMeta proyecto={proyecto} />
        <TecnologiasDeProyecto tecnologias={proyecto.tecnologias} />
      </div>
      {proyecto.estado === "suspendido" && (
        <Alert variante="warning" className="mb-6">
          La administración suspendió este proyecto: no se muestra a los estudiantes hasta que lo reactive.
        </Alert>
      )}

      <Tabs
        etiqueta="Seguimiento del proyecto"
        pestanas={[
          {
            id: "postulantes",
            etiqueta: "Postulantes",
            contador: proyecto.cantidadPostulaciones,
            contenido: <Postulantes proyecto={proyecto} />,
          },
          { id: "recomendados", etiqueta: "Recomendados", contenido: <Recomendados proyecto={proyecto} /> },
          { id: "invitaciones", etiqueta: "Invitaciones", contenido: <InvitacionesEnviadas idProyecto={proyecto.idProyecto} /> },
          {
            id: "editar",
            etiqueta: "Editar",
            contenido: editable ? (
              <ProyectoForm
                key={proyecto.idProyecto}
                modo="edicion"
                inicial={valoresDesdeProyecto(proyecto)}
                alGuardar={async (payload) => {
                  await api.proyectos.actualizar(proyecto.idProyecto, payload);
                  toast.exito("Los cambios ya se ven en el proyecto.", "Proyecto guardado");
                  alCambiar();
                }}
              />
            ) : (
              <Alert variante="info">Un proyecto finalizado, cancelado o suspendido ya no se puede editar.</Alert>
            ),
          },
        ]}
      />

      <ConfirmDialog
        abierto={accion !== null}
        alCerrar={() => setAccion(null)}
        titulo={accion ? `¿${accion.texto} «${proyecto.titulo}»?` : ""}
        descripcion={accion?.confirmacion}
        textoConfirmar={accion ? `Sí, ${accion.texto.toLowerCase()}` : "Confirmar"}
        variante={accion?.estado === "cancelado" ? "danger" : "primary"}
        alConfirmar={aplicar}
      />
    </>
  );
}
