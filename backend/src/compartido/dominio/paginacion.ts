/** Lista paginada según docs/api/CONTRATO.md, sección 1. */
export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}

export const TAMANO_PAGINA_POR_DEFECTO = 20;
export const TAMANO_PAGINA_MAXIMO = 100;

export interface ParametrosPagina {
  pagina?: number;
  tamano?: number;
}

export interface PaginacionNormalizada {
  pagina: number;
  tamano: number;
  /** Cantidad de filas a saltear (`OFFSET`). */
  desplazamiento: number;
}

/** Aplica los valores por defecto y los límites a los parámetros `pagina` y `tamano`. */
export function normalizarPaginacion(
  parametros: ParametrosPagina = {},
): PaginacionNormalizada {
  const pagina = entero(parametros.pagina, 1, 1);
  const tamano = Math.min(
    entero(parametros.tamano, TAMANO_PAGINA_POR_DEFECTO, 1),
    TAMANO_PAGINA_MAXIMO,
  );
  return { pagina, tamano, desplazamiento: (pagina - 1) * tamano };
}

export function armarPagina<T>(
  items: T[],
  total: number,
  paginacion: PaginacionNormalizada,
): Pagina<T> {
  return {
    items,
    total,
    pagina: paginacion.pagina,
    tamano: paginacion.tamano,
  };
}

function entero(valor: number | undefined, porDefecto: number, minimo: number) {
  if (valor === undefined || !Number.isFinite(valor)) return porDefecto;
  return Math.max(minimo, Math.trunc(valor));
}
