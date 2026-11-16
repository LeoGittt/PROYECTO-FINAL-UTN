import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AppDePrueba,
  conSesion,
  crearAppDePrueba,
  iniciarSesion,
  registrarUsuario,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';

/**
 * La aplicación completa con `DATABASE_URL` (adaptador `pg`, el de producción) en vez de PGlite
 * embebido. Las consultas de los repositorios mandan parámetros por el protocolo de PostgreSQL
 * (arreglos, `unnest`, `ANY`, enumerados): acá se comprueba que funcionan igual que en las
 * pruebas con PGlite. El servidor es PGlite detrás de un socket local, no un PostgreSQL real.
 */
describe('Aplicación sobre el adaptador pg (e2e)', () => {
  let pglite: PGlite;
  let servidor: PGLiteSocketServer;
  let t: AppDePrueba;

  beforeAll(async () => {
    pglite = await PGlite.create();
    servidor = new PGLiteSocketServer({ db: pglite, port: 0, host: '127.0.0.1', maxConnections: 10 });
    await servidor.start();
    // La primera vez la base está vacía: la aplicación aplica schema.sql y seed.sql (DB_AUTO_INIT).
    t = await crearAppDePrueba({
      DATABASE_URL: `postgresql://postgres@${servidor.getServerConn()}/postgres`,
    });
  });
  afterAll(async () => {
    await t.cerrar();
    await servidor.stop();
    await pglite.close();
  });

  it('usa PostgreSQL por DATABASE_URL y la base quedó inicializada con el seed', async () => {
    expect(t.configuracion.baseDeDatos.url).toContain('postgresql://');
    const respuesta = await t.http().get('/api/health').expect(200);
    expect(respuesta.body).toEqual({ estado: 'ok', baseDeDatos: 'ok' });
    const carreras = await t.http().get('/api/catalogos/carreras').expect(200);
    expect(carreras.body).toHaveLength(3);
  });

  it('flujo completo: registro, perfil con listas, lectura y vista del publicador', async () => {
    const tecnologias = (await t.http().get('/api/catalogos/tecnologias')).body as Array<{ idTecnologia: number }>;
    const habilidades = (await t.http().get('/api/catalogos/habilidades')).body as Array<{ idHabilidad: number }>;
    const carreras = (await t.http().get('/api/catalogos/carreras')).body as Array<{
      idCarrera: number;
      duracionAnios: number;
    }>;
    const isi = carreras.find((c) => c.duracionAnios === 5)!;
    const materias = (await t.http().get('/api/catalogos/materias').query({ idCarrera: isi.idCarrera })).body as Array<{
      idMateria: number;
    }>;

    const { token } = await registrarUsuario(t.http(), 'estudiante');
    const cuerpo = {
      idCarrera: isi.idCarrera,
      anioCursada: 4,
      horasSemanales: 15,
      descripcion: 'Texto con ñ, acentos y "comillas"',
      tecnologias: [
        { idTecnologia: tecnologias[0].idTecnologia, nivel: 'avanzado' },
        { idTecnologia: tecnologias[1].idTecnologia, nivel: 'basico' },
      ],
      habilidades: [habilidades[0].idHabilidad, habilidades[1].idHabilidad],
      materiasAprobadas: materias.slice(0, 4).map((m) => m.idMateria),
    };
    const guardado = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo).expect(200);
    expect(guardado.body.tecnologias).toHaveLength(2);
    expect(guardado.body.habilidades).toHaveLength(2);
    expect(guardado.body.materiasAprobadas).toHaveLength(4);
    expect(guardado.body.descripcion).toBe(cuerpo.descripcion);

    // Reemplazo: las listas viejas desaparecen.
    const reemplazado = await t
      .http()
      .put('/api/perfil')
      .set(conSesion(token))
      .send({ ...cuerpo, tecnologias: [], habilidades: [], materiasAprobadas: [materias[0].idMateria] })
      .expect(200);
    expect(reemplazado.body.tecnologias).toEqual([]);
    expect(reemplazado.body.materiasAprobadas).toHaveLength(1);
    expect(reemplazado.body.idEstudiante).toBe(guardado.body.idEstudiante);

    const empresa = await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa);
    const vista = await t
      .http()
      .get(`/api/estudiantes/${guardado.body.idEstudiante}`)
      .set(conSesion(empresa))
      .expect(200);
    expect(vista.body).toMatchObject({ idEstudiante: guardado.body.idEstudiante, nombre: 'Persona' });
    expect(vista.body).not.toHaveProperty('email');
  });

  it('las reglas de negocio y los conflictos se traducen igual que con PGlite', async () => {
    const { token } = await registrarUsuario(t.http(), 'estudiante');
    const carreras = (await t.http().get('/api/catalogos/carreras')).body as Array<{
      idCarrera: number;
      duracionAnios: number;
    }>;
    const tup = carreras.find((c) => c.duracionAnios === 2)!;
    await t
      .http()
      .put('/api/perfil')
      .set(conSesion(token))
      .send({ idCarrera: tup.idCarrera, anioCursada: 3, horasSemanales: 10 })
      .expect(422);

    const admin = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
    await t
      .http()
      .post('/api/admin/tecnologias')
      .set(conSesion(admin))
      .send({ nombre: 'typescript', categoria: 'lenguaje' })
      .expect(409);

    const { email } = await registrarUsuario(t.http(), 'docente');
    await t
      .http()
      .post('/api/auth/registro')
      .send({ nombre: 'X', apellido: 'Y', email: email.toUpperCase(), contrasena: 'Clave1234', rol: 'docente' })
      .expect(409);
  });

  it('el perfil sembrado y la fecha de registro llegan con los tipos del contrato', async () => {
    const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante);
    const yo = await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
    expect(typeof yo.body.usuario.idUsuario).toBe('number');
    expect(typeof yo.body.perfil.idEstudiante).toBe('number');
    expect(typeof yo.body.perfil.carrera.duracionAnios).toBe('number');
    expect(yo.body.perfil.tecnologias.length).toBeGreaterThan(0);
  });
});
