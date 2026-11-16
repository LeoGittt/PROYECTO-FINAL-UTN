import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  ErrorConflicto,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorProhibido,
  ErrorReglaNegocio,
  ErrorValidacion,
} from '../../dominio/errores.js';
import { construirRespuestaError } from './filtro-excepciones.js';

describe('construirRespuestaError', () => {
  it.each([
    [new ErrorValidacion('Datos inválidos'), 400, 'Bad Request'],
    [new ErrorNoAutenticado(), 401, 'Unauthorized'],
    [new ErrorProhibido(), 403, 'Forbidden'],
    [new ErrorNoEncontrado(), 404, 'Not Found'],
    [new ErrorConflicto('Duplicado'), 409, 'Conflict'],
    [new ErrorReglaNegocio('Regla'), 422, 'Unprocessable Entity'],
  ])('traduce %o al código HTTP del contrato', (error, statusCode, nombre) => {
    expect(construirRespuestaError(error)).toMatchObject({
      statusCode,
      error: nombre,
      message: error.message,
    });
  });

  it('incluye details solo cuando hay detalles', () => {
    const detalles = [{ campo: 'email', mensaje: 'Es obligatorio' }];
    expect(construirRespuestaError(new ErrorValidacion('x', detalles)).details).toEqual(detalles);
    expect('details' in construirRespuestaError(new ErrorNoEncontrado())).toBe(false);
  });

  it('las HttpException de Nest salen con un mensaje en español, no con el texto en inglés', () => {
    expect(construirRespuestaError(new NotFoundException('Cannot GET /api/x'))).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'El recurso solicitado no existe',
    });
    expect(construirRespuestaError(new ForbiddenException('Forbidden resource')).message).toBe(
      'No tiene permisos para realizar esta acción',
    );
    expect(construirRespuestaError(new HttpException('x', 429))).toMatchObject({
      statusCode: 429,
      message: 'Demasiadas solicitudes. Intente nuevamente en unos minutos',
    });
  });

  it('un JSON mal formado da 400 con un mensaje claro', () => {
    const jsonMalo = new BadRequestException("Expected property name or '}' in JSON at position 1");
    expect(construirRespuestaError(jsonMalo)).toMatchObject({
      statusCode: 400,
      message: 'El cuerpo de la solicitud no es un JSON válido',
    });
    expect(
      construirRespuestaError(Object.assign(new Error('x'), { status: 400, type: 'entity.parse.failed' })),
    ).toMatchObject({ statusCode: 400, message: 'El cuerpo de la solicitud no es un JSON válido' });
  });

  it('un cuerpo demasiado grande (error de body-parser) da 413', () => {
    const error = Object.assign(new Error('request entity too large'), { status: 413 });
    expect(construirRespuestaError(error)).toMatchObject({
      statusCode: 413,
      message: 'El cuerpo de la solicitud es demasiado grande',
    });
  });

  it('un error inesperado da 500 genérico y no filtra el mensaje interno ni el stack', () => {
    const error = new Error('password authentication failed for user "postgres" at 10.0.0.5');
    const cuerpo = construirRespuestaError(error);
    expect(cuerpo).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Ocurrió un error interno. Intente nuevamente más tarde',
    });
    expect(JSON.stringify(cuerpo)).not.toMatch(/postgres|10\.0\.0\.5|at /);
  });

  it('una violación de unicidad que nadie anticipó da 409', () => {
    const error = Object.assign(new Error('duplicate key value violates unique constraint "uq_x"'), {
      code: '23505',
      constraint: 'uq_x',
    });
    expect(construirRespuestaError(error)).toMatchObject({
      statusCode: 409,
      message: 'Ya existe un registro con esos datos',
    });
  });

  it('un error de clave foránea que nadie anticipó da 409 sin exponer el SQL', () => {
    const error = Object.assign(new Error('insert or update on table "x" violates foreign key'), {
      code: '23503',
    });
    const cuerpo = construirRespuestaError(error);
    expect(cuerpo.statusCode).toBe(409);
    expect(cuerpo.message).not.toMatch(/table|violates/);
  });

  it('un valor que no es un Error (por ejemplo un string lanzado) también da 500', () => {
    expect(construirRespuestaError('boom').statusCode).toBe(500);
    expect(construirRespuestaError(undefined).statusCode).toBe(500);
  });
});
