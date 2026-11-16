"use client";

import { PlusCircle, Tags } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { AsyncView } from "@/components/ui/AsyncView";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { Errores } from "@/features/auth/validacion";
import { useFormularioPerfil } from "@/features/perfil/useFormularioPerfil";
import { opcionesDe } from "@/features/proyectos/comunes";
import { api } from "@/lib/api/endpoints";
import type { CategoriaTecnologia, Tecnologia } from "@/lib/api/types";
import { normalizarTexto } from "@/lib/format";
import { textoONull } from "@/lib/forms";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { CATEGORIA_ETIQUETA } from "@/lib/labels";

/** `/admin/catalogos`: el catálogo de tecnologías que usan los perfiles y los proyectos (alta y edición). */
export function CatalogosAdminPage() {
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  /** `"nueva"` abre el alta; una tecnología abre su edición. */
  const [editando, setEditando] = useState<Tecnologia | "nueva" | null>(null);
  const consulta = useApiQuery("catalogos:tecnologias", (signal) => api.catalogos.tecnologias({ signal }), {
    esVacio: (lista) => lista.length === 0,
  });

  return (
    <>
      <PageHeader
        etiqueta="Administración"
        titulo="Catálogo de tecnologías"
        descripcion="Las tecnologías que los estudiantes cargan en su perfil y los publicadores piden en sus proyectos."
        acciones={
          <Button iconoIzquierda={<PlusCircle aria-hidden="true" className="size-5" />} onClick={() => setEditando("nueva")}>
            Nueva tecnología
          </Button>
        }
      />

      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando el catálogo"
        tituloError="No pudimos cargar el catálogo"
        vacio={
          <EmptyState icono={<Tags className="size-7" />} titulo="El catálogo está vacío" descripcion="Agregá la primera tecnología." />
        }
      >
        {(tecnologias) => {
          const buscada = normalizarTexto(busqueda.trim());
          const visibles = tecnologias
            .filter((t) => normalizarTexto(t.nombre).includes(buscada))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
          return (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <Input
                  className="w-full sm:w-80"
                  type="search"
                  label="Buscar tecnología"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <p role="status" className="text-sm text-muted">
                  {visibles.length} de {tecnologias.length} tecnologías
                </p>
              </div>
              {visibles.length === 0 ? (
                <EmptyState titulo={`Ninguna tecnología coincide con «${busqueda.trim()}».`} />
              ) : (
                <DataTable
                  caption="Tecnologías del catálogo"
                  filas={visibles}
                  idDeFila={(t) => t.idTecnologia}
                  columnas={[
                    { clave: "nombre", titulo: "Nombre", celda: (t) => <span className="font-semibold">{t.nombre}</span> },
                    { clave: "categoria", titulo: "Categoría", celda: (t) => CATEGORIA_ETIQUETA[t.categoria] },
                    {
                      clave: "descripcion",
                      titulo: "Descripción",
                      celda: (t) => <span className="text-muted">{t.descripcion ?? "—"}</span>,
                    },
                    {
                      clave: "acciones",
                      titulo: "Acciones",
                      alinear: "derecha",
                      celda: (t) => (
                        <Button variante="ghost" tamano="sm" aria-label={`Editar ${t.nombre}`} onClick={() => setEditando(t)}>
                          Editar
                        </Button>
                      ),
                    },
                  ]}
                />
              )}
            </>
          );
        }}
      </AsyncView>

      {editando && (
        <TecnologiaDialog
          tecnologia={editando === "nueva" ? null : editando}
          alCerrar={() => setEditando(null)}
          alGuardar={(nombre) => {
            toast.exito(
              editando === "nueva" ? `«${nombre}» ya se puede elegir en perfiles y proyectos.` : `Los cambios en «${nombre}» ya se ven.`,
              editando === "nueva" ? "Tecnología agregada" : "Tecnología actualizada",
            );
            setEditando(null);
            consulta.recargar();
          }}
        />
      )}
    </>
  );
}

interface Valores {
  nombre: string;
  categoria: CategoriaTecnologia | "";
  descripcion: string;
}

const ORDEN = ["nombre", "categoria", "descripcion"] as const;

function validar(v: Valores): Errores<keyof Valores> {
  const errores: Errores<keyof Valores> = {};
  const nombre = v.nombre.trim();
  if (!nombre) errores.nombre = "Ingresá el nombre de la tecnología.";
  else if (nombre.length > 60) errores.nombre = "El nombre no puede superar los 60 caracteres.";
  if (!v.categoria) errores.categoria = "Elegí una categoría.";
  if (v.descripcion.trim().length > 300) errores.descripcion = "La descripción no puede superar los 300 caracteres.";
  return errores;
}

/** Alta (`POST /admin/tecnologias`) o edición (`PUT /admin/tecnologias/:id`) con el mismo formulario. */
function TecnologiaDialog({
  tecnologia,
  alCerrar,
  alGuardar,
}: {
  tecnologia: Tecnologia | null;
  alCerrar: () => void;
  alGuardar: (nombre: string) => void;
}) {
  const [valores, setValores] = useState<Valores>({
    nombre: tecnologia?.nombre ?? "",
    categoria: tecnologia?.categoria ?? "",
    descripcion: tecnologia?.descripcion ?? "",
  });
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar,
    orden: ORDEN,
    construirPayload: (v) => ({
      nombre: v.nombre.trim(),
      categoria: v.categoria as CategoriaTecnologia,
      descripcion: textoONull(v.descripcion),
    }),
    alGuardar: async (payload) => {
      if (tecnologia) await api.catalogos.actualizarTecnologia(tecnologia.idTecnologia, payload);
      else await api.catalogos.crearTecnologia(payload);
      alGuardar(payload.nombre);
    },
  });

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={tecnologia ? `Editar ${tecnologia.nombre}` : "Nueva tecnología"}
      descripcion="El nombre no se puede repetir (sin distinguir mayúsculas)."
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-tecnologia" cargando={enviando}>
            Guardar tecnología
          </Button>
        </>
      }
    >
      <form id="form-tecnologia" ref={formulario} onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
        {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
        <Input
          name="nombre"
          label="Nombre"
          required
          maxLength={60}
          autoComplete="off"
          value={valores.nombre}
          error={errores.nombre}
          onChange={(e) => setValores((v) => ({ ...v, nombre: e.target.value }))}
        />
        <Select
          name="categoria"
          label="Categoría"
          required
          placeholder="Elegí una categoría"
          opciones={opcionesDe(CATEGORIA_ETIQUETA)}
          value={valores.categoria}
          error={errores.categoria}
          onChange={(e) => setValores((v) => ({ ...v, categoria: e.target.value as CategoriaTecnologia | "" }))}
        />
        <Textarea
          name="descripcion"
          label="Descripción (opcional)"
          maxLength={300}
          mostrarContador
          rows={3}
          value={valores.descripcion}
          error={errores.descripcion}
          onChange={(e) => setValores((v) => ({ ...v, descripcion: e.target.value }))}
        />
      </form>
    </Modal>
  );
}
