import axe from "axe-core";

/**
 * Problemas de accesibilidad (WCAG 2.1 A y AA) que axe detecta en lo que está renderizado.
 * El contraste de colores no se puede medir en jsdom (no aplica estilos): lo cubre
 * `lib/design/contraste.test.ts`. Devuelve una línea por regla, para que el error sea legible.
 */
export async function violacionesA11y(contenedor: Element = document.body): Promise<string[]> {
  const resultado = await axe.run(contenedor, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}
