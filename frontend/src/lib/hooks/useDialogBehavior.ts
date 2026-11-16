"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

const SELECTOR_ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Comportamiento común de los diálogos modales (Modal y menú móvil):
 * mueve el foco adentro al abrir, lo mantiene atrapado con Tab, cierra con
 * Escape, bloquea el scroll del fondo y devuelve el foco a quien abrió.
 * Un elemento con `data-autofocus` recibe el foco inicial.
 */
export function useDialogBehavior(
  abierto: boolean,
  alCerrar: () => void,
  contenedor: RefObject<HTMLElement | null>,
): void {
  const cerrar = useEffectEvent(alCerrar);

  useEffect(() => {
    const el = contenedor.current;
    if (!abierto || !el) return;

    const elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const enfocables = () => Array.from(el.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES));
    const inicial = el.querySelector<HTMLElement>("[data-autofocus]") ?? enfocables()[0] ?? el;
    inicial.focus();

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        cerrar();
        return;
      }
      if (evento.key !== "Tab") return;
      const lista = enfocables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      if (evento.shiftKey && (activo === primero || !el.contains(activo))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (activo === ultimo || !el.contains(activo))) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
      elementoPrevio?.focus();
    };
  }, [abierto, contenedor]);
}
