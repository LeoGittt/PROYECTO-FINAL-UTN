"use client";

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { Carrera, Habilidad, Materia, PerfilEstudiante, PerfilEstudianteInput, Tecnologia } from "@/lib/api/types";
import { completitudEstudiante } from "./completitud";
import { MateriasPicker } from "./MateriasPicker";
import { PerfilLayout, SeccionPerfil } from "./PerfilLayout";
import { TechnologyPicker } from "./TechnologyPicker";
import { useFormularioPerfil } from "./useFormularioPerfil";
import { MAX_HORAS, MAX_TEXTO_LARGO, MIN_HORAS, ORDEN_ESTUDIANTE, validarEstudiante } from "./validacion";
import { payloadEstudiante, valoresDesdeEstudiante, type ValoresEstudiante } from "./valores";

interface PerfilEstudianteFormProps {
  /** Perfil guardado, o `null` si todavía no lo creó. */
  perfil: PerfilEstudiante | null;
  carreras: Carrera[];
  /** Todas las materias del catálogo; se filtran por la carrera elegida. */
  materias: Materia[];
  tecnologias: Tecnologia[];
  habilidades: Habilidad[];
  alGuardar: (payload: PerfilEstudianteInput) => Promise<void>;
}

export function PerfilEstudianteForm({ perfil, carreras, materias, tecnologias, habilidades, alGuardar }: PerfilEstudianteFormProps) {
  const [valores, setValores] = useState<ValoresEstudiante>(() => valoresDesdeEstudiante(perfil));
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar: (v) => validarEstudiante(v, carreras),
    orden: ORDEN_ESTUDIANTE,
    construirPayload: payloadEstudiante,
    alGuardar,
  });

  const carrera = carreras.find((c) => String(c.idCarrera) === valores.idCarrera);
  const materiasDeCarrera = useMemo(
    () => materias.filter((m) => String(m.idCarrera) === valores.idCarrera),
    [materias, valores.idCarrera],
  );
  const opcionesHabilidades = useMemo(
    () => habilidades.map((h) => ({ valor: h.idHabilidad, etiqueta: h.nombre })),
    [habilidades],
  );

  const cambiar = <K extends keyof ValoresEstudiante>(clave: K, valor: ValoresEstudiante[K]) =>
    setValores((v) => ({ ...v, [clave]: valor }));

  /** Al cambiar de carrera se descartan el año fuera de rango y las materias de la carrera anterior. */
  function cambiarCarrera(idCarrera: string) {
    const nueva = carreras.find((c) => String(c.idCarrera) === idCarrera);
    const ids = new Set(materias.filter((m) => String(m.idCarrera) === idCarrera).map((m) => m.idMateria));
    setValores((v) => ({
      ...v,
      idCarrera,
      anioCursada: nueva && Number(v.anioCursada) > nueva.duracionAnios ? "" : v.anioCursada,
      materiasAprobadas: v.materiasAprobadas.filter((id) => ids.has(id)),
    }));
  }

  const anios = Array.from({ length: carrera?.duracionAnios ?? 6 }, (_, i) => ({
    valor: i + 1,
    etiqueta: `${i + 1}.º año`,
  }));

  return (
    <PerfilLayout
      titulo="Mi perfil de estudiante"
      descripcion="Con estos datos calculamos qué proyectos encajan con vos. Podés completarlo en pocos minutos y volver a editarlo cuando quieras."
      completitud={completitudEstudiante(valores)}
    >
      <form ref={formulario} noValidate onSubmit={alEnviar} className="flex flex-col gap-6">
        <SeccionPerfil numero="01" titulo="Carrera y disponibilidad" descripcion="El año y las horas libres cuentan para el contexto de cada recomendación.">
          <Select
            label="Carrera"
            name="idCarrera"
            required
            placeholder="Elegí tu carrera"
            value={valores.idCarrera}
            onChange={(e) => cambiarCarrera(e.target.value)}
            opciones={carreras.map((c) => ({ valor: c.idCarrera, etiqueta: c.nombre }))}
            error={errores.idCarrera}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Año de cursada"
              name="anioCursada"
              required
              placeholder="Elegí tu año"
              value={valores.anioCursada}
              onChange={(e) => cambiar("anioCursada", e.target.value)}
              opciones={anios}
              hint={carrera ? `Tu carrera dura ${carrera.duracionAnios} ${carrera.duracionAnios === 1 ? "año" : "años"}.` : undefined}
              error={errores.anioCursada}
            />
            <Input
              label="Horas semanales disponibles"
              name="horasSemanales"
              type="number"
              inputMode="numeric"
              min={MIN_HORAS}
              max={MAX_HORAS}
              required
              value={valores.horasSemanales}
              onChange={(e) => cambiar("horasSemanales", e.target.value)}
              hint="Cuántas horas por semana podrías dedicar a un proyecto."
              error={errores.horasSemanales}
            />
          </div>
        </SeccionPerfil>

        <SeccionPerfil numero="02" titulo="Sobre vos" descripcion="El motor también compara estos textos con la descripción de cada proyecto.">
          <Textarea
            label="Descripción"
            name="descripcion"
            maxLength={MAX_TEXTO_LARGO}
            mostrarContador
            value={valores.descripcion}
            onChange={(e) => cambiar("descripcion", e.target.value)}
            hint="Qué sabés hacer, qué te interesa y qué tipo de proyecto te gustaría encarar."
            error={errores.descripcion}
          />
          <Textarea
            label="Proyectos previos"
            name="proyectosPrevios"
            maxLength={MAX_TEXTO_LARGO}
            mostrarContador
            value={valores.proyectosPrevios}
            onChange={(e) => cambiar("proyectosPrevios", e.target.value)}
            hint="Trabajos de la facultad, personales o freelance. Contá brevemente qué hiciste."
            error={errores.proyectosPrevios}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="GitHub"
              name="githubUrl"
              type="url"
              inputMode="url"
              placeholder="https://github.com/tu-usuario"
              value={valores.githubUrl}
              onChange={(e) => cambiar("githubUrl", e.target.value)}
              error={errores.githubUrl}
            />
            <Input
              label="Portfolio"
              name="portfolioUrl"
              type="url"
              inputMode="url"
              placeholder="https://tusitio.com"
              value={valores.portfolioUrl}
              onChange={(e) => cambiar("portfolioUrl", e.target.value)}
              error={errores.portfolioUrl}
            />
          </div>
          <Input
            label="Enlace a tu CV"
            name="cvUrl"
            type="url"
            inputMode="url"
            placeholder="https://drive.google.com/..."
            value={valores.cvUrl}
            onChange={(e) => cambiar("cvUrl", e.target.value)}
            hint="Por ahora se carga como enlace (por ejemplo, de Drive)."
            error={errores.cvUrl}
          />
        </SeccionPerfil>

        <SeccionPerfil numero="03" titulo="Tecnologías" descripcion="Es lo que más pesa en la compatibilidad: sé honesto con tu nivel.">
          <TechnologyPicker catalogo={tecnologias} valor={valores.tecnologias} alCambiar={(t) => cambiar("tecnologias", t)} />
        </SeccionPerfil>

        <SeccionPerfil numero="04" titulo="Habilidades" descripcion="Opcional: habilidades blandas o técnicas que no son una tecnología puntual.">
          <MultiSelect
            label="Agregar una habilidad"
            placeholder="Por ejemplo: trabajo en equipo"
            opciones={opcionesHabilidades}
            valores={valores.habilidades}
            alCambiar={(v) => cambiar("habilidades", v as number[])}
            textoVacio="Todavía no agregaste ninguna habilidad."
          />
        </SeccionPerfil>

        <SeccionPerfil numero="05" titulo="Materias aprobadas" descripcion="Se muestran las materias de la carrera que elegiste.">
          {valores.idCarrera ? (
            <MateriasPicker
              materias={materiasDeCarrera}
              valor={valores.materiasAprobadas}
              alCambiar={(m) => cambiar("materiasAprobadas", m)}
            />
          ) : (
            <p className="text-sm text-muted">Elegí tu carrera para ver sus materias.</p>
          )}
        </SeccionPerfil>

        <div className="flex flex-col gap-4">
          {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Los campos con * son obligatorios. El resto mejora tus recomendaciones.</p>
            <Button type="submit" tamano="lg" cargando={enviando} iconoIzquierda={<Save aria-hidden="true" className="size-5" />}>
              {enviando ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        </div>
      </form>
    </PerfilLayout>
  );
}
