import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { NuevoProyectoPage } from "@/features/mis-proyectos/NuevoProyectoPage";

export const metadata: Metadata = { title: "Publicar proyecto" };

export default function NuevoProyectoRoute() {
  return (
    <RoleGuard roles={["empresa", "docente"]}>
      <NuevoProyectoPage />
    </RoleGuard>
  );
}
