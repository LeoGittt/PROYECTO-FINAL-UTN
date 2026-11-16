import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UsuariosAdminPage } from "@/features/admin/UsuariosAdminPage";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsuariosAdminRoute() {
  return (
    <RoleGuard roles={["administrador"]}>
      <UsuariosAdminPage />
    </RoleGuard>
  );
}
