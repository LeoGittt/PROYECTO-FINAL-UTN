import { Bell } from "lucide-react";
import Link from "next/link";

interface NotificationsBellProps {
  /**
   * Cantidad de notificaciones sin leer. Por ahora la pantalla de notificaciones
   * todavía no está conectada, así que el encabezado no pasa ningún valor.
   */
  noLeidas?: number;
}

/** Campana de notificaciones: enlaza a /notificaciones y avisa la cantidad sin leer. */
export function NotificationsBell({ noLeidas = 0 }: NotificationsBellProps) {
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
