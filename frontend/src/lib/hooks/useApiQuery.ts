"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ApiError } from "@/lib/api/client";

/**
 * Patrón de carga de datos de la aplicación.
 *
 *   const consulta = useApiQuery("proyectos:mios", (signal) => api.proyectos.mios(undefined, { signal }),
 *     { esVacio: (lista) => lista.length === 0 });
 *
 * devuelve un estado explícito (`cargando`, `ok`, `vacio`, `error`) para que cada
 * pantalla muestre skeleton, contenido, estado vacío o estado de error (ver `AsyncView`).
 *
 * - `clave` identifica la consulta: cuando cambia, se vuelve a pedir (por ejemplo,
 *   incluí los filtros: `proyectos:${JSON.stringify(filtros)}`).
 * - La llamada se cancela al cambiar la clave o al desmontar, así una respuesta
 *   vieja nunca pisa a una nueva.
 * - Mientras recarga conserva el dato anterior en `data` (sin parpadeo).
 */

export type EstadoConsulta = "inactiva" | "cargando" | "ok" | "vacio" | "error";

export interface Consulta<T> {
  estado: EstadoConsulta;
  data: T | null;
  error: ApiError | null;
  /** `true` mientras no hay respuesta para la clave actual. */
  cargando: boolean;
  recargar: () => void;
}

export interface OpcionesConsulta<T> {
  /** Si es `false` no se pide nada (por ejemplo, hasta que haya sesión). */
  habilitada?: boolean;
  esVacio?: (data: T) => boolean;
}

function aApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({
    statusCode: 0,
    error: "Error",
    message: "Ocurrió un error inesperado. Intentá de nuevo.",
  });
}

interface Resultado<T> {
  clave: string;
  data: T | null;
  error: ApiError | null;
}

export function useApiQuery<T>(
  clave: string,
  consultar: (signal: AbortSignal) => Promise<T>,
  { habilitada = true, esVacio }: OpcionesConsulta<T> = {},
): Consulta<T> {
  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const claveCompleta = `${clave}#${version}`;

  const ejecutar = useEffectEvent((signal: AbortSignal) => consultar(signal));

  useEffect(() => {
    if (!habilitada) return;
    const controlador = new AbortController();
    ejecutar(controlador.signal).then(
      (data) => {
        if (!controlador.signal.aborted) setResultado({ clave: claveCompleta, data, error: null });
      },
      (error: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({ clave: claveCompleta, data: null, error: aApiError(error) });
        }
      },
    );
    return () => controlador.abort();
  }, [claveCompleta, habilitada]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  const respondida = resultado !== null && resultado.clave === claveCompleta;
  let estado: EstadoConsulta;
  if (!habilitada) estado = "inactiva";
  else if (!respondida) estado = "cargando";
  else if (resultado.error) estado = "error";
  else if (resultado.data !== null && esVacio?.(resultado.data)) estado = "vacio";
  else estado = "ok";

  return {
    estado,
    data: respondida ? resultado.data : null,
    error: respondida ? resultado.error : null,
    cargando: estado === "cargando",
    recargar,
  };
}
