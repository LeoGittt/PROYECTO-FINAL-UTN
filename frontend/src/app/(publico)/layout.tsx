import { Footer } from "@/components/layout/Footer";
import { PublicHeader } from "@/components/layout/PublicHeader";

const ANCLAS = [
  { href: "/#como-funciona", etiqueta: "Cómo funciona" },
  { href: "/#compatibilidad", etiqueta: "Compatibilidad" },
  { href: "/#para-quien", etiqueta: "Para quién" },
];

/** Páginas públicas: portada, login y registro. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader anclas={ANCLAS} />
      <main id="contenido" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
