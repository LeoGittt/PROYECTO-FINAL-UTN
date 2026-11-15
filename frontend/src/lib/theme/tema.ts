import { useSyncExternalStore } from "react";
import { TEMA_STORAGE_KEY } from "./temaScript";

/**
 * Preferencia de tema. "system" sigue prefers-color-scheme (lo resuelve el CSS);
 * "light" y "dark" fijan el atributo data-theme en <html>. La elección se guarda
 * en localStorage dentro de try/catch (puede no estar disponible).
 *
 * Un script en línea en el <head> (ver SCRIPT_TEMA) aplica la elección guardada
 * antes de pintar para evitar el destello de tema equivocado.
 */

export type PreferenciaTema = "system" | "light" | "dark";

let preferenciaEnMemoria: PreferenciaTema = "system";
const oyentes = new Set<() => void>();

function esPreferencia(valor: unknown): valor is PreferenciaTema {
  return valor === "system" || valor === "light" || valor === "dark";
}

export function leerPreferencia(): PreferenciaTema {
  try {
    const guardada = window.localStorage.getItem(TEMA_STORAGE_KEY);
    if (esPreferencia(guardada)) return guardada;
    return "system";
  } catch {
    return preferenciaEnMemoria;
  }
}

function aplicarAlDocumento(preferencia: PreferenciaTema): void {
  const raiz = document.documentElement;
  if (preferencia === "system") raiz.removeAttribute("data-theme");
  else raiz.setAttribute("data-theme", preferencia);
}

export function establecerPreferencia(preferencia: PreferenciaTema): void {
  preferenciaEnMemoria = preferencia;
  try {
    if (preferencia === "system") window.localStorage.removeItem(TEMA_STORAGE_KEY);
    else window.localStorage.setItem(TEMA_STORAGE_KEY, preferencia);
  } catch {
    // Sin almacenamiento: el cambio vale solo para esta sesión.
  }
  aplicarAlDocumento(preferencia);
  oyentes.forEach((oyente) => oyente());
}

/** Orden del botón: automático, claro, oscuro. */
export function siguientePreferencia(actual: PreferenciaTema): PreferenciaTema {
  if (actual === "system") return "light";
  if (actual === "light") return "dark";
  return "system";
}

function suscribirse(oyente: () => void): () => void {
  oyentes.add(oyente);
  const alCambiarStorage = (e: StorageEvent) => {
    if (e.key === TEMA_STORAGE_KEY || e.key === null) {
      aplicarAlDocumento(leerPreferencia());
      oyente();
    }
  };
  window.addEventListener("storage", alCambiarStorage);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", alCambiarStorage);
  };
}

export function useTema(): {
  preferencia: PreferenciaTema;
  establecer: (preferencia: PreferenciaTema) => void;
  alternar: () => void;
} {
  const preferencia = useSyncExternalStore(suscribirse, leerPreferencia, () => "system" as const);
  return {
    preferencia,
    establecer: establecerPreferencia,
    alternar: () => establecerPreferencia(siguientePreferencia(leerPreferencia())),
  };
}
