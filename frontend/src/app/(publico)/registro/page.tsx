import type { Metadata } from "next";
import { Suspense } from "react";
import { RegistroForm } from "@/features/auth/RegistroForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  // useSearchParams (rol) exige un límite de Suspense.
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  );
}
