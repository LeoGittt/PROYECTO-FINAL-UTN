import type { Metadata } from "next";
import { NotificacionesPage } from "@/features/notificaciones/NotificacionesPage";

export const metadata: Metadata = { title: "Notificaciones" };

/** Para todos los roles: el layout del grupo (app) ya exige sesión iniciada. */
export default function NotificacionesRoute() {
  return <NotificacionesPage />;
}
