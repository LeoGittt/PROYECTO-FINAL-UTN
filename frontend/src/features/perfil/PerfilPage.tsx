"use client";

import { UserX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { RegionCargando, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api/endpoints";
import {
  esPerfilDocente,
  esPerfilEmpresa,
  esPerfilEstudiante,
  type PerfilDocenteInput,
  type PerfilEmpresaInput,
  type PerfilEstudianteInput,
  type PerfilInput,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { PerfilDocenteForm } from "./PerfilDocenteForm";
import { PerfilEmpresaForm } from "./PerfilEmpresaForm";
import { PerfilEstudianteForm } from "./PerfilEstudianteForm";

function CargandoPerfil() {
  return (
    <RegionCargando etiqueta="Cargando tu perfil">
      <Skeleton className="mb-3 h-10 w-72" />
      <Skeleton className="mb-8 h-5 w-full max-w-xl" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    </RegionCargando>
  );
}

/** Perfil del estudiante: carga los cuatro catálogos antes de mostrar el formulario. */
function PerfilEstudianteSeccion({ guardar }: { guardar: (payload: PerfilInput) => Promise<void> }) {
  const { perfil } = useAuth();
  const carreras = useApiQuery("catalogos:carreras", (signal) => api.catalogos.carreras({ signal }));
  const materias = useApiQuery("catalogos:materias", (signal) => api.catalogos.materias(undefined, { signal }));
  const tecnologias = useApiQuery("catalogos:tecnologias", (signal) => api.catalogos.tecnologias({ signal }));
  const habilidades = useApiQuery("catalogos:habilidades", (signal) => api.catalogos.habilidades({ signal }));
  const consultas = [carreras, materias, tecnologias, habilidades];

  const conError = consultas.find((c) => c.estado === "error");
  if (conError) {
    return (
      <ErrorState
        titulo="No pudimos cargar los datos del formulario"
        mensaje={conError.error?.message}
        alReintentar={() => consultas.forEach((c) => c.recargar())}
      />
    );
  }
  if (!carreras.data || !materias.data || !tecnologias.data || !habilidades.data) return <CargandoPerfil />;

  return (
    <PerfilEstudianteForm
      perfil={esPerfilEstudiante(perfil) ? perfil : null}
      carreras={carreras.data}
      materias={materias.data}
      tecnologias={tecnologias.data}
      habilidades={habilidades.data}
      alGuardar={(payload: PerfilEstudianteInput) => guardar(payload)}
    />
  );
}

/** Pantalla `/perfil`: el formulario depende del rol. */
export function PerfilPage() {
  const { usuario, perfil, refrescar } = useAuth();
  const toast = useToast();
  const bienvenida = useSearchParams().get("bienvenida") === "1";

  if (!usuario) return null;

  async function guardar(payload: PerfilInput) {
    await api.perfil.guardar(payload);
    await refrescar();
    toast.exito("Tus cambios quedaron guardados.", "Perfil guardado");
  }

  if (usuario.rol === "administrador") {
    return (
      <EmptyState
        icono={<UserX className="size-7" />}
        titulo="Los administradores no tienen perfil"
        descripcion="Tu cuenta gestiona la plataforma. Desde el panel podés ir a las herramientas de administración."
        accion={<Button href="/panel">Ir al panel</Button>}
      />
    );
  }

  return (
    <>
      {bienvenida && (
        <Alert variante="success" titulo="¡Tu cuenta está lista!" className="mb-6">
          Completá tu perfil para empezar. Es el paso que más ayuda a que el resto de la plataforma funcione para vos.
        </Alert>
      )}
      {usuario.rol === "estudiante" && <PerfilEstudianteSeccion guardar={guardar} />}
      {usuario.rol === "empresa" && (
        <PerfilEmpresaForm
          perfil={esPerfilEmpresa(perfil) ? perfil : null}
          alGuardar={(payload: PerfilEmpresaInput) => guardar(payload)}
        />
      )}
      {usuario.rol === "docente" && (
        <PerfilDocenteForm
          perfil={esPerfilDocente(perfil) ? perfil : null}
          alGuardar={(payload: PerfilDocenteInput) => guardar(payload)}
        />
      )}
    </>
  );
}
