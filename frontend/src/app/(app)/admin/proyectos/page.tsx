import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ProyectosAdminPage } from "@/features/admin/ProyectosAdminPage";

export const metadata: Metadata = { title: "Moderar proyectos" };

export default function ProyectosAdminRoute() {
  return (
    <RoleGuard roles={["administrador"]}>
      <ProyectosAdminPage />
    </RoleGuard>
  );
}
