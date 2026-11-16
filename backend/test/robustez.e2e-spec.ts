import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AppDePrueba,
  conSesion,
  crearAppDePrueba,
  CONTRASENA_SEMILLA,
  emailUnico,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';

/** Defectos encontrados por la verificación independiente de la base del backend. */
describe('Robustez de la API (e2e)', () => {
  let t: AppDePrueba;
  let idAdmin: number;
  let tokenAdmin: string;
  let jwt: JwtService;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    jwt = new JwtService({ secret: t.configuracion.seguridad.jwtSecreto });
    const login = await t
      .http()
      .post('/api/auth/login')
      .send({ email: USUARIOS_SEMILLA.administrador, contrasena: CONTRASENA_SEMILLA })
      .expect(200);
    idAdmin = login.body.usuario.idUsuario;
    tokenAdmin = login.body.token;
  });
  afterAll(async () => {
    await t.cerrar();
  });

  describe('texto con un byte NUL', () => {
    it('el login responde 400 y no 500', async () => {
      const respuesta = await t
        .http()
        .post('/api/auth/login')
        .send({ email: 'a\u0000b@prueba.test', contrasena: 'Clave1234' })
        .expect(400);
      expect(respuesta.body.message).toBe('El texto contiene caracteres no válidos');
    });

    it('el registro responde 400 y no crea la cuenta', async () => {
      const email = emailUnico('nul');
      await t
        .http()
        .post('/api/auth/registro')
        .send({ nombre: 'An\u0000a', apellido: 'Paz', email, contrasena: 'Clave1234', rol: 'estudiante' })
        .expect(400);
      const { rows } = await t.db.query('SELECT 1 FROM usuario WHERE email = $1', [email]);
      expect(rows).toHaveLength(0);
    });

    it('el alta de una tecnología responde 400', async () => {
      await t
        .http()
        .post('/api/admin/tecnologias')
        .set(conSesion(tokenAdmin))
        .send({ nombre: 'Ru\u0000st', categoria: 'lenguaje' })
        .expect(400);
    });
  });

  describe('validación del token', () => {
    const firmar = (payload: object, opciones: { expiresIn?: number } = {}) =>
      jwt.signAsync(payload, opciones);

    it('acepta un token propio con sub canónico y vencimiento (control)', async () => {
      const token = await firmar({ sub: String(idAdmin), rol: 'administrador' }, { expiresIn: 3600 });
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
    });

    it.each(['1e0', '01', ' 1', '0x1', '1.0', '-1', '0'])(
      'rechaza un sub no canónico (%j)',
      async (sub) => {
        const token = await firmar({ sub, rol: 'administrador' }, { expiresIn: 3600 });
        await t.http().get('/api/auth/yo').set(conSesion(token)).expect(401);
      },
    );

    it('rechaza un token que no vence', async () => {
      const token = await firmar({ sub: String(idAdmin), rol: 'administrador' });
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(401);
    });
  });

  it('las respuestas de la API no se guardan en caché', async () => {
    const respuesta = await t.http().get('/api/auth/yo').set(conSesion(tokenAdmin)).expect(200);
    expect(respuesta.headers['cache-control']).toBe('no-store');
  });
});
