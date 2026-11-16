"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { siguientePreferencia, useTema, type PreferenciaTema } from "@/lib/theme/tema";

const DATOS: Record<PreferenciaTema, { nombre: string; icono: typeof Sun }> = {
  system: { nombre: "automático (según tu dispositivo)", icono: Monitor },
  light: { nombre: "claro", icono: Sun },
  dark: { nombre: "oscuro", icono: Moon },
};

/**
 * Selector de tema: automático, claro u oscuro. Cada pulsación pasa al siguiente.
 * La elección queda guardada en este navegador.
 */
export function ThemeToggle() {
  const { preferencia, alternar } = useTema();
  const siguiente = siguientePreferencia(preferencia);
  const Icono = DATOS[preferencia].icono;
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={`Tema ${DATOS[preferencia].nombre}. Cambiar a ${DATOS[siguiente].nombre}`}
      title={`Tema: ${DATOS[preferencia].nombre}`}
      className="grid size-10 place-items-center rounded-lg text-ink hover:bg-sunken"
    >
      <Icono aria-hidden="true" className="size-5" />
    </button>
  );
}
