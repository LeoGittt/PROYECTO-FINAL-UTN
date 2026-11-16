"use client";

import { FolderSearch } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AsyncView } from "@/components/ui/AsyncView";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { EstadoProyectoBadge } from "@/features/proyectos/comunes";
import { api } from "@/lib/api/endpoints";
import type { EstadoProyecto, ProyectoDto } from "@/lib/api/types";
import { formatearFecha } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ESTADO_PROYECTO_ETIQUETA } from "@/lib/labels";

type Filtro = "todos" | EstadoProyecto;

const OPCIONES = [
  { valor: "todos" as Filtro, etiqueta: "Todos" },
  ...(Object.keys(ESTADO_PROYECTO_ETIQUETA) as EstadoProyecto[]).map((estado) => ({
    valor: estado as Filtro,
    etiqueta: ESTADO_PROYECTO_ETIQUETA[estado],
  })),
];

/** Según el contrato, solo se suspende un proyecto publicado o en curso. */
const sePuedeSuspender = (p: ProyectoDto) => p.estado === "publicado" || p.estado === "en_curso";

/** `/admin/proyectos`: todos los proyectos, con filtro por estado, para suspender o reactivar (moderación). */
export function ProyectosAdminPage() {
  const toast = useToast();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [aSuspender, setASuspender] = useState<ProyectoDto | null>(null);
  const [motivo, setMotivo] = useState("");
  const [aReactivar, setAReactivar] = useState<ProyectoDto | null>(null);
  const consulta = useApiQuery(
    `admin:proyectos:${filtro}`,
    (signal) => api.admin.proyectos(filtro === "todos" ? undefined : filtro, { signal }),
    { esVacio: (lista) => lista.length === 0 },
  );

  async function suspender(p: ProyectoDto) {
    await api.admin.suspenderProyecto(p.idProyecto, motivo.trim());
    toast.exito(`«${p.titulo}» dejó de verse en la plataforma.`, "Proyecto suspendido");
    consulta.recargar();
  }

  async function reactivar(p: ProyectoDto) {
    await api.admin.reactivarProyecto(p.idProyecto);
    toast.exito(`«${p.titulo}» vuelve a estar publicado.`, "Proyecto reactivado");
    consulta.recargar();
  }

  return (
    <>
      <PageHeader
        etiqueta="Administración"
        titulo="Moderar proyectos"
        descripcion="Todos los proyectos de la plataforma. Suspendé los que no cumplen las reglas y reactivalos cuando se resuelva."
      />

      <FilterChips etiqueta="Filtrar por estado" opciones={OPCIONES} valor={filtro} alCambiar={setFiltro} className="mb-6" />

      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando proyectos"
        tituloError="No pudimos cargar los proyectos"
        vacio={
          <EmptyState
            icono={<FolderSearch className="size-7" />}
            titulo="No hay proyectos para mostrar"
            descripcion={filtro === "todos" ? "Todavía nadie creó un proyecto." : "Ningún proyecto está en ese estado."}
          />
        }
      >
        {(proyectos) => (
          <DataTable
            caption="Proyectos de la plataforma"
            filas={proyectos}
            idDeFila={(p) => p.idProyecto}
            columnas={[
              {
                clave: "proyecto",
                titulo: "Proyecto",
                celda: (p) => (
                  <div className="min-w-0">
                    <Link href={`/proyectos/${p.idProyecto}`} className="font-semibold hover:text-primary hover:underline">
                      {p.titulo}
                    </Link>
                    <p className="text-sm text-muted">N.º {p.idProyecto}</p>
                  </div>
                ),
              },
              {
                clave: "publicador",
                titulo: "Publicador",
                celda: (p) => (
                  <div>
                    <p>{p.publicador.nombre}</p>
                    <p className="text-sm text-muted">{p.publicador.tipo === "empresa" ? "Empresa" : "Docente"}</p>
                  </div>
                ),
              },
              { clave: "estado", titulo: "Estado", celda: (p) => <EstadoProyectoBadge estado={p.estado} /> },
              {
                clave: "publicacion",
                titulo: "Publicación",
                celda: (p) => (p.fechaPublicacion ? formatearFecha(p.fechaPublicacion) : "Sin publicar"),
              },
              {
                clave: "postulaciones",
                titulo: "Postulaciones",
                alinear: "derecha",
                celda: (p) => <span className="tabular-nums">{p.cantidadPostulaciones ?? 0}</span>,
              },
              {
                clave: "acciones",
                titulo: "Acciones",
                alinear: "derecha",
                celda: (p) =>
                  sePuedeSuspender(p) ? (
                    <Button
                      variante="secondary"
                      tamano="sm"
                      aria-label={`Suspender «${p.titulo}»`}
                      onClick={() => {
                        setMotivo("");
                        setASuspender(p);
                      }}
                    >
                      Suspender
                    </Button>
                  ) : p.estado === "suspendido" ? (
                    <Button tamano="sm" aria-label={`Reactivar «${p.titulo}»`} onClick={() => setAReactivar(p)}>
                      Reactivar
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </AsyncView>

      <ConfirmDialog
        abierto={aSuspender !== null}
        alCerrar={() => setASuspender(null)}
        titulo={aSuspender ? `Suspender «${aSuspender.titulo}»` : ""}
        descripcion="Deja de aparecer en búsquedas y recomendaciones hasta que lo reactives."
        textoConfirmar="Suspender proyecto"
        variante="danger"
        confirmarDeshabilitado={!motivo.trim()}
        alConfirmar={() => (aSuspender ? suspender(aSuspender) : Promise.resolve())}
      >
        <Textarea
          label="Motivo"
          required
          hint="Contá por qué se suspende. El publicador lo recibe en su aviso."
          maxLength={200}
          mostrarContador
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        abierto={aReactivar !== null}
        alCerrar={() => setAReactivar(null)}
        titulo={aReactivar ? `¿Reactivar «${aReactivar.titulo}»?` : ""}
        descripcion="Vuelve al estado publicado y se puede buscar y recomendar otra vez."
        textoConfirmar="Sí, reactivar"
        alConfirmar={() => (aReactivar ? reactivar(aReactivar) : Promise.resolve())}
      />
    </>
  );
}
