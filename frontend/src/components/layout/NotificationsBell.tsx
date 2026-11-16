"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/endpoints";

const EVENTO_CAMBIO = "notificaciones:cambio";

/** La pantalla de notificaciones lo llama después de marcar algo como leído, para que la campana se actualice. */
export function avisarCambioDeNotificaciones() {
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

/**
 * Campana de notificaciones: enlaza a /notificaciones y avisa la cantidad sin leer.
 * La cantidad se vuelve a pedir al cambiar de pantalla y cuando la pantalla de notificaciones avisa un cambio.
 */
export function NotificationsBell() {
  const ruta = usePathname();
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    function contar() {
      api.notificaciones
        .listar({ soloNoLeidas: true, limite: 1 }, { signal: controlador.signal })
        .then((respuesta) => setNoLeidas(respuesta.noLeidas))
        // Si la consulta falla, la campana sigue siendo un enlace con el último número conocido.
        .catch(() => {});
    }
    contar();
    window.addEventListener(EVENTO_CAMBIO, contar);
    return () => {
      controlador.abort();
      window.removeEventListener(EVENTO_CAMBIO, contar);
    };
  }, [ruta]);

  const etiqueta = noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : "Notificaciones";
  return (
    <Link
      href="/notificaciones"
      aria-label={etiqueta}
      className="relative grid size-10 place-items-center rounded-lg text-ink hover:bg-sunken"
    >
      <Bell aria-hidden="true" className="size-5" />
      {noLeidas > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-bold leading-4.5 text-on-danger"
        >
          {noLeidas > 99 ? "99+" : noLeidas}
        </span>
      )}
    </Link>
  );
}
