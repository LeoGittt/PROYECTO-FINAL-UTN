import { z } from 'zod';
import {
  idEsquema,
  idsSinRepetidosEsquema,
  textoOpcional,
} from '../compartido/infraestructura/http/esquemas-comunes.js';
import {
  crearDto,
  paginacionEsquema,
} from '../compartido/infraestructura/http/validacion.js';

// Coinciden con los tipos enumerados de schema.sql.
export const ESTADOS_PROYECTO = [
  'borrador',
  'publicado',
  'en_curso',
  'finalizado',
  'cancelado',
  'suspendido',
] as const;
export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number];
export const MODALIDADES = ['remoto', 'presencial', 'hibrido'] as const;
export const TIPOS_RETRIBUCION = ['remunerado', 'practica_profesional', 'certificado'] as const;

/** Los campos del alta y de la edición. Los rangos son los CHECK de la tabla `proyecto`. */
const datosProyectoEsquema = z.object({
  titulo: z.string().trim().min(1).max(150),
  descripcion: z.string().trim().min(1).max(5000),
  objetivos: textoOpcional(2000),
  perfilBuscado: textoOpcional(2000),
  duracionSemanas: z.number().int().min(1).max(52),
  horasSemanales: z.number().int().min(1).max(40),
  anioMinimo: z.number().int().min(1).max(6),
  cupos: z.number().int().min(1).max(20),
  modalidad: z.enum(MODALIDADES),
  tipoRetribucion: z.enum(TIPOS_RETRIBUCION),
  detalleRetribucion: textoOpcional(300),
  tecnologias: z
    .array(z.object({ idTecnologia: idEsquema, obligatoria: z.boolean() }))
    .max(50)
    .refine(
      (lista) => new Set(lista.map((t) => t.idTecnologia)).size === lista.length,
      { message: 'No puede haber tecnologías repetidas' },
    ),
  habilidades: idsSinRepetidosEsquema.default([]),
});
export type DatosProyecto = z.output<typeof datosProyectoEsquema>;

/** Alta: los mismos campos que la edición, más `publicar` (por defecto queda en borrador). */
export class CrearProyectoDto extends crearDto(
  datosProyectoEsquema.extend({ publicar: z.boolean().default(false) }),
) {}

/** Edición: reemplaza todos los campos. El estado no se cambia por acá. */
export class EditarProyectoDto extends crearDto(datosProyectoEsquema) {}

export class CambiarEstadoProyectoDto extends crearDto(
  z.object({ estado: z.enum(ESTADOS_PROYECTO) }),
) {}

export class ProyectosPropiosQuery extends crearDto(
  z.object({ estado: z.enum(ESTADOS_PROYECTO).optional() }),
) {}

/** `tecnologias=1,2` llega como texto: se lo convierte en una lista de identificadores (hasta 15 dígitos cada uno). */
const listaDeIds = z
  .string()
  .regex(/^\d{1,15}(,\d{1,15})*$/, 'Debe ser una lista de identificadores separados por comas')
  .transform((texto) => texto.split(',').map(Number));

export const busquedaEsquema = paginacionEsquema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  tecnologias: listaDeIds.optional(),
  modalidad: z.enum(MODALIDADES).optional(),
  tipoRetribucion: z.enum(TIPOS_RETRIBUCION).optional(),
  horasMax: z.coerce.number().int().min(1).max(40).optional(),
  anioMax: z.coerce.number().int().min(1).max(6).optional(),
});
export type FiltrosBusqueda = z.output<typeof busquedaEsquema>;
export class BuscarProyectosQuery extends crearDto(busquedaEsquema) {}
