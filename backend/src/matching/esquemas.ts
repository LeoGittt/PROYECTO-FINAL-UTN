import { z } from 'zod';
import { idEsquema, textoOpcional } from '../compartido/infraestructura/http/esquemas-comunes.js';
import { crearDto } from '../compartido/infraestructura/http/validacion.js';
import { ESTADOS_POSTULACION } from './estado-postulacion.js';

export class LimiteQuery extends crearDto(
  z.object({ limite: z.coerce.number().int().min(1).max(50).default(10) }),
) {}

export class CrearPostulacionDto extends crearDto(
  z.object({ idProyecto: idEsquema, mensajePresentacion: textoOpcional(2000) }),
) {}

export class EstadoPostulacionQuery extends crearDto(
  z.object({ estado: z.enum(ESTADOS_POSTULACION).optional() }),
) {}

export class CambiarEstadoPostulacionDto extends crearDto(
  z.object({ estado: z.enum(ESTADOS_POSTULACION) }),
) {}

export class CrearInvitacionDto extends crearDto(
  z.object({ idProyecto: idEsquema, idEstudiante: idEsquema, mensaje: textoOpcional(2000) }),
) {}

export class ResponderInvitacionDto extends crearDto(z.object({ aceptar: z.boolean() })) {}
