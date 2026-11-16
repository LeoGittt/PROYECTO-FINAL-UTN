import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type AppDePrueba, conSesion, crearAppDePrueba, iniciarSesion, USUARIOS_SEMILLA } from './ayudantes/app.js';
import { crearEstudiante, crearProyecto, crearPublicador, idsTecnologias } from './ayudantes/datos.js';

interface Configuracion {
  idConfiguracion: number;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

describe('Motor: configuraciones, referencia y evaluaciones (e2e)', () => {
  let t: AppDePrueba;
  let admin: Record<string, string>;
  let estudiante: Record<string, string>;
  let empresa: Record<string, string>;
  let configuraciones: Configuracion[];

  const v = (nombre: string) => configuraciones.find((c) => c.nombre.startsWith(nombre)) as Configuracion;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    admin = conSesion(await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador));
    estudiante = conSesion(await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante));
    empresa = conSesion(await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa));
    configuraciones = (await t.http().get('/api/matching/configuraciones').set(admin).expect(200)).body;
  });
  afterAll(async () => {
    await t.cerrar();
  });

  it('solo el administrador entra: 401 sin sesión y 403 para los demás roles', async () => {
    const rutas: Array<[method: 'get' | 'post' | 'put' | 'delete', ruta: string]> = [
      ['get', '/api/matching/configuraciones'],
      ['post', '/api/matching/configuraciones/1/activar'],
      ['post', '/api/matching/recalcular'],
      ['get', '/api/matching/referencia'],
      ['put', '/api/matching/referencia'],
      ['delete', '/api/matching/referencia/1'],
      ['post', '/api/matching/evaluaciones'],
      ['get', '/api/matching/evaluaciones'],
    ];
    for (const [method, ruta] of rutas) {
      await t.http()[method](ruta).expect(401);
      await t.http()[method](ruta).set(estudiante).expect(403);
      await t.http()[method](ruta).set(empresa).expect(403);
    }
  });

  it('lista las configuraciones de la semilla con v1 activa', () => {
    expect(configuraciones).toHaveLength(2);
    expect(v('v1')).toMatchObject({ activa: true, pesoTecnologias: 0.7, pesoTexto: 0, pesoContexto: 0.3 });
    expect(v('v2')).toMatchObject({ activa: false, pesoTexto: 0.3, umbralRecomendacion: 0.5 });
    expect(v('v2').descripcion).toEqual(expect.any(String));
  });

  it('activar una configuración la deja como única activa y recalcula con ella', async () => {
    const resultado = await t
      .http()
      .post(`/api/matching/configuraciones/${v('v2').idConfiguracion}/activar`)
      .set(admin)
      .expect(200);
    expect(resultado.body).toEqual({ pares: expect.any(Number), milisegundos: expect.any(Number) });
    expect(resultado.body.pares).toBeGreaterThan(0);

    const ahora: Configuracion[] = (await t.http().get('/api/matching/configuraciones').set(admin).expect(200)).body;
    expect(ahora.filter((c) => c.activa).map((c) => c.nombre)).toEqual([v('v2').nombre]);
    // Quedan guardados los puntajes de v2 para todos los pares, con el componente de texto.
    const guardados = async (idConfiguracion: number) =>
      (
        await t.db.query<{ pares: number; conTexto: number }>(
          `SELECT count(*)::int AS pares, count(puntaje_texto)::int AS con_texto
             FROM match WHERE id_configuracion = $1`,
          [idConfiguracion],
        )
      ).rows[0];
    expect(await guardados(v('v2').idConfiguracion)).toEqual({
      pares: resultado.body.pares,
      conTexto: resultado.body.pares,
    });

    await t.http().post(`/api/matching/configuraciones/${v('v1').idConfiguracion}/activar`).set(admin).expect(200);
    const ahoraV1: Configuracion[] = (await t.http().get('/api/matching/configuraciones').set(admin).expect(200)).body;
    expect(ahoraV1.filter((c) => c.activa).map((c) => c.nombre)).toEqual([v('v1').nombre]);
    expect((await guardados(v('v1').idConfiguracion)).conTexto).toBe(0);
  });

  it('activar una configuración que no existe es 404 y no cambia cuál está activa', async () => {
    const respuesta = await t.http().post('/api/matching/configuraciones/999999/activar').set(admin).expect(404);
    expect(respuesta.body.message).toBe('La configuración no existe');
    const ahora: Configuracion[] = (await t.http().get('/api/matching/configuraciones').set(admin).expect(200)).body;
    expect(ahora.filter((c) => c.activa).map((c) => c.nombre)).toEqual([v('v1').nombre]);
  });

  it('recalcular devuelve la cantidad de pares y el tiempo', async () => {
    const { body } = await t.http().post('/api/matching/recalcular').set(admin).expect(200);
    expect(body.pares).toBeGreaterThan(0);
    expect(body.milisegundos).toBeGreaterThanOrEqual(0);
  });

  describe('conjunto de referencia y evaluaciones', () => {
    let alumno: { idEstudiante: number };
    let compatible: number;
    let incompatible: number;

    beforeAll(async () => {
      const [react, docker] = await idsTecnologias(t.http(), 'React', 'Docker');
      const publicador = await crearPublicador(t.http);
      alumno = await crearEstudiante(t.http, {
        tecnologias: [{ idTecnologia: react, nivel: 'avanzado' }],
        anioCursada: 5,
        horasSemanales: 40,
      });
      // v1: 0,7 x tecnologías + 0,3 x contexto. Con React avanzado: 1. Sin Docker: 0,3 (< umbral 0,5).
      compatible = (
        await crearProyecto(t.http(), publicador.token, { tecnologias: [{ idTecnologia: react, obligatoria: true }] })
      ).idProyecto;
      incompatible = (
        await crearProyecto(t.http(), publicador.token, { tecnologias: [{ idTecnologia: docker, obligatoria: true }] })
      ).idProyecto;
    });

    it('la semilla trae pares etiquetados con el nombre del estudiante y el título del proyecto', async () => {
      const { body } = await t.http().get('/api/matching/referencia').set(admin).expect(200);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toEqual({
        idMatchReferencia: expect.any(Number),
        idEstudiante: expect.any(Number),
        estudiante: expect.stringMatching(/\S+ \S+/),
        idProyecto: expect.any(Number),
        proyecto: expect.any(String),
        esRelevante: expect.any(Boolean),
        observacion: expect.anything(),
      });
    });

    it('PUT crea o reemplaza la etiqueta de un par y DELETE la borra', async () => {
      const par = { idEstudiante: alumno.idEstudiante, idProyecto: compatible };
      const alta = await t.http().put('/api/matching/referencia').set(admin).send({ ...par, esRelevante: true }).expect(200);
      expect(alta.body).toMatchObject({ ...par, esRelevante: true, observacion: null, proyecto: expect.any(String) });

      const cambio = await t
        .http()
        .put('/api/matching/referencia')
        .set(admin)
        .send({ ...par, esRelevante: false, observacion: 'Revisado' })
        .expect(200);
      expect(cambio.body.idMatchReferencia).toBe(alta.body.idMatchReferencia);
      const lista = (await t.http().get('/api/matching/referencia').set(admin).expect(200)).body;
      expect(lista.filter((r: { idEstudiante: number }) => r.idEstudiante === alumno.idEstudiante)).toEqual([
        expect.objectContaining({ esRelevante: false, observacion: 'Revisado' }),
      ]);

      await t.http().delete(`/api/matching/referencia/${alta.body.idMatchReferencia}`).set(admin).expect(204);
      await t.http().delete(`/api/matching/referencia/${alta.body.idMatchReferencia}`).set(admin).expect(404);
    });

    it('PUT valida el cuerpo (400) y que existan el estudiante y el proyecto (404)', async () => {
      await t.http().put('/api/matching/referencia').set(admin).send({ idEstudiante: alumno.idEstudiante }).expect(400);
      const sinEstudiante = await t
        .http()
        .put('/api/matching/referencia')
        .set(admin)
        .send({ idEstudiante: 999999, idProyecto: compatible, esRelevante: true })
        .expect(404);
      expect(sinEstudiante.body.message).toBe('El estudiante no existe');
      const sinProyecto = await t
        .http()
        .put('/api/matching/referencia')
        .set(admin)
        .send({ idEstudiante: alumno.idEstudiante, idProyecto: 999999, esRelevante: true })
        .expect(404);
      expect(sinProyecto.body.message).toBe('El proyecto no existe');
    });

    it('evalúa una configuración solo sobre los pares etiquetados y guarda el resultado', async () => {
      // Se deja solo un escenario controlado: los dos pares del alumno nuevo, ambos relevantes.
      const semilla = (await t.http().get('/api/matching/referencia').set(admin).expect(200)).body;
      for (const par of semilla) {
        await t.http().delete(`/api/matching/referencia/${par.idMatchReferencia}`).set(admin).expect(204);
      }
      const vacia = await t
        .http()
        .post('/api/matching/evaluaciones')
        .set(admin)
        .send({ idConfiguracion: v('v1').idConfiguracion })
        .expect(422);
      expect(vacia.body.message).toBe('Cargue pares de referencia antes de evaluar el motor');

      for (const idProyecto of [compatible, incompatible]) {
        await t
          .http()
          .put('/api/matching/referencia')
          .set(admin)
          .send({ idEstudiante: alumno.idEstudiante, idProyecto, esRelevante: true })
          .expect(200);
      }
      const { body } = await t
        .http()
        .post('/api/matching/evaluaciones')
        .set(admin)
        .send({ idConfiguracion: v('v1').idConfiguracion, k: 50 })
        .expect(201);
      // Recomendados etiquetados: solo el compatible (relevante). Relevantes etiquetados: 2.
      expect(body).toEqual({
        idEvaluacion: expect.any(Number),
        idConfiguracion: v('v1').idConfiguracion,
        configuracion: v('v1').nombre,
        fechaEjecucion: expect.any(String),
        k: 50,
        cantidadEstudiantes: 1,
        precisionGlobal: 1,
        recallGlobal: 0.5,
        precisionTopK: 1,
        observaciones: null,
      });

      const otra = await t
        .http()
        .post('/api/matching/evaluaciones')
        .set(admin)
        .send({ idConfiguracion: v('v2').idConfiguracion })
        .expect(201);
      expect(otra.body.k).toBe(5);
      const historial = (await t.http().get('/api/matching/evaluaciones').set(admin).expect(200)).body;
      expect(historial.map((e: { idEvaluacion: number }) => e.idEvaluacion)).toEqual([
        otra.body.idEvaluacion,
        body.idEvaluacion,
      ]);
    });

    it('evaluar valida k (400) y la configuración (404)', async () => {
      await t
        .http()
        .post('/api/matching/evaluaciones')
        .set(admin)
        .send({ idConfiguracion: v('v1').idConfiguracion, k: 0 })
        .expect(400);
      await t.http().post('/api/matching/evaluaciones').set(admin).send({ idConfiguracion: 999999 }).expect(404);
    });
  });
});
