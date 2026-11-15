"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Errores } from "@/features/auth/validacion";
import { esApiError, mensajeDeError } from "@/lib/api/client";
import { enfocarPrimerError } from "@/lib/forms";

interface Opciones<V, C extends string, P> {
  valores: V;
  validar: (valores: V) => Errores<C>;
  /** Orden visual de los campos: el primero con error recibe el foco. */
  orden: readonly C[];
  construirPayload: (valores: V) => P;
  alGuardar: (payload: P) => Promise<void>;
}

/**
 * Envío de un formulario de perfil: valida, enfoca el primer error, arma el cuerpo del
 * `PUT /perfil`, y muestra los errores que devuelva el backend (por campo o generales).
 */
export function useFormularioPerfil<V, C extends string, P>({
  valores,
  validar,
  orden,
  construirPayload,
  alGuardar,
}: Opciones<V, C, P>) {
  const [errores, setErrores] = useState<Errores<C>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);

    const encontrados = validar(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setErrorGeneral("Revisá los campos marcados antes de guardar.");
      enfocarPrimerError(formulario.current, orden, encontrados);
      return;
    }

    setEnviando(true);
    try {
      await alGuardar(construirPayload(valores));
    } catch (error) {
      if (esApiError(error)) {
        const delServidor: Errores<C> = {};
        for (const campo of orden) {
          const mensaje = error.erroresPorCampo[campo];
          if (mensaje) delServidor[campo] = mensaje;
        }
        if (Object.keys(delServidor).length > 0) {
          setErrores(delServidor);
          enfocarPrimerError(formulario.current, orden, delServidor);
        }
      }
      setErrorGeneral(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  return { errores, errorGeneral, enviando, formulario, alEnviar };
}
