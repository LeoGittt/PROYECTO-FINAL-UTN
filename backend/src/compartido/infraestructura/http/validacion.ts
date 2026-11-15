import {
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';
import {
  ErrorValidacion,
  type DetalleError,
} from '../../dominio/errores.js';
import { mensajeDeValidacion } from './mensajes-zod.js';

/**
 * Validación de entrada con zod. Convención de todo el backend:
 *  - cada cuerpo o consulta se describe con un esquema zod y un DTO creado con `crearDto`;
 *  - el controlador declara `@Body() dto: MiDto` y el `PipeValidacion` global valida y
 *    entrega el objeto ya convertido (o responde 400 con `details`);
 *  - las reglas que dependen del contexto (por ejemplo, el rol) usan `validar` directamente.
 */

const NOMBRE_CAMPO_GENERAL = 'cuerpo';

/** Valida `datos` con `esquema`. Lanza `ErrorValidacion` (400) con un detalle por campo. */
export function validar<T extends z.ZodType>(
  esquema: T,
  datos: unknown,
): z.output<T> {
  const resultado = esquema.safeParse(datos, { error: mensajeDeValidacion });
  if (resultado.success) return resultado.data;
  throw new ErrorValidacion(
    'Los datos enviados no son válidos',
    detallesDeZod(resultado.error),
  );
}

export function detallesDeZod(error: z.ZodError): DetalleError[] {
  return error.issues.map((incidencia) => ({
    campo: incidencia.path.map(String).join('.') || NOMBRE_CAMPO_GENERAL,
    mensaje: incidencia.message,
  }));
}

/**
 * Crea la clase base de un DTO a partir de un esquema:
 * `class RegistroDto extends crearDto(registroEsquema) {}`.
 */
export function crearDto<T extends z.ZodType>(esquema: T) {
  abstract class DtoValidable {
    static readonly esquema: T = esquema;
  }
  return DtoValidable as unknown as {
    new (): z.output<T>;
    readonly esquema: T;
  };
}

/** Pipe global: valida los parámetros cuyo tipo es un DTO creado con `crearDto`. */
@Injectable()
export class PipeValidacion implements PipeTransform {
  transform(valor: unknown, metadatos: ArgumentMetadata): unknown {
    if (metadatos.type === 'custom') return valor;
    const esquema = (metadatos.metatype as { esquema?: z.ZodType } | undefined)
      ?.esquema;
    if (!esquema) return valor;
    return validar(esquema, valor ?? {});
  }
}

/** Convierte un parámetro de ruta (`:id`) en un entero positivo. */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(valor: string, metadatos: ArgumentMetadata): number {
    const id = Number(valor);
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id < 1) {
      throw new ErrorValidacion('El identificador no es válido', [
        {
          campo: metadatos.data ?? 'id',
          mensaje: 'Debe ser un número entero positivo',
        },
      ]);
    }
    return id;
  }
}

/** Esquema de los parámetros `?pagina=1&tamano=20` (CONTRATO.md, sección 1). */
export const paginacionEsquema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(20),
});
