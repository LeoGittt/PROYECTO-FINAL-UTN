import { z } from 'zod';
import { ROLES, ROLES_REGISTRABLES } from '../compartido/dominio/seguridad.js';
import { booleanoQuery } from '../compartido/infraestructura/http/esquemas-comunes.js';
import { crearDto, paginacionEsquema } from '../compartido/infraestructura/http/validacion.js';
import { contrasenaNuevaEsquema, registroEsquema } from '../perfiles/presentacion/esquemas.js';
import { ESTADOS_PROYECTO } from '../proyectos/esquemas.js';

export class ListarUsuariosQuery extends crearDto(
  paginacionEsquema.extend({
    rol: z.enum(ROLES).optional(),
    activo: booleanoQuery.optional(),
    q: z.string().trim().min(1).max(100).optional(),
  }),
) {}

/** Para hacer administrador a alguien está `POST /admin/administradores`. */
export class ActualizarUsuarioDto extends crearDto(
  z
    .object({ activo: z.boolean().optional(), rol: z.enum(ROLES_REGISTRABLES).optional() })
    .refine((cambios) => cambios.activo !== undefined || cambios.rol !== undefined, {
      message: 'Indique activo o rol',
    }),
) {}

export class CrearAdministradorDto extends crearDto(registroEsquema.omit({ rol: true })) {}

export class RestablecerContrasenaDto extends crearDto(z.object({ contrasenaNueva: contrasenaNuevaEsquema })) {}

export class ProyectosAdminQuery extends crearDto(z.object({ estado: z.enum(ESTADOS_PROYECTO).optional() })) {}

export class SuspenderProyectoDto extends crearDto(z.object({ motivo: z.string().trim().min(1).max(200) })) {}
