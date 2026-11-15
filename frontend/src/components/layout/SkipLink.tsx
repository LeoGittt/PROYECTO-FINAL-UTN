/** Enlace para saltar la navegación e ir directo al contenido (primer elemento enfocable de la página). */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:font-semibold focus:text-on-accent focus:shadow-pop"
    >
      Saltar al contenido
    </a>
  );
}
