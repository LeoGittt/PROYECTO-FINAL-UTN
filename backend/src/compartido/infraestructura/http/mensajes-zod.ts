import type { z } from 'zod';

type Incidencia = z.core.$ZodRawIssue;

/**
 * Mensajes de validación en español para el usuario. Se pasa como `error` a `safeParse`
 * (ver `validacion.ts`); los mensajes que un esquema declara por su cuenta tienen prioridad.
 */
export function mensajeDeValidacion(incidencia: Incidencia): string {
  const datos = incidencia as Record<string, unknown>;
  const origen = datos.origin as string | undefined;
  const minimo = datos.minimum as number | bigint | undefined;
  const maximo = datos.maximum as number | bigint | undefined;

  switch (incidencia.code) {
    case 'invalid_type': {
      if (incidencia.input === undefined || incidencia.input === null) {
        return 'Es obligatorio';
      }
      const esperado = datos.expected as string | undefined;
      if (esperado === 'string') return 'Debe ser un texto';
      if (esperado === 'number' || esperado === 'int') return 'Debe ser un número';
      if (esperado === 'boolean') return 'Debe ser verdadero o falso';
      if (esperado === 'array') return 'Debe ser una lista';
      if (esperado === 'object') return 'Debe ser un objeto';
      return 'El tipo de dato no es válido';
    }
    case 'too_small':
      if (origen === 'string') {
        return minimo === 1
          ? 'No puede estar vacío'
          : `Debe tener al menos ${minimo} caracteres`;
      }
      if (origen === 'array' || origen === 'set') {
        return `Debe incluir al menos ${minimo} elemento${minimo === 1 ? '' : 's'}`;
      }
      return datos.inclusive === false
        ? `Debe ser mayor que ${minimo}`
        : `Debe ser mayor o igual a ${minimo}`;
    case 'too_big':
      if (origen === 'string') return `Debe tener como máximo ${maximo} caracteres`;
      if (origen === 'array' || origen === 'set') {
        return `Puede incluir como máximo ${maximo} elemento${maximo === 1 ? '' : 's'}`;
      }
      return datos.inclusive === false
        ? `Debe ser menor que ${maximo}`
        : `Debe ser menor o igual a ${maximo}`;
    case 'invalid_format':
      if (datos.format === 'email') return 'Debe ser un email válido';
      if (datos.format === 'url') return 'Debe ser una URL válida que empiece con http:// o https://';
      return 'El formato no es válido';
    case 'invalid_value': {
      // Un campo de opciones (enum) que falta es "obligatorio", no "valor no permitido".
      if (incidencia.input === undefined || incidencia.input === null) {
        return 'Es obligatorio';
      }
      const valores = datos.values as unknown[] | undefined;
      return valores && valores.length > 0
        ? `Valor no permitido. Opciones: ${valores.join(', ')}`
        : 'Valor no permitido';
    }
    case 'not_multiple_of':
      return `Debe ser múltiplo de ${datos.divisor}`;
    case 'unrecognized_keys':
      return 'Contiene campos que no se reconocen';
    default:
      return 'El valor no es válido';
  }
}
