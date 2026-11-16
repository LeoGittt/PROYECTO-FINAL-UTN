import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { MisProyectosPage } from "@/features/mis-proyectos/MisProyectosPage";

export const metadata: Metadata = { title: "Mis proyectos" };

export default function MisProyectosRoute() {
  return (
    <RoleGuard roles={["empresa", "docente"]}>
      <MisProyectosPage />
    </RoleGuard>
  );
}
