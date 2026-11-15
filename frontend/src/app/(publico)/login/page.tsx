import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  // useSearchParams (siguiente, expirada) exige un límite de Suspense.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
