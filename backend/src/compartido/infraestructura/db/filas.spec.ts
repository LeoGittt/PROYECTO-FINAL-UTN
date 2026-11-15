import { describe, expect, it } from 'vitest';
import { aCamelCase, filaACamelCase } from './filas.js';

describe('aCamelCase', () => {
  it('convierte snake_case a camelCase', () => {
    expect(aCamelCase('id_usuario')).toBe('idUsuario');
    expect(aCamelCase('pct_con_recomendacion')).toBe('pctConRecomendacion');
    expect(aCamelCase('cv_url')).toBe('cvUrl');
  });

  it('deja igual las claves que no tienen guion bajo', () => {
    expect(aCamelCase('nombre')).toBe('nombre');
    expect(aCamelCase('idUsuario')).toBe('idUsuario');
  });
});

describe('filaACamelCase', () => {
  it('convierte todas las claves y conserva los valores', () => {
    const fecha = '2026-02-01T12:00:00.000Z';
    expect(
      filaACamelCase({ id_usuario: 7, fecha_registro: fecha, activo: true, descripcion: null }),
    ).toEqual({ idUsuario: 7, fechaRegistro: fecha, activo: true, descripcion: null });
  });
});
