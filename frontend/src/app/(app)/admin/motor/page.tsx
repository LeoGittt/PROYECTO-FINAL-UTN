import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { MotorAdminPage } from "@/features/admin/MotorAdminPage";

export const metadata: Metadata = { title: "Motor de matching" };

export default function MotorAdminRoute() {
  return (
    <RoleGuard roles={["administrador"]}>
      <MotorAdminPage />
    </RoleGuard>
  );
}
