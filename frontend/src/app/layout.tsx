import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SkipLink } from "@/components/layout/SkipLink";
import { SCRIPT_TEMA } from "@/lib/theme/temaScript";

// Tipografías autoalojadas (SIL Open Font License, ver fonts/LICENCIAS.txt):
// no dependen de la red ni de servicios externos al compilar o ejecutar.
const display = localFont({
  src: "./fonts/BricolageGrotesque-latin-wght.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const cuerpo = localFont({
  src: "./fonts/InstrumentSans-latin-wght.woff2",
  variable: "--font-instrument",
  weight: "400 700",
  display: "swap",
});

const mono = localFont({
  src: "./fonts/JetBrainsMono-latin-wght.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "UTN Match: tu primera experiencia real",
    template: "%s · UTN Match",
  },
  description:
    "UTN Match conecta a estudiantes de la UTN con proyectos acotados de empresas y cátedras, y recomienda los que mejor encajan con cada perfil.",
  applicationName: "UTN Match",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1021" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: el script del tema agrega data-theme antes de que React hidrate.
    <html
      lang="es-AR"
      suppressHydrationWarning
      // Next desactiva el scroll suave al cambiar de página (si no, cada navegación anima el salto).
      data-scroll-behavior="smooth"
      className={`${display.variable} ${cuerpo.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
