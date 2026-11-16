"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api/endpoints";
import { ProyectoForm } from "./ProyectoForm";
import { valoresIniciales } from "./valores";

/** `/mis-proyectos/nuevo`: alta de un proyecto, como borrador o ya publicado. */
export function NuevoProyectoPage() {
  const router = useRouter();
  const toast = useToast();

  return (
    <>
      <PageHeader
        etiqueta="Proyectos"
        titulo="Publicar un proyecto"
        descripcion="Un borrador solo lo ves vos. Al publicarlo, los estudiantes lo encuentran y el sistema calcula su compatibilidad."
        volver={{ href: "/mis-proyectos", texto: "Mis proyectos" }}
      />
      <ProyectoForm
        modo="alta"
        inicial={valoresIniciales()}
        alGuardar={async (payload) => {
          const proyecto = await api.proyectos.crear(payload);
          toast.exito(
            proyecto.estado === "publicado" ? "Los estudiantes ya lo pueden ver." : "Lo podés publicar cuando quieras.",
            proyecto.estado === "publicado" ? "Proyecto publicado" : "Borrador guardado",
          );
          router.push(`/mis-proyectos/${proyecto.idProyecto}`);
        }}
      />
    </>
  );
}
