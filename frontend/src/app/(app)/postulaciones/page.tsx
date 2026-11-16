import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PostulacionesPage } from "@/features/postulaciones/PostulacionesPage";

export const metadata: Metadata = { title: "Mis postulaciones" };

export default function PostulacionesRoute() {
  return (
    <RoleGuard roles={["estudiante"]}>
      <PostulacionesPage />
    </RoleGuard>
  );
}
