import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { InvitacionesPage } from "@/features/invitaciones/InvitacionesPage";

export const metadata: Metadata = { title: "Invitaciones" };

export default function InvitacionesRoute() {
  return (
    <RoleGuard roles={["estudiante"]}>
      <InvitacionesPage />
    </RoleGuard>
  );
}
