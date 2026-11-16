"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { rutaInternaSegura } from "@/components/auth/RoleGuard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { mensajeDeError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { enfocarPrimerError } from "@/lib/forms";
import { validarLogin, type Errores, type ValoresLogin } from "./validacion";

export function LoginForm() {
  const { login, estado } = useAuth();
  const router = useRouter();
  const parametros = useSearchParams();
  const siguiente = rutaInternaSegura(parametros.get("siguiente"));
  const sesionVencida = parametros.get("expirada") === "1";

  const [valores, setValores] = useState<ValoresLogin>({ email: "", contrasena: "" });
  const [errores, setErrores] = useState<Errores<keyof ValoresLogin>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  // Quien ya tiene sesión no necesita ver el login.
  useEffect(() => {
    if (estado === "autenticado") router.replace(siguiente);
  }, [estado, router, siguiente]);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);

    const encontrados = validarLogin(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(formulario.current, ["email", "contrasena"], encontrados);
      return;
    }

    setEnviando(true);
    try {
      await login({ email: valores.email.trim(), contrasena: valores.contrasena });
      router.replace(siguiente);
    } catch (error) {
      setErrorGeneral(mensajeDeError(error));
      setEnviando(false);
    }
  }

  return (
    <div className="bg-grid">
      <div className="mx-auto w-full max-w-md px-4 py-14 sm:py-20">
        <Card variante="sticker" relleno="lg">
          <h1 className="text-3xl font-bold">Ingresá a tu cuenta</h1>
          <p className="mt-2 text-muted">Seguí con tus recomendaciones, tus proyectos y tus postulaciones.</p>

          {sesionVencida && (
            <Alert variante="warning" className="mt-5">
              Tu sesión venció. Ingresá de nuevo para continuar.
            </Alert>
          )}

          <form ref={formulario} noValidate onSubmit={alEnviar} className="mt-6 flex flex-col gap-5">
            {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={valores.email}
              onChange={(e) => setValores((v) => ({ ...v, email: e.target.value }))}
              error={errores.email}
            />
            <PasswordInput
              label="Contraseña"
              name="contrasena"
              autoComplete="current-password"
              required
              value={valores.contrasena}
              onChange={(e) => setValores((v) => ({ ...v, contrasena: e.target.value }))}
              error={errores.contrasena}
            />
            <Button type="submit" tamano="lg" bloque cargando={enviando}>
              {enviando ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            ¿Todavía no tenés cuenta?{" "}
            <Link href="/registro" className="font-semibold text-primary underline underline-offset-4">
              Creá una cuenta
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
