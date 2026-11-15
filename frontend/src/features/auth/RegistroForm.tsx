"use client";

import { ArrowLeft, ArrowRight, Building2, Check, GraduationCap, School, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { RadioCard } from "@/components/ui/RadioCard";
import { Stepper } from "@/components/ui/Stepper";
import { esApiError, mensajeDeError } from "@/lib/api/client";
import type { RolRegistrable } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { enfocarPrimerError } from "@/lib/forms";
import {
  esRolRegistrable,
  MENSAJE_ROL,
  reglasContrasena,
  validarRegistro,
  type Errores,
  type ValoresRegistro,
} from "./validacion";

const ROLES: { rol: RolRegistrable; titulo: string; descripcion: string; icono: React.ReactNode }[] = [
  {
    rol: "estudiante",
    titulo: "Soy estudiante",
    descripcion: "Estoy cursando en la UTN y quiero sumar experiencia real. Armo mi perfil y recibo proyectos recomendados.",
    icono: <GraduationCap aria-hidden="true" className="size-7" />,
  },
  {
    rol: "empresa",
    titulo: "Represento a una empresa",
    descripcion: "Necesito resolver algo acotado. Publico proyectos y encuentro a los estudiantes que mejor encajan.",
    icono: <Building2 aria-hidden="true" className="size-7" />,
  },
  {
    rol: "docente",
    titulo: "Soy docente",
    descripcion: "Tengo una cátedra o una investigación. Publico proyectos para que los estudiantes ganen práctica.",
    icono: <School aria-hidden="true" className="size-7" />,
  },
];

const PASOS = [
  { id: "rol", titulo: "Elegí tu rol" },
  { id: "datos", titulo: "Tus datos" },
  { id: "perfil", titulo: "Completá tu perfil" },
];

const ORDEN_CAMPOS = ["nombre", "apellido", "email", "contrasena"] as const;

function ReglaContrasena({ cumplida, texto }: { cumplida: boolean; texto: string }) {
  return (
    <li className={cn("flex items-center gap-2 text-sm", cumplida ? "text-success-ink" : "text-muted")}>
      {cumplida ? (
        <Check aria-hidden="true" className="size-4 text-success" />
      ) : (
        <Circle aria-hidden="true" className="size-4" />
      )}
      <span>
        {texto}
        <span className="sr-only">{cumplida ? " (cumplido)" : " (pendiente)"}</span>
      </span>
    </li>
  );
}

export function RegistroForm() {
  const { registrar } = useAuth();
  const router = useRouter();
  const parametros = useSearchParams();
  const rolDeUrl = parametros.get("rol");

  const [rol, setRol] = useState<RolRegistrable | null>(esRolRegistrable(rolDeUrl) ? rolDeUrl : null);
  const [paso, setPaso] = useState(esRolRegistrable(rolDeUrl) ? 1 : 0);
  const [errorRol, setErrorRol] = useState<string | undefined>();
  const [valores, setValores] = useState<ValoresRegistro>({ nombre: "", apellido: "", email: "", contrasena: "" });
  const [errores, setErrores] = useState<Errores<keyof ValoresRegistro>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  const reglas = reglasContrasena(valores.contrasena);

  function continuar() {
    if (!rol) {
      setErrorRol(MENSAJE_ROL);
      return;
    }
    setErrorRol(undefined);
    setPaso(1);
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);
    if (!rol) {
      setPaso(0);
      setErrorRol(MENSAJE_ROL);
      return;
    }

    const encontrados = validarRegistro(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(formulario.current, ORDEN_CAMPOS, encontrados);
      return;
    }

    setEnviando(true);
    try {
      await registrar({
        nombre: valores.nombre.trim(),
        apellido: valores.apellido.trim(),
        email: valores.email.trim(),
        contrasena: valores.contrasena,
        rol,
      });
      router.replace("/perfil?bienvenida=1");
    } catch (error) {
      if (esApiError(error) && Object.keys(error.erroresPorCampo).length > 0) {
        const delServidor = error.erroresPorCampo;
        const mapeados: Errores<keyof ValoresRegistro> = {};
        for (const campo of ORDEN_CAMPOS) if (delServidor[campo]) mapeados[campo] = delServidor[campo];
        setErrores(mapeados);
        enfocarPrimerError(formulario.current, ORDEN_CAMPOS, mapeados);
      }
      setErrorGeneral(mensajeDeError(error));
      setEnviando(false);
    }
  }

  const campo = (clave: keyof ValoresRegistro) => ({
    name: clave,
    value: valores[clave],
    error: errores[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValores((v) => ({ ...v, [clave]: e.target.value })),
  });

  return (
    <div className="bg-grid">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
        <Stepper pasos={PASOS} actual={paso} etiqueta="Pasos del registro" className="mb-8" />

        <Card variante="sticker" relleno="lg">
          {paso === 0 ? (
            <div>
              <h1 className="text-3xl font-bold">Creá tu cuenta</h1>
              <p className="mt-2 text-muted">
                Empecemos por lo básico: contanos cómo vas a usar UTN Match. Después te pedimos tus datos.
              </p>
              <fieldset className="mt-6">
                <legend className="mb-3 text-sm font-semibold">¿Cómo vas a usar la plataforma?</legend>
                <div className="grid gap-3 md:grid-cols-3">
                  {ROLES.map((r) => (
                    <RadioCard
                      key={r.rol}
                      name="rol"
                      value={r.rol}
                      checked={rol === r.rol}
                      onChange={() => {
                        setRol(r.rol);
                        setErrorRol(undefined);
                      }}
                      titulo={r.titulo}
                      descripcion={r.descripcion}
                    />
                  ))}
                </div>
                {errorRol && (
                  <p role="alert" className="mt-3 text-sm font-medium text-danger-ink">
                    {errorRol}
                  </p>
                )}
              </fieldset>
              <div className="mt-8 flex justify-end">
                <Button onClick={continuar} iconoDerecha={<ArrowRight aria-hidden="true" className="size-4" />}>
                  Continuar
                </Button>
              </div>
            </div>
          ) : (
            <form ref={formulario} noValidate onSubmit={alEnviar}>
              <h1 className="text-3xl font-bold">Tus datos</h1>
              <p className="mt-2 text-muted">
                Te registrás como{" "}
                <strong className="text-ink">{ROLES.find((r) => r.rol === rol)?.titulo.toLowerCase()}</strong>.{" "}
                <button type="button" onClick={() => setPaso(0)} className="font-semibold text-primary underline underline-offset-4">
                  Cambiar
                </button>
              </p>
              <p className="mt-1 text-sm text-muted">Los campos con * son obligatorios.</p>

              <div className="mt-6 flex flex-col gap-5">
                {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="Nombre" autoComplete="given-name" required {...campo("nombre")} />
                  <Input label="Apellido" autoComplete="family-name" required {...campo("apellido")} />
                </div>
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  hint={rol === "estudiante" ? "Podés usar el mail institucional o uno personal." : undefined}
                  {...campo("email")}
                />
                <div>
                  <PasswordInput label="Contraseña" autoComplete="new-password" required {...campo("contrasena")} />
                  <ul aria-label="Requisitos de la contraseña" className="mt-3 flex flex-col gap-1.5">
                    <ReglaContrasena cumplida={reglas.largo} texto="Al menos 8 caracteres" />
                    <ReglaContrasena cumplida={reglas.letra} texto="Al menos una letra" />
                    <ReglaContrasena cumplida={reglas.numero} texto="Al menos un número" />
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button variante="ghost" onClick={() => setPaso(0)} iconoIzquierda={<ArrowLeft aria-hidden="true" className="size-4" />}>
                  Volver
                </Button>
                <Button type="submit" cargando={enviando}>
                  {enviando ? "Creando cuenta…" : "Crear cuenta"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}
