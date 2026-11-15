import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import type { ErrorValidacion } from '../../../compartido/dominio/errores.js';
import { validar } from '../../../compartido/infraestructura/http/validacion.js';
import { CATEGORIAS_TECNOLOGIA } from '../dominio/catalogo.js';
import { materiasConsultaEsquema, tecnologiaEsquema } from './esquemas.js';

function camposInvalidos(esquema: z.ZodType, datos: unknown): string[] {
  try {
    validar(esquema, datos);
  } catch (error) {
    return (error as ErrorValidacion).detalles.map((d) => d.campo);
  }
  return [];
}

describe('tecnologiaEsquema', () => {
  it('acepta una tecnología válida y recorta el nombre', () => {
    expect(
      validar(tecnologiaEsquema, { nombre: '  Rust ', categoria: 'lenguaje' }),
    ).toEqual({ nombre: 'Rust', categoria: 'lenguaje', descripcion: null });
  });

  it.each(CATEGORIAS_TECNOLOGIA)('acepta la categoría %s', (categoria) => {
    expect(camposInvalidos(tecnologiaEsquema, { nombre: 'X', categoria })).toEqual([]);
  });

  it('rechaza una categoría inventada y un nombre vacío', () => {
    expect(camposInvalidos(tecnologiaEsquema, { nombre: '  ', categoria: 'magia' })).toEqual([
      'nombre',
      'categoria',
    ]);
  });

  it('limita nombre y descripción', () => {
    expect(
      camposInvalidos(tecnologiaEsquema, {
        nombre: 'x'.repeat(61),
        categoria: 'lenguaje',
        descripcion: 'y'.repeat(301),
      }),
    ).toEqual(['nombre', 'descripcion']);
  });
});

describe('materiasConsultaEsquema', () => {
  it('idCarrera es opcional y se convierte desde el texto de la URL', () => {
    expect(validar(materiasConsultaEsquema, {})).toEqual({});
    expect(validar(materiasConsultaEsquema, { idCarrera: '2' })).toEqual({ idCarrera: 2 });
  });

  it.each(['abc', '0', '-1', '1.5'])('rechaza idCarrera=%s', (valor) => {
    expect(camposInvalidos(materiasConsultaEsquema, { idCarrera: valor })).toEqual(['idCarrera']);
  });
});
