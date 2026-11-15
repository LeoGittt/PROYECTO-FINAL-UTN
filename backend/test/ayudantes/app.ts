import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import {
  cargarConfiguracion,
  type Configuracion,
} from '../../src/compartido/infraestructura/configuracion/configuracion.js';
import { DB, type Db } from '../../src/compartido/infraestructura/db/db.js';
import { configurarAplicacion } from '../../src/configurar-aplicacion.js';

/** Contraseña de todos los usuarios de `seed.sql`. */
export const CONTRASENA_SEMILLA = 'UtnMatch2026!';

export const USUARIOS_SEMILLA = {
  administrador: 'admin@utnmatch.test',
  empresa: 'martin.paz@andessoftware.test',
  docente: 'silvia.morales@docentes.utnmatch.test',
  estudiante: 'lucia.fernandez@alumnos.utnmatch.test',
} as const;

/**
 * Configuración de pruebas: PGlite en memoria, bcrypt barato y sin límite de pedidos
 * (salvo que una prueba lo pida). Ninguna prueba depende de un puerto ni de variables de entorno.
 */
export function configuracionDePrueba(
  variables: Record<string, string> = {},
): Configuracion {
  return cargarConfiguracion({
    NODE_ENV: 'test',
    JWT_SECRET: 'secreto-de-pruebas-que-no-es-secreto-1234567890',
    BCRYPT_COST: '4',
    RATE_LIMIT_AUTH_MAX: '100000',
    FRONTEND_URL: 'http://localhost:3000',
    ...variables,
  });
}

export interface AppDePrueba {
  app: INestApplication;
  configuracion: Configuracion;
  db: Db;
  eventos: EventEmitter2;
  /** Un cliente HTTP nuevo contra la aplicación (sin abrir un puerto fijo). */
  http(): ReturnType<typeof request>;
  cerrar(): Promise<void>;
}

/** Arranca la aplicación real sobre PGlite en memoria, con `schema.sql` y `seed.sql` aplicados. */
export async function crearAppDePrueba(
  variables: Record<string, string> = {},
): Promise<AppDePrueba> {
  const configuracion = configuracionDePrueba(variables);
  const modulo = await Test.createTestingModule({
    imports: [AppModule.registrar(configuracion)],
  }).compile();
  const app = modulo.createNestApplication();
  configurarAplicacion(app, configuracion);
  await app.init();
  return {
    app,
    configuracion,
    db: app.get<Db>(DB, { strict: false }),
    eventos: app.get(EventEmitter2),
    http: () => request(app.getHttpServer()),
    cerrar: () => app.close(),
  };
}

/** Inicia sesión y devuelve el token. */
export async function iniciarSesion(
  http: ReturnType<typeof request>,
  email: string,
  contrasena: string = CONTRASENA_SEMILLA,
): Promise<string> {
  const respuesta = await http
    .post('/api/auth/login')
    .send({ email, contrasena })
    .expect(200);
  return respuesta.body.token as string;
}

/** `Authorization: Bearer <token>` para pasar a `.set(...)`. */
export function conSesion(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

let contador = 0;

/** Un email que no existe en el seed ni en otras pruebas del mismo archivo. */
export function emailUnico(prefijo = 'usuario'): string {
  contador += 1;
  return `${prefijo}.${Date.now().toString(36)}${contador}@prueba.test`;
}

/** Registra una persona nueva y devuelve su sesión. */
export async function registrarUsuario(
  http: ReturnType<typeof request>,
  rol: 'estudiante' | 'empresa' | 'docente',
  datos: Partial<{ nombre: string; apellido: string; email: string; contrasena: string }> = {},
): Promise<{
  token: string;
  usuario: { idUsuario: number; email: string; rol: string; perfilCompleto: boolean };
  email: string;
}> {
  const email = datos.email ?? emailUnico(rol);
  const respuesta = await http
    .post('/api/auth/registro')
    .send({
      nombre: datos.nombre ?? 'Persona',
      apellido: datos.apellido ?? 'De Prueba',
      email,
      contrasena: datos.contrasena ?? 'Clave1234',
      rol,
    })
    .expect(201);
  return { ...respuesta.body, email };
}
