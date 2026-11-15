import { z } from 'zod';

/** Un campo opcional que llega como texto vacío (típico de un formulario) se trata como ausente. */
const vacioANulo = (valor: unknown): unknown =>
  typeof valor === 'string' && valor.trim() === '' ? null : valor;

/** Texto opcional: recortado, de hasta `maximo` caracteres; vacío o ausente => `null`. */
export const textoOpcional = (maximo: number) =>
  z.preprocess(vacioANulo, z.string().trim().max(maximo).nullable().default(null));

/**
 * URL `http` o `https`. Se descarta cualquier otro esquema (`javascript:`, `data:`, `file:`...)
 * porque estos enlaces se muestran a otras personas como un `<a href>`.
 */
export const urlHttp = z.url({ protocol: /^https?$/ }).max(300);

/** URL opcional; vacía o ausente => `null`. */
export const urlOpcional = () =>
  z.preprocess(vacioANulo, urlHttp.nullable().default(null));

/** Identificador numérico (entero positivo). */
export const idEsquema = z.number().int().min(1);

/** Lista de identificadores sin repetidos. */
export const idsSinRepetidosEsquema = z
  .array(idEsquema)
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'No puede haber elementos repetidos',
  });
