/**
 * Mueve el foco al primer campo con error, en el orden visual del formulario.
 * Los controles se buscan por su atributo `name`.
 */
export function enfocarPrimerError(
  formulario: HTMLFormElement | null,
  orden: readonly string[],
  errores: Partial<Record<string, string>>,
): void {
  if (!formulario) return;
  for (const campo of orden) {
    if (!errores[campo]) continue;
    const control = formulario.elements.namedItem(campo);
    const elemento = control instanceof RadioNodeList ? control[0] : control;
    if (elemento instanceof HTMLElement) {
      elemento.focus();
      return;
    }
  }
}

/** Texto recortado, o `null` si queda vacío (para campos opcionales que el contrato admite como `null`). */
export function textoONull(valor: string): string | null {
  const recortado = valor.trim();
  return recortado === "" ? null : recortado;
}
