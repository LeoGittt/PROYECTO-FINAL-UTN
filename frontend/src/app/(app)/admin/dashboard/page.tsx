import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { DashboardAdminPage } from "@/features/admin/DashboardAdminPage";

export const metadata: Metadata = { title: "Dashboard de métricas" };

export default function DashboardAdminRoute() {
  return (
    <RoleGuard roles={["administrador"]}>
      <DashboardAdminPage />
    </RoleGuard>
  );
}
