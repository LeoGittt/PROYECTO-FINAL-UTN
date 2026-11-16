import type { Metadata } from "next";
import { Suspense } from "react";
import { PerfilPage } from "@/features/perfil/PerfilPage";

export const metadata: Metadata = { title: "Mi perfil" };

export default function PerfilRoute() {
  // useSearchParams (bienvenida) exige un límite de Suspense.
  return (
    <Suspense>
      <PerfilPage />
    </Suspense>
  );
}
