import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AppDePrueba,
  conSesion,
  crearAppDePrueba,
  CONTRASENA_SEMILLA,
  emailUnico,
  iniciarSesion,
  registrarUsuario,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';

describe('Autenticación (e2e)', () => {
  let t: AppDePrueba;

  beforeAll(async () => {
    t = await crearAppDePrueba();
  });
  afterAll(async () => {
    await t.cerrar();
  });

  describe('POST /api/auth/registro', () => {
    it.each(['estudiante', 'empresa', 'docente'] as const)(
      'registra a una persona con rol %s y le abre sesión (201)',
      async (rol) => {
        const email = emailUnico(rol);
        const respuesta = await t
          .http()
          .post('/api/auth/registro')
          .send({ nombre: 'Ana', apellido: 'Paz', email, contrasena: 'Clave1234', rol })
          .expect(201);

        expect(typeof respuesta.body.token).toBe('string');
        expect(respuesta.body.usuario).toEqual({
          idUsuario: expect.any(Number),
          nombre: 'Ana',
          apellido: 'Paz',
          email,
          rol,
          activo: true,
          perfilCompleto: false,
        });
        // Nunca viaja el hash.
        expect(JSON.stringify(respuesta.body)).not.toMatch(/\$2[aby]\$|hash/i);
      },
    );

    it('guarda un hash bcrypt, no la contraseña, y el email en minúsculas', async () => {
      const email = emailUnico('hash');
      await t
        .http()
        .post('/api/auth/registro')
        .send({
          nombre: 'Ana',
          apellido: 'Paz',
          email: email.toUpperCase(),
          contrasena: 'Clave1234',
          rol: 'estudiante',
        })
        .expect(201);

      const { rows } = await t.db.query<{ email: string; contrasenaHash: string }>(
        `SELECT email, contrasena_hash FROM usuario WHERE email = $1`,
        [email],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].contrasenaHash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(rows[0].contrasenaHash).not.toContain('Clave1234');
    });

    it('el token emitido sirve para consultar GET /auth/yo', async () => {
      const { token, usuario } = await registrarUsuario(t.http(), 'estudiante');
      const respuesta = await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
      expect(respuesta.body).toEqual({ usuario, perfil: null });
    });

    it('rechaza registrarse como administrador (400)', async () => {
      const respuesta = await t
        .http()
        .post('/api/auth/registro')
        .send({
          nombre: 'Ana',
          apellido: 'Paz',
          email: emailUnico('admin'),
          contrasena: 'Clave1234',
          rol: 'administrador',
        })
        .expect(400);
      expect(respuesta.body.details).toEqual([
        { campo: 'rol', mensaje: expect.stringContaining('Valor no permitido') },
      ]);
    });

    it('rechaza un email que ya existe (409), sin distinguir mayúsculas', async () => {
      const { email } = await registrarUsuario(t.http(), 'empresa');
      for (const repetido of [email, email.toUpperCase()]) {
        const respuesta = await t
          .http()
          .post('/api/auth/registro')
          .send({
            nombre: 'Otra',
            apellido: 'Persona',
            email: repetido,
            contrasena: 'Clave1234',
            rol: 'docente',
          })
          .expect(409);
        expect(respuesta.body).toEqual({
          statusCode: 409,
          error: 'Conflict',
          message: 'Ya existe una cuenta registrada con ese email',
          details: [{ campo: 'email', mensaje: 'Ya está registrado' }],
        });
      }
      // El email del seed también cuenta.
      await t
        .http()
        .post('/api/auth/registro')
        .send({
          nombre: 'X',
          apellido: 'Y',
          email: USUARIOS_SEMILLA.administrador,
          contrasena: 'Clave1234',
          rol: 'docente',
        })
        .expect(409);
    });

    it('rechaza una contraseña que no cumple la política (400) y dice qué le falta', async () => {
      const respuesta = await t
        .http()
        .post('/api/auth/registro')
        .send({
          nombre: 'Ana',
          apellido: 'Paz',
          email: emailUnico('debil'),
          contrasena: 'corta',
          rol: 'estudiante',
        })
        .expect(400);
      expect(respuesta.body.message).toBe('Los datos enviados no son válidos');
      expect(respuesta.body.details).toEqual([
        { campo: 'contrasena', mensaje: 'Debe tener al menos 8 caracteres' },
        { campo: 'contrasena', mensaje: 'Debe incluir al menos un número' },
      ]);
    });

    it('con un cuerpo vacío informa cada campo faltante (400 con details)', async () => {
      const respuesta = await t.http().post('/api/auth/registro').send({}).expect(400);
      expect(respuesta.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Los datos enviados no son válidos',
        details: [
          { campo: 'nombre', mensaje: 'Es obligatorio' },
          { campo: 'apellido', mensaje: 'Es obligatorio' },
          { campo: 'email', mensaje: 'Es obligatorio' },
          { campo: 'contrasena', mensaje: 'Es obligatorio' },
          { campo: 'rol', mensaje: 'Es obligatorio' },
        ],
      });
    });

    it('rechaza un email mal formado (400)', async () => {
      const respuesta = await t
        .http()
        .post('/api/auth/registro')
        .send({ nombre: 'A', apellido: 'B', email: 'esto-no-es-un-email', contrasena: 'Clave1234', rol: 'docente' })
        .expect(400);
      expect(respuesta.body.details).toEqual([{ campo: 'email', mensaje: 'Debe ser un email válido' }]);
    });

    it('un registro inválido no deja nada guardado', async () => {
      const email = emailUnico('nada');
      await t
        .http()
        .post('/api/auth/registro')
        .send({ nombre: 'A', apellido: 'B', email, contrasena: 'x', rol: 'docente' })
        .expect(400);
      const { rows } = await t.db.query(`SELECT 1 FROM usuario WHERE email = $1`, [email]);
      expect(rows).toHaveLength(0);
    });
  });

  describe('POST /api/auth/login', () => {
    it.each(Object.entries(USUARIOS_SEMILLA))(
      'inicia sesión con el usuario semilla de rol %s (200)',
      async (rol, email) => {
        const respuesta = await t
          .http()
          .post('/api/auth/login')
          .send({ email, contrasena: CONTRASENA_SEMILLA })
          .expect(200);
        expect(respuesta.body.usuario).toMatchObject({ email, rol, activo: true, perfilCompleto: true });
        expect(typeof respuesta.body.token).toBe('string');
      },
    );

    it('no distingue mayúsculas ni espacios alrededor del email', async () => {
      await t
        .http()
        .post('/api/auth/login')
        .send({ email: `  ${USUARIOS_SEMILLA.estudiante.toUpperCase()} `, contrasena: CONTRASENA_SEMILLA })
        .expect(200);
    });

    it('con contraseña incorrecta responde 401 con un mensaje que no revela si el email existe', async () => {
      const conEmailReal = await t
        .http()
        .post('/api/auth/login')
        .send({ email: USUARIOS_SEMILLA.estudiante, contrasena: 'incorrecta123' })
        .expect(401);
      const conEmailInexistente = await t
        .http()
        .post('/api/auth/login')
        .send({ email: 'nadie@nunca.test', contrasena: 'incorrecta123' })
        .expect(401);
      expect(conEmailReal.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Email o contraseña incorrectos',
      });
      expect(conEmailInexistente.body).toEqual(conEmailReal.body);
    });

    it('con un usuario desactivado responde 403 solo si la contraseña es correcta', async () => {
      const { email } = await registrarUsuario(t.http(), 'estudiante', { contrasena: 'Clave1234' });
      await t.db.query(`UPDATE usuario SET activo = false WHERE email = $1`, [email]);

      const respuesta = await t
        .http()
        .post('/api/auth/login')
        .send({ email, contrasena: 'Clave1234' })
        .expect(403);
      expect(respuesta.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: expect.stringContaining('desactivada'),
      });

      // Con una contraseña incorrecta no se confirma ni que la cuenta existe.
      await t.http().post('/api/auth/login').send({ email, contrasena: 'Equivocada9' }).expect(401);
    });

    it('con el cuerpo vacío responde 400 con details', async () => {
      const respuesta = await t.http().post('/api/auth/login').send({}).expect(400);
      expect(respuesta.body.details).toEqual([
        { campo: 'email', mensaje: 'Es obligatorio' },
        { campo: 'contrasena', mensaje: 'Es obligatorio' },
      ]);
    });
  });

  describe('GET /api/auth/yo y el guard de acceso', () => {
    it('devuelve el usuario y su perfil cuando está completo', async () => {
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante);
      const respuesta = await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
      expect(respuesta.body.usuario).toMatchObject({
        email: USUARIOS_SEMILLA.estudiante,
        rol: 'estudiante',
        perfilCompleto: true,
      });
      expect(respuesta.body.perfil).toMatchObject({ idEstudiante: expect.any(Number) });
    });

    it('el administrador figura con perfil completo y sin perfil', async () => {
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
      const respuesta = await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
      expect(respuesta.body.usuario).toMatchObject({ rol: 'administrador', perfilCompleto: true });
      expect(respuesta.body.perfil).toBeNull();
    });

    it('sin token responde 401', async () => {
      const respuesta = await t.http().get('/api/auth/yo').expect(401);
      expect(respuesta.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Se requiere iniciar sesión',
      });
    });

    it.each([
      ['un esquema que no es Bearer', 'Basic abc'],
      ['un token con basura', 'Bearer esto.no.es.un.jwt'],
      ['un Bearer sin token', 'Bearer'],
    ])('con %s responde 401', async (_nombre, cabecera) => {
      await t.http().get('/api/auth/yo').set('Authorization', cabecera).expect(401);
    });

    it('un token firmado con otro secreto responde 401', async () => {
      const ajeno = new JwtService({ secret: 'otro-secreto-distinto-al-del-servidor-123456' });
      const token = await ajeno.signAsync({ sub: '1', rol: 'administrador' });
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(401);
    });

    it('un token vencido responde 401', async () => {
      const propio = new JwtService({ secret: t.configuracion.seguridad.jwtSecreto });
      const token = await propio.signAsync(
        { sub: '1', rol: 'administrador' },
        { expiresIn: -10 },
      );
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(401);
    });

    it('un token sin firma (alg none) responde 401', async () => {
      const codificar = (objeto: object) =>
        Buffer.from(JSON.stringify(objeto)).toString('base64url');
      const token = `${codificar({ alg: 'none', typ: 'JWT' })}.${codificar({ sub: '1', rol: 'administrador' })}.`;
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(401);
    });

    it('el token deja de servir cuando el usuario se desactiva', async () => {
      const { token, email } = await registrarUsuario(t.http(), 'docente');
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);

      await t.db.query(`UPDATE usuario SET activo = false WHERE email = $1`, [email]);
      await t.http().get('/api/auth/yo').set(conSesion(token)).expect(401);
    });

    it('el rol que vale es el actual de la base, no el que quedó escrito en el token', async () => {
      const { token, email } = await registrarUsuario(t.http(), 'estudiante');
      await t.db.query(`UPDATE usuario SET rol = 'docente' WHERE email = $1`, [email]);
      const respuesta = await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
      expect(respuesta.body.usuario.rol).toBe('docente');
    });

    it('un endpoint de otro rol responde 403, no 401', async () => {
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante);
      const respuesta = await t
        .http()
        .post('/api/admin/tecnologias')
        .set(conSesion(token))
        .send({ nombre: 'Algo', categoria: 'lenguaje' })
        .expect(403);
      expect(respuesta.body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'No tiene permisos para realizar esta acción',
      });
    });
  });
});
