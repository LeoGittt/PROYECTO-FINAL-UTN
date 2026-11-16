"use client";

import { Save, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { AsyncView } from "@/components/ui/AsyncView";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Select } from "@/components/ui/Select";
import { RegionCargando, SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { opcionesDe } from "@/features/proyectos/comunes";
import { SeccionPerfil } from "@/features/perfil/PerfilLayout";
import { useFormularioPerfil } from "@/features/perfil/useFormularioPerfil";
import { api } from "@/lib/api/endpoints";
import type { Habilidad, ProyectoInput, Tecnologia } from "@/lib/api/types";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { CATEGORIA_ETIQUETA, MODALIDAD_ETIQUETA, RETRIBUCION_ETIQUETA } from "@/lib/labels";
import { payloadProyecto, validarProyecto, type CampoProyecto, type ValoresProyecto } from "./valores";

/** Orden visual de los campos: el primero con error recibe el foco. */
const ORDEN: readonly CampoProyecto[] = [
  "titulo",
  "descripcion",
  "objetivos",
  "perfilBuscado",
  "duracionSemanas",
  "horasSemanales",
  "anioMinimo",
  "cupos",
  "modalidad",
  "tipoRetribucion",
  "detalleRetribucion",
];

interface ProyectoFormProps {
  inicial: ValoresProyecto;
  /** En el alta se ofrece guardar como borrador o publicar; en la edición, solo guardar. */
  modo: "alta" | "edicion";
  alGuardar: (payload: ProyectoInput) => Promise<void>;
}

/** Formulario de alta y edición de un proyecto. Carga los catálogos y después muestra los campos. */
export function ProyectoForm(props: ProyectoFormProps) {
  const catalogos = useApiQuery("catalogos:proyecto", async (signal) => {
    const [tecnologias, habilidades] = await Promise.all([
      api.catalogos.tecnologias({ signal }),
      api.catalogos.habilidades({ signal }),
    ]);
    return { tecnologias, habilidades };
  });
  return (
    <AsyncView
      consulta={catalogos}
      cargando={
        <RegionCargando etiqueta="Cargando el formulario">
          <SkeletonCard />
        </RegionCargando>
      }
      tituloError="No pudimos cargar los catálogos"
    >
      {(datos) => <Campos {...props} {...datos} />}
    </AsyncView>
  );
}

function Campos({
  inicial,
  modo,
  alGuardar,
  tecnologias: catalogoTecnologias,
  habilidades: catalogoHabilidades,
}: ProyectoFormProps & { tecnologias: Tecnologia[]; habilidades: Habilidad[] }) {
  const [valores, setValores] = useState(inicial);
  // Qué botón se usó para enviar el alta: "Guardar borrador" o "Publicar".
  const publicar = useRef(false);
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar: validarProyecto,
    orden: ORDEN,
    construirPayload: (v) => payloadProyecto(v, modo === "alta" ? publicar.current : undefined),
    alGuardar,
  });

  const campo = (clave: CampoProyecto) => ({
    name: clave,
    value: valores[clave],
    error: errores[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValores((v) => ({ ...v, [clave]: e.target.value })),
  });
  const numero = { type: "number", inputMode: "numeric", required: true } as const;
  const nombreTecnologia = new Map(catalogoTecnologias.map((t) => [t.idTecnologia, t.nombre]));
  const cambiarTecnologias = (tecnologias: ValoresProyecto["tecnologias"]) =>
    setValores((v) => ({ ...v, tecnologias }));

  return (
    <form ref={formulario} noValidate onSubmit={alEnviar} className="flex flex-col gap-6">
      <SeccionPerfil numero="01" titulo="De qué se trata">
        <Input label="Título" required maxLength={150} {...campo("titulo")} />
        <Textarea
          label="Descripción"
          required
          maxLength={2000}
          mostrarContador
          hint="Qué se va a construir y para quién. El motor de recomendación también lee este texto."
          {...campo("descripcion")}
        />
        <Textarea label="Objetivos" maxLength={2000} {...campo("objetivos")} />
        <Textarea
          label="Perfil buscado"
          maxLength={2000}
          hint="Qué tipo de estudiante necesitás: conocimientos, disponibilidad, intereses."
          {...campo("perfilBuscado")}
        />
      </SeccionPerfil>

      <SeccionPerfil numero="02" titulo="Condiciones">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Duración (semanas)" min={1} max={52} {...numero} {...campo("duracionSemanas")} />
          <Input label="Horas por semana" min={1} max={40} {...numero} {...campo("horasSemanales")} />
          <Input
            label="Año mínimo de cursada"
            min={1}
            max={6}
            {...numero}
            hint="Desde qué año de la carrera puede postularse un estudiante."
            {...campo("anioMinimo")}
          />
          <Input label="Cupos" min={1} max={20} {...numero} {...campo("cupos")} />
          <Select
            label="Modalidad"
            required
            placeholder="Elegí una opción"
            opciones={opcionesDe(MODALIDAD_ETIQUETA)}
            {...campo("modalidad")}
          />
          <Select
            label="Retribución"
            required
            placeholder="Elegí una opción"
            opciones={opcionesDe(RETRIBUCION_ETIQUETA)}
            {...campo("tipoRetribucion")}
          />
        </div>
        <Input
          label="Detalle de la retribución"
          maxLength={300}
          hint="Por ejemplo: monto mensual, horas de práctica profesional o tipo de certificado."
          {...campo("detalleRetribucion")}
        />
      </SeccionPerfil>

      <SeccionPerfil
        numero="03"
        titulo="Tecnologías y habilidades"
        descripcion="Las obligatorias pesan el doble que las deseables en la compatibilidad."
      >
        <div>
          <Combobox
            label="Agregar una tecnología"
            placeholder="Por ejemplo: React, Node.js, PostgreSQL"
            opciones={catalogoTecnologias.map((t) => ({
              valor: t.idTecnologia,
              etiqueta: t.nombre,
              detalle: CATEGORIA_ETIQUETA[t.categoria],
            }))}
            excluidos={valores.tecnologias.map((t) => t.idTecnologia)}
            alElegir={(o) =>
              cambiarTecnologias([...valores.tecnologias, { idTecnologia: Number(o.valor), obligatoria: true }])
            }
          />
          <ul aria-label="Tecnologías elegidas" className="mt-4 flex flex-col gap-2">
            {valores.tecnologias.map((t) => {
              const nombre = nombreTecnologia.get(t.idTecnologia) ?? `Tecnología ${t.idTecnologia}`;
              return (
                <li
                  key={t.idTecnologia}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <span className="min-w-0 flex-1 font-semibold">{nombre}</span>
                  <select
                    aria-label={`¿${nombre} es obligatoria o deseable?`}
                    value={t.obligatoria ? "obligatoria" : "deseable"}
                    onChange={(e) =>
                      cambiarTecnologias(
                        valores.tecnologias.map((x) =>
                          x.idTecnologia === t.idTecnologia ? { ...x, obligatoria: e.target.value === "obligatoria" } : x,
                        ),
                      )
                    }
                    className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm font-medium text-ink"
                  >
                    <option value="obligatoria">Obligatoria</option>
                    <option value="deseable">Deseable</option>
                  </select>
                  <button
                    type="button"
                    aria-label={`Quitar ${nombre}`}
                    onClick={() => cambiarTecnologias(valores.tecnologias.filter((x) => x.idTecnologia !== t.idTecnologia))}
                    className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              );
            })}
            {valores.tecnologias.length === 0 && (
              <li className="text-sm text-muted">Sin tecnologías, cualquier estudiante cumple ese criterio.</li>
            )}
          </ul>
        </div>
        <MultiSelect
          label="Agregar una habilidad"
          placeholder="Por ejemplo: trabajo en equipo"
          opciones={catalogoHabilidades.map((h) => ({ valor: h.idHabilidad, etiqueta: h.nombre }))}
          valores={valores.habilidades}
          alCambiar={(v) => setValores((actual) => ({ ...actual, habilidades: v as number[] }))}
          textoVacio="Todavía no agregaste ninguna habilidad."
        />
      </SeccionPerfil>

      <div className="flex flex-col gap-4">
        {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Los campos con * son obligatorios.</p>
          {modo === "alta" ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                variante="secondary"
                disabled={enviando}
                onClick={() => (publicar.current = false)}
                iconoIzquierda={<Save aria-hidden="true" className="size-5" />}
              >
                Guardar borrador
              </Button>
              <Button
                type="submit"
                cargando={enviando}
                onClick={() => (publicar.current = true)}
                iconoIzquierda={<Send aria-hidden="true" className="size-5" />}
              >
                Publicar proyecto
              </Button>
            </div>
          ) : (
            <Button type="submit" cargando={enviando} iconoIzquierda={<Save aria-hidden="true" className="size-5" />}>
              {enviando ? "Guardando…" : "Guardar cambios"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
