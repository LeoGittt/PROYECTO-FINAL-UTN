import { describe, expect, it } from 'vitest';
import { ErrorValidacion } from '../../compartido/dominio/errores.js';
import { exigirContrasenaValida, problemasDeContrasena } from './contrasena.js';

describe('problemasDeContrasena', () => {
  it.each(['UtnMatch2026!', 'abcdefg1', 'Contraseña1', '12345678a'])(
    'acepta %j',
    (contrasena) => {
      expect(problemasDeContrasena(contrasena)).toEqual([]);
    },
  );

  it('pide 8 caracteres como mínimo', () => {
    expect(problemasDeContrasena('abc1234')).toEqual(['Debe tener al menos 8 caracteres']);
  });

  it('pide al menos una letra', () => {
    expect(problemasDeContrasena('12345678')).toEqual(['Debe incluir al menos una letra']);
  });

  it('pide al menos un número', () => {
    expect(problemasDeContrasena('abcdefgh')).toEqual(['Debe incluir al menos un número']);
  });

  it('informa todos los problemas juntos', () => {
    expect(problemasDeContrasena('!!')).toEqual([
      'Debe tener al menos 8 caracteres',
      'Debe incluir al menos una letra',
      'Debe incluir al menos un número',
    ]);
  });

  it('bcrypt ignora lo que pasa de 72 bytes: se rechaza en vez de truncar en silencio', () => {
    expect(problemasDeContrasena(`${'a'.repeat(71)}1`)).toEqual([]);
    expect(problemasDeContrasena(`${'a'.repeat(72)}1`)).toEqual([
      'No puede superar los 72 bytes',
    ]);
    // 40 letras de 2 bytes son 80 bytes aunque tengan solo 41 caracteres.
    expect(problemasDeContrasena(`${'ñ'.repeat(40)}1`)).toEqual([
      'No puede superar los 72 bytes',
    ]);
  });
});

describe('exigirContrasenaValida', () => {
  it('no lanza si la contraseña cumple la política', () => {
    expect(() => exigirContrasenaValida('UtnMatch2026!')).not.toThrow();
  });

  it('lanza ErrorValidacion con un detalle por problema y el campo indicado', () => {
    try {
      exigirContrasenaValida('corta', 'contrasenaNueva');
      expect.unreachable('debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorValidacion);
      expect((error as ErrorValidacion).detalles).toEqual([
        { campo: 'contrasenaNueva', mensaje: 'Debe tener al menos 8 caracteres' },
        { campo: 'contrasenaNueva', mensaje: 'Debe incluir al menos un número' },
      ]);
    }
  });
});
