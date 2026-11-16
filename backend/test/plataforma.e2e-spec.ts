import { Logger } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  type AppDePrueba,
  conSesion,
  crearAppDePrueba,
  CONTRASENA_SEMILLA,
  iniciarSesion,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';

describe('Plataforma: salud, errores, cabeceras y CORS (e2e)', () => {
  let t: AppDePrueba;

  beforeAll(async () => {
    t = await crearAppDePrueba();
  });
  afterAll(async () => {
    await t.cerrar();
  });

  describe('GET /api/health', () => {
    it('es público y confirma que la API y la base de datos responden', async () => {
      const respuesta = await t.http().get('/api/health').expect(200);
      expect(respuesta.body).toEqual({ estado: 'ok', baseDeDatos: 'ok' });
    });

    it('si la base de datos no contesta responde 503 sin detalles internos', async () => {
      const consulta = vi.spyOn(t.db, 'query').mockRejectedValue(new Error('connection refused 10.0.0.9:5432'));
      try {
        const respuesta = await t.http().get('/api/health').expect(503);
        expect(respuesta.body).toEqual({ estado: 'error', baseDeDatos: 'error' });
      } finally {
        consulta.mockRestore();
      }
      await t.http().get('/api/health').expect(200);
    });
  });

  describe('formato de errores', () => {
    it('una ruta que no existe responde 404 en JSON, en español y sin pistas del framework', async () => {
      const respuesta = await t.http().get('/api/no-existe').expect(404);
      expect(respuesta.headers['content-type']).toMatch(/application\/json/);
      expect(respuesta.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'El recurso solicitado no existe',
      });
    });

    it('un JSON mal formado responde 400 sin stack trace', async () => {
      const respuesta = await t
        .http()
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": ')
        .expect(400);
      expect(respuesta.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'El cuerpo de la solicitud no es un JSON válido',
      });
      expect(JSON.stringify(respuesta.body)).not.toMatch(/at |node_modules|SyntaxError/);
    });

    it('un cuerpo demasiado grande responde 413', async () => {
      const respuesta = await t
        .http()
        .post('/api/auth/login')
        .send({ email: 'a@b.co', contrasena: 'x'.repeat(200_000) })
        .expect(413);
      expect(respuesta.body.message).toBe('El cuerpo de la solicitud es demasiado grande');
    });

    it('un error inesperado responde 500 genérico y no filtra el mensaje ni la ruta del código', async () => {
      const consulta = vi.spyOn(t.db, 'query').mockRejectedValue(
        new Error('password authentication failed for user "postgres" (C:\\secreto\\db.ts)'),
      );
      // El detalle completo va al log del servidor (y acá se captura para no ensuciar la salida).
      const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      try {
        const respuesta = await t.http().get('/api/catalogos/carreras').expect(500);
        expect(respuesta.body).toEqual({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Ocurrió un error interno. Intente nuevamente más tarde',
        });
        expect(String(log.mock.calls[0]?.[0])).toContain('password authentication failed');
      } finally {
        consulta.mockRestore();
        log.mockRestore();
      }
    });
  });

  describe('cabeceras de seguridad y CORS', () => {
    it('helmet agrega sus cabeceras y se oculta X-Powered-By', async () => {
      const respuesta = await t.http().get('/api/health').expect(200);
      expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
      expect(respuesta.headers['x-frame-options']).toBeDefined();
      expect(respuesta.headers['strict-transport-security']).toBeDefined();
      expect(respuesta.headers['x-powered-by']).toBeUndefined();
    });

    it('el origen del frontend queda autorizado', async () => {
      const respuesta = await t
        .http()
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);
      expect(respuesta.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('otro origen no recibe autorización CORS', async () => {
      const respuesta = await t
        .http()
        .get('/api/health')
        .set('Origin', 'https://sitio-malicioso.test')
        .expect(200);
      expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('la verificación previa (preflight) del frontend se acepta y la de otro origen no', async () => {
      const permitido = await t
        .http()
        .options('/api/perfil')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'PUT')
        .set('Access-Control-Request-Headers', 'authorization,content-type');
      expect(permitido.status).toBe(204);
      expect(permitido.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(permitido.headers['access-control-allow-methods']).toContain('PUT');

      const ajeno = await t
        .http()
        .options('/api/perfil')
        .set('Origin', 'https://sitio-malicioso.test')
        .set('Access-Control-Request-Method', 'PUT');
      expect(ajeno.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});

describe('Límite de pedidos en /api/auth (e2e)', () => {
  let t: AppDePrueba;

  beforeAll(async () => {
    t = await crearAppDePrueba({
      RATE_LIMIT_AUTH_MAX: '3',
      RATE_LIMIT_AUTH_WINDOW_SECONDS: '60',
    });
  });
  afterAll(async () => {
    await t.cerrar();
  });

  it('pasado el máximo, login y registro responden 429 en el formato del contrato; el resto de la API sigue andando', async () => {
    const intento = () =>
      t.http().post('/api/auth/login').send({ email: USUARIOS_SEMILLA.estudiante, contrasena: 'Incorrecta1' });

    // Este login cuenta como el primero de tres.
    const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante);
    // El frontend consulta /auth/yo en cada carga de página: no entra en el límite.
    for (let i = 0; i < 8; i += 1) {
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
    }

    await intento().expect(401);
    await intento().expect(401);
    const bloqueado = await intento().expect(429);
    expect(bloqueado.body).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Demasiadas solicitudes. Intente nuevamente en unos minutos',
    });

    // Un login correcto tampoco pasa mientras dura el bloqueo (es por IP, no por resultado).
    await t
      .http()
      .post('/api/auth/login')
      .send({ email: USUARIOS_SEMILLA.estudiante, contrasena: CONTRASENA_SEMILLA })
      .expect(429);
    // El registro tiene su propio contador (el límite es por IP y por endpoint).
    for (let i = 0; i < 3; i += 1) {
      await t.http().post('/api/auth/registro').send({}).expect(400);
    }
    await t.http().post('/api/auth/registro').send({}).expect(429);

    // Lo demás no se ve afectado.
    await t.http().get('/api/catalogos/carreras').expect(200);
    await t.http().get('/api/health').expect(200);
  });
});
