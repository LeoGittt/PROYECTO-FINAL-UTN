import { z } from 'zod';
import { ROLES_REGISTRABLES } from '../../compartido/dominio/seguridad.js';
import {
  idEsquema,
  idsSinRepetidosEsquema,
  textoOpcional,
  urlOpcional,
} from '../../compartido/infraestructura/http/esquemas-comunes.js';
import { crearDto } from '../../compartido/infraestructura/http/validacion.js';
import { problemasDeContrasena } from '../dominio/contrasena.js';
import { NIVELES_TECNOLOGIA } from '../dominio/perfil.js';

const nombreEsquema = z.string().trim().min(1).max(80);
const emailEsquema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(160));

/** La política de contraseñas vive en el dominio; acá solo se traduce a incidencias de zod. */
export const contrasenaNuevaEsquema = z.string().superRefine((valor, contexto) => {
  for (const mensaje of problemasDeContrasena(valor)) {
    contexto.addIssue({ code: 'custom', message: mensaje });
  }
});

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

export const registroEsquema = z.object({
  nombre: nombreEsquema,
  apellido: nombreEsquema,
  email: emailEsquema,
  contrasena: contrasenaNuevaEsquema,
  rol: z.enum(ROLES_REGISTRABLES),
});
export class RegistroDto extends crearDto(registroEsquema) {}

export const loginEsquema = z.object({
  email: z.string().trim().min(1).max(160),
  contrasena: z.string().min(1).max(200),
});
export class LoginDto extends crearDto(loginEsquema) {}

// ---------------------------------------------------------------------------
// Perfiles (PUT /perfil: el esquema depende del rol)
// ---------------------------------------------------------------------------

export const perfilEstudianteEsquema = z.object({
  idCarrera: idEsquema,
  anioCursada: z.number().int().min(1).max(6),
  horasSemanales: z.number().int().min(1).max(60),
  descripcion: textoOpcional(2000),
  proyectosPrevios: textoOpcional(2000),
  cvUrl: urlOpcional(),
  githubUrl: urlOpcional(),
  portfolioUrl: urlOpcional(),
  tecnologias: z
    .array(
      z.object({
        idTecnologia: idEsquema,
        nivel: z.enum(NIVELES_TECNOLOGIA),
      }),
    )
    .max(100)
    .default([])
    .refine(
      (lista) =>
        new Set(lista.map((t) => t.idTecnologia)).size === lista.length,
      { message: 'No puede haber tecnologías repetidas' },
    ),
  habilidades: idsSinRepetidosEsquema.default([]),
  materiasAprobadas: idsSinRepetidosEsquema.default([]),
});

export const perfilEmpresaEsquema = z.object({
  nombreEmpresa: z.string().trim().min(1).max(150),
  sector: z.string().trim().min(1).max(100),
  descripcion: textoOpcional(2000),
  contacto: z.string().trim().min(1).max(150),
  sitioWeb: urlOpcional(),
});

export const perfilDocenteEsquema = z.object({
  catedra: z.string().trim().min(1).max(150),
  areaInvestigacion: textoOpcional(150),
  descripcion: textoOpcional(2000),
});
