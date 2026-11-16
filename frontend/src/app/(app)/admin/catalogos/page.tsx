import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { CatalogosAdminPage } from "@/features/admin/CatalogosAdminPage";

export const metadata: Metadata = { title: "Catálogos" };

export default function CatalogosAdminRoute() {
  return (
    <RoleGuard roles={["administrador"]}>
      <CatalogosAdminPage />
    </RoleGuard>
  );
}
