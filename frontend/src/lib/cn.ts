/** Une clases CSS ignorando valores vacíos o falsos. */
export function cn(...partes: (string | false | null | undefined)[]): string {
  return partes.filter(Boolean).join(" ");
}
