import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Todas las pantallas con sesión viven en este grupo: exigen usuario autenticado y
 * comparten la estructura con navegación según el rol. Cada pantalla puede acotar
 * más con <RoleGuard roles={[...]}>.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
