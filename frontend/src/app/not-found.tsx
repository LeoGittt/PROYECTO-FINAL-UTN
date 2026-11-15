import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/layout/Logo";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-10">
          <Logo />
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="bg-grid flex flex-1 items-center justify-center px-4 py-16 outline-none">
        <div className="max-w-lg text-center">
          <p className="label-mono text-subtle">Error 404</p>
          <p aria-hidden="true" className="mt-2 font-display text-8xl font-extrabold leading-none tracking-tighter text-primary sm:text-9xl">
            404
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold">Esta página no existe (todavía)</h1>
          <p className="mt-3 text-muted">
            Puede que el enlace esté mal escrito o que la sección todavía no esté disponible. Volvé al inicio o a tu panel
            y seguí desde ahí.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/" iconoIzquierda={<Compass aria-hidden="true" className="size-4" />}>
              Ir al inicio
            </Button>
            <Button href="/panel" variante="secondary">
              Ir a mi panel
            </Button>
          </div>
        </div>
      </main>
      <Footer compacto />
    </div>
  );
}
