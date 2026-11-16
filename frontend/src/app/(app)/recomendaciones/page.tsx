import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { RecomendacionesPage } from "@/features/recomendaciones/RecomendacionesPage";

export const metadata: Metadata = { title: "Recomendaciones" };

export default function RecomendacionesRoute() {
  return (
    <RoleGuard roles={["estudiante"]}>
      <RecomendacionesPage />
    </RoleGuard>
  );
}
