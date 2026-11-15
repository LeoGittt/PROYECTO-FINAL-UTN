"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { PerfilDocente, PerfilDocenteInput } from "@/lib/api/types";
import { completitudDocente } from "./completitud";
import { PerfilLayout, SeccionPerfil } from "./PerfilLayout";
import { useFormularioPerfil } from "./useFormularioPerfil";
import { MAX_TEXTO_LARGO, ORDEN_DOCENTE, validarDocente } from "./validacion";
import { payloadDocente, valoresDesdeDocente, type ValoresDocente } from "./valores";

interface PerfilDocenteFormProps {
  perfil: PerfilDocente | null;
  alGuardar: (payload: PerfilDocenteInput) => Promise<void>;
}

export function PerfilDocenteForm({ perfil, alGuardar }: PerfilDocenteFormProps) {
  const [valores, setValores] = useState<ValoresDocente>(() => valoresDesdeDocente(perfil));
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar: validarDocente,
    orden: ORDEN_DOCENTE,
    construirPayload: payloadDocente,
    alGuardar,
  });

  const campo = (clave: keyof ValoresDocente) => ({
    name: clave,
    value: valores[clave],
    error: errores[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValores((v) => ({ ...v, [clave]: e.target.value })),
  });

  return (
    <PerfilLayout
      titulo="Perfil docente"
      descripcion="Contanos de tu cátedra y de tu trabajo. Necesitás completarlo para poder publicar proyectos."
      completitud={completitudDocente(valores)}
    >
      <form ref={formulario} noValidate onSubmit={alEnviar} className="flex flex-col gap-6">
        <SeccionPerfil numero="01" titulo="Tu cátedra">
          <Input label="Cátedra" required hint="Por ejemplo: Programación III." {...campo("catedra")} />
          <Input
            label="Área de investigación"
            hint="Opcional. El tema o la línea en la que trabajás."
            {...campo("areaInvestigacion")}
          />
        </SeccionPerfil>
        <SeccionPerfil numero="02" titulo="Sobre tu trabajo">
          <Textarea
            label="Descripción"
            maxLength={MAX_TEXTO_LARGO}
            mostrarContador
            hint="Qué enseñás o investigás y qué tipo de proyectos te gustaría proponer."
            {...campo("descripcion")}
          />
        </SeccionPerfil>

        <div className="flex flex-col gap-4">
          {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Los campos con * son obligatorios.</p>
            <Button type="submit" tamano="lg" cargando={enviando} iconoIzquierda={<Save aria-hidden="true" className="size-5" />}>
              {enviando ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        </div>
      </form>
    </PerfilLayout>
  );
}
