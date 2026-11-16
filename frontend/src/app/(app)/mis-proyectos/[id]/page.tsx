import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { GestionProyectoPage } from "@/features/mis-proyectos/GestionProyectoPage";

export const metadata: Metadata = { title: "Gestionar proyecto" };

export default async function GestionProyectoRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard roles={["empresa", "docente"]}>
      <GestionProyectoPage idProyecto={Number(id)} />
    </RoleGuard>
  );
}
