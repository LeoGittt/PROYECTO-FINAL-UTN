import { describe, expect, it } from 'vitest';
import {
  armarPagina,
  normalizarPaginacion,
  TAMANO_PAGINA_MAXIMO,
} from './paginacion.js';

describe('normalizarPaginacion', () => {
  it('usa pagina 1 y tamaño 20 por defecto', () => {
    expect(normalizarPaginacion()).toEqual({ pagina: 1, tamano: 20, desplazamiento: 0 });
  });

  it('calcula el desplazamiento de la página pedida', () => {
    expect(normalizarPaginacion({ pagina: 3, tamano: 10 })).toEqual({
      pagina: 3,
      tamano: 10,
      desplazamiento: 20,
    });
  });

  it('limita el tamaño al máximo permitido', () => {
    expect(normalizarPaginacion({ tamano: 5000 }).tamano).toBe(TAMANO_PAGINA_MAXIMO);
  });

  it('corrige valores menores que 1 y no finitos', () => {
    expect(normalizarPaginacion({ pagina: 0, tamano: -4 })).toMatchObject({
      pagina: 1,
      tamano: 1,
    });
    expect(normalizarPaginacion({ pagina: Number.NaN, tamano: Infinity })).toMatchObject({
      pagina: 1,
      tamano: 20,
    });
  });
});

describe('armarPagina', () => {
  it('devuelve el formato de lista paginada del contrato', () => {
    const paginacion = normalizarPaginacion({ pagina: 2, tamano: 2 });
    expect(armarPagina(['c', 'd'], 5, paginacion)).toEqual({
      items: ['c', 'd'],
      total: 5,
      pagina: 2,
      tamano: 2,
    });
  });
});
