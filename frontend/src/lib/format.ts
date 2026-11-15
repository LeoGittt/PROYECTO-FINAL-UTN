/** Formatos para mostrar datos (es-AR). */

const LOCALE = "es-AR";

/** 0.824 -> "82 %". Devuelve "—" si no hay dato. */
export function formatearPorcentaje(valor: number | null | undefined): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "—";
  return `${Math.round(Math.min(1, Math.max(0, valor)) * 100)} %`;
}

export function formatearNumero(valor: number | null | undefined): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat(LOCALE).format(valor);
}

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" }).format(fecha);
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

/** Iniciales para avatares: "Ana María Pérez" -> "AP". */
export function iniciales(nombre: string, apellido?: string): string {
  const partes = [nombre, apellido ?? ""]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${primera}${ultima}`.toUpperCase();
}

/** Minúsculas y sin tildes, para buscar sin distinguir acentos. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
