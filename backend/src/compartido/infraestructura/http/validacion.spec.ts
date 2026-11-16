import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ErrorValidacion } from '../../dominio/errores.js';
import {
  crearDto,
  paginacionEsquema,
  ParseIdPipe,
  PipeValidacion,
  validar,
} from './validacion.js';
import {
  idsSinRepetidosEsquema,
  textoOpcional,
  urlOpcional,
} from './esquemas-comunes.js';

function capturar(fn: () => unknown): ErrorValidacion {
  try {
    fn();
  } catch (error) {
    return error as ErrorValidacion;
  }
  throw new Error('Se esperaba un ErrorValidacion y no se lanzó nada');
}

describe('validar', () => {
  const esquema = z.object({
    nombre: z.string().min(1).max(5),
    edad: z.number().int().min(18),
    email: z.email(),
    rol: z.enum(['a', 'b']),
    lista: z.array(z.string()).min(1),
    anidado: z.object({ valor: z.number() }),
  });

  it('devuelve los datos convertidos cuando son válidos', () => {
    const datos = { nombre: 'Ana', edad: 20, email: 'a@b.co', rol: 'a', lista: ['x'], anidado: { valor: 1 } };
    expect(validar(esquema, datos)).toEqual(datos);
  });

  it('informa un detalle en español por cada campo inválido, con la ruta del campo', () => {
    const error = capturar(() =>
      validar(esquema, {
        nombre: '',
        edad: 17,
        email: 'no-es-email',
        rol: 'c',
        lista: [],
        anidado: { valor: 'x' },
      }),
    );
    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(error.message).toBe('Los datos enviados no son válidos');
    expect(error.detalles).toEqual([
      { campo: 'nombre', mensaje: 'No puede estar vacío' },
      { campo: 'edad', mensaje: 'Debe ser mayor o igual a 18' },
      { campo: 'email', mensaje: 'Debe ser un email válido' },
      { campo: 'rol', mensaje: 'Valor no permitido. Opciones: a, b' },
      { campo: 'lista', mensaje: 'Debe incluir al menos 1 elemento' },
      { campo: 'anidado.valor', mensaje: 'Debe ser un número' },
    ]);
  });

  it('dice "Es obligatorio" cuando falta un campo y "Debe ser un texto" si el tipo no es el esperado', () => {
    const error = capturar(() => validar(z.object({ a: z.string(), b: z.string() }), { b: 5 }));
    expect(error.detalles).toEqual([
      { campo: 'a', mensaje: 'Es obligatorio' },
      { campo: 'b', mensaje: 'Debe ser un texto' },
    ]);
  });

  it('un campo de opciones que falta es "Es obligatorio"; uno con un valor ajeno lista las opciones', () => {
    const error = capturar(() => validar(z.object({ rol: z.enum(['a', 'b']) }), {}));
    expect(error.detalles).toEqual([{ campo: 'rol', mensaje: 'Es obligatorio' }]);
    const ajeno = capturar(() => validar(z.object({ rol: z.enum(['a', 'b']) }), { rol: 'c' }));
    expect(ajeno.detalles).toEqual([{ campo: 'rol', mensaje: 'Valor no permitido. Opciones: a, b' }]);
  });

  it('usa "cuerpo" como campo cuando el problema es del objeto completo', () => {
    const error = capturar(() => validar(z.object({ a: z.string() }), 'texto'));
    expect(error.detalles[0].campo).toBe('cuerpo');
  });

  it('respeta los mensajes que declara el propio esquema', () => {
    const error = capturar(() =>
      validar(z.object({ clave: z.string().min(8, 'Mensaje propio') }), { clave: 'x' }),
    );
    expect(error.detalles[0].mensaje).toBe('Mensaje propio');
  });
});

describe('crearDto y PipeValidacion', () => {
  const esquema = z.object({ n: z.coerce.number().int().default(7) });
  class MiDto extends crearDto(esquema) {}
  const pipe = new PipeValidacion();

  it('valida y convierte los parámetros cuyo tipo es un DTO', () => {
    expect(pipe.transform({ n: '3' }, { type: 'query', metatype: MiDto })).toEqual({ n: 3 });
    expect(pipe.transform(undefined, { type: 'body', metatype: MiDto })).toEqual({ n: 7 });
  });

  it('responde ErrorValidacion cuando los datos no sirven', () => {
    expect(() =>
      pipe.transform({ n: 'abc' }, { type: 'body', metatype: MiDto }),
    ).toThrow(ErrorValidacion);
  });

  it('deja pasar lo que no es un DTO ni un parámetro común', () => {
    expect(pipe.transform('7', { type: 'param', metatype: Number })).toBe('7');
    expect(pipe.transform({ x: 1 }, { type: 'custom', metatype: MiDto })).toEqual({ x: 1 });
  });
});

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('convierte un entero positivo', () => {
    expect(pipe.transform('42', { type: 'param', data: 'id' })).toBe(42);
  });

  it.each(['0', '-1', '1.5', 'abc', '', '1e3', '99999999999999999999'])(
    'rechaza %j con 400 y el nombre del parámetro',
    (valor) => {
      const error = capturar(() => pipe.transform(valor, { type: 'param', data: 'idProyecto' }));
      expect(error.detalles).toEqual([
        { campo: 'idProyecto', mensaje: 'Debe ser un número entero positivo' },
      ]);
    },
  );
});

describe('esquemas comunes', () => {
  it('paginacionEsquema aplica los valores por defecto y convierte los números de la URL', () => {
    expect(paginacionEsquema.parse({})).toEqual({ pagina: 1, tamano: 20 });
    expect(paginacionEsquema.parse({ pagina: '2', tamano: '50' })).toEqual({ pagina: 2, tamano: 50 });
    expect(() => paginacionEsquema.parse({ tamano: '101' })).toThrow();
    expect(() => paginacionEsquema.parse({ pagina: '0' })).toThrow();
  });

  it('textoOpcional recorta, convierte vacío en null y respeta el máximo', () => {
    const esquema = z.object({ t: textoOpcional(5) });
    expect(esquema.parse({ t: '  hola ' })).toEqual({ t: 'hola' });
    expect(esquema.parse({ t: '   ' })).toEqual({ t: null });
    expect(esquema.parse({})).toEqual({ t: null });
    expect(esquema.parse({ t: null })).toEqual({ t: null });
    expect(() => esquema.parse({ t: 'demasiado' })).toThrow();
  });

  it('urlOpcional acepta solo http y https', () => {
    const esquema = z.object({ u: urlOpcional() });
    expect(esquema.parse({ u: 'https://github.com/x' })).toEqual({ u: 'https://github.com/x' });
    expect(esquema.parse({ u: 'http://sitio.test' })).toEqual({ u: 'http://sitio.test' });
    expect(esquema.parse({ u: '' })).toEqual({ u: null });
    for (const peligrosa of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'ftp://x.test', 'no es una url']) {
      expect(() => esquema.parse({ u: peligrosa }), peligrosa).toThrow();
    }
  });

  it('idsSinRepetidosEsquema rechaza repetidos', () => {
    expect(idsSinRepetidosEsquema.parse([1, 2, 3])).toEqual([1, 2, 3]);
    expect(() => idsSinRepetidosEsquema.parse([1, 1])).toThrow();
    expect(() => idsSinRepetidosEsquema.parse([0])).toThrow();
  });
});
