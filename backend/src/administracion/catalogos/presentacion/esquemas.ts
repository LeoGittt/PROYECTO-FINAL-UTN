import { z } from 'zod';
import { textoOpcional } from '../../../compartido/infraestructura/http/esquemas-comunes.js';
import { crearDto } from '../../../compartido/infraestructura/http/validacion.js';
import { CATEGORIAS_TECNOLOGIA } from '../dominio/catalogo.js';

/** Cuerpo de `POST /admin/tecnologias` y `PUT /admin/tecnologias/:id`. */
export const tecnologiaEsquema = z.object({
  nombre: z.string().trim().min(1).max(60),
  categoria: z.enum(CATEGORIAS_TECNOLOGIA),
  descripcion: textoOpcional(300),
});
export class TecnologiaDatosDto extends crearDto(tecnologiaEsquema) {}

/** Consulta de `GET /catalogos/materias?idCarrera=`. */
export const materiasConsultaEsquema = z.object({
  idCarrera: z.coerce.number().int().min(1).optional(),
});
export class MateriasConsultaDto extends crearDto(materiasConsultaEsquema) {}
