"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { PerfilEmpresa, PerfilEmpresaInput } from "@/lib/api/types";
import { completitudEmpresa } from "./completitud";
import { PerfilLayout, SeccionPerfil } from "./PerfilLayout";
import { useFormularioPerfil } from "./useFormularioPerfil";
import { MAX_TEXTO_LARGO, ORDEN_EMPRESA, validarEmpresa } from "./validacion";
import { payloadEmpresa, valoresDesdeEmpresa, type ValoresEmpresa } from "./valores";

interface PerfilEmpresaFormProps {
  perfil: PerfilEmpresa | null;
  alGuardar: (payload: PerfilEmpresaInput) => Promise<void>;
}

export function PerfilEmpresaForm({ perfil, alGuardar }: PerfilEmpresaFormProps) {
  const [valores, setValores] = useState<ValoresEmpresa>(() => valoresDesdeEmpresa(perfil));
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar: validarEmpresa,
    orden: ORDEN_EMPRESA,
    construirPayload: payloadEmpresa,
    alGuardar,
  });

  const campo = (clave: keyof ValoresEmpresa) => ({
    name: clave,
    value: valores[clave],
    error: errores[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValores((v) => ({ ...v, [clave]: e.target.value })),
  });

  return (
    <PerfilLayout
      titulo="Perfil de la empresa"
      descripcion="Los estudiantes ven estos datos cuando conocen tus proyectos. Necesitás completarlos para poder publicar."
      completitud={completitudEmpresa(valores)}
    >
      <form ref={formulario} noValidate onSubmit={alEnviar} className="flex flex-col gap-6">
        <SeccionPerfil numero="01" titulo="Datos de la empresa">
          <Input label="Nombre de la empresa" required autoComplete="organization" {...campo("nombreEmpresa")} />
          <Input
            label="Sector o rubro"
            required
            hint="Por ejemplo: software y servicios IT, industria, tercer sector."
            {...campo("sector")}
          />
          <Input
            label="Contacto"
            required
            hint="Email o teléfono de la persona a cargo. Lo ven los estudiantes con los que interactúes."
            {...campo("contacto")}
          />
          <Input
            label="Sitio web"
            type="url"
            inputMode="url"
            placeholder="https://www.tuempresa.com"
            {...campo("sitioWeb")}
          />
        </SeccionPerfil>
        <SeccionPerfil numero="02" titulo="Sobre la empresa">
          <Textarea
            label="Descripción"
            maxLength={MAX_TEXTO_LARGO}
            mostrarContador
            hint="A qué se dedica la empresa y qué tipo de proyectos suele necesitar."
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
