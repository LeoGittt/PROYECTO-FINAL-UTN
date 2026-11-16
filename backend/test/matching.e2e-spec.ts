import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { calcularPuntaje } from '../src/matching/motor.js';
import {
  type AppDePrueba,
  conSesion,
  crearAppDePrueba,
  iniciarSesion,
  registrarUsuario,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';
import {
  crearEstudiante,
  crearProyecto,
  crearPublicador,
  idsTecnologias,
  type Persona,
} from './ayudantes/datos.js';

/** Escucha un evento mientras corre `accion` y devuelve los payloads recibidos. */
async function capturarEventos<T>(t: AppDePrueba, nombre: string, accion: () => Promise<unknown>) {
  const recibidos: T[] = [];
  const escucha = (payload: T) => recibidos.push(payload);
  t.eventos.on(nombre, escucha);
  try {
    await accion();
  } finally {
    t.eventos.off(nombre, escucha);
  }
  return recibidos;
}

describe('Motor de recomendación (e2e)', () => {
  let t: AppDePrueba;
  let react: number;
  let nest: number;
  let docker: number;
  let empresa: Persona;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    [react, nest, docker] = await idsTecnologias(t.http(), 'React', 'NestJS', 'Docker');
    empresa = await crearPublicador(t.http, 'empresa');
  });
  afterAll(async () => {
    await t.cerrar();
  });

  it('al arrancar calcula el puntaje de cada estudiante activo con cada proyecto que no es borrador', async () => {
    const { rows } = await t.db.query<{ pares: number; esperados: number }>(
      `SELECT (SELECT count(*)::int FROM match m JOIN configuracion_motor c
                 ON c.id_configuracion = m.id_configuracion AND c.activa) AS pares,
              (SELECT count(*)::int FROM perfil_estudiante e JOIN usuario u
                 ON u.id_usuario = e.id_usuario AND u.activo)
            * (SELECT count(*)::int FROM proyecto WHERE estado <> 'borrador') AS esperados`,
    );
    expect(rows[0].pares).toBeGreaterThan(0);
    expect(rows[0].pares).toBe(rows[0].esperados);
  });

  it('las recomendaciones del seed están ordenadas, superan el umbral y son de proyectos publicados', async () => {
    const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante);
    const respuesta = await t.http().get('/api/matching/recomendaciones').set(conSesion(token)).expect(200);
    const recomendaciones = respuesta.body as Array<{
      puntajeTotal: number;
      proyecto: { estado: string; compatibilidad: number };
      puntajes: { tecnologias: number; texto: number | null; contexto: number };
    }>;
    expect(recomendaciones.length).toBeGreaterThan(0);
    expect(recomendaciones.length).toBeLessThanOrEqual(10);
    const puntajes = recomendaciones.map((r) => r.puntajeTotal);
    expect([...puntajes].sort((a, b) => b - a)).toEqual(puntajes);
    for (const r of recomendaciones) {
      expect(r.puntajeTotal).toBeGreaterThanOrEqual(0.5);
      expect(r.proyecto.estado).toBe('publicado');
      expect(r.proyecto.compatibilidad).toBe(r.puntajeTotal);
      // La configuración activa del seed (v1) no usa texto.
      expect(r.puntajes.texto).toBeNull();
    }
    const uno = await t.http().get('/api/matching/recomendaciones?limite=1').set(conSesion(token)).expect(200);
    expect(uno.body).toHaveLength(1);
  });

  it('el puntaje guardado es el de la fórmula de la sección 5.2 del contrato', async () => {
    const estudiante = await crearEstudiante(t.http, {
      anioCursada: 1,
      horasSemanales: 5,
      tecnologias: [
        { idTecnologia: react, nivel: 'avanzado' },
        { idTecnologia: nest, nivel: 'basico' },
      ],
    });
    const proyecto = await crearProyecto(t.http(), empresa.token, {
      horasSemanales: 10,
      anioMinimo: 2,
      tecnologias: [
        { idTecnologia: react, obligatoria: true },
        { idTecnologia: nest, obligatoria: false },
        { idTecnologia: docker, obligatoria: true },
      ],
    });
    // sT = (2·1 + 1·0,6 + 2·0) / 5 = 0,52; sC = 0,6·(5/10) + 0,4·(1 − 0,5·1) = 0,5; total = 0,7·0,52 + 0,3·0,5
    const visto = await t
      .http()
      .get(`/api/proyectos/${proyecto.idProyecto}`)
      .set(conSesion(estudiante.token))
      .expect(200);
    expect(visto.body.compatibilidad).toBeCloseTo(0.514, 4);

    const perfil = (await t.http().get('/api/perfil').set(conSesion(estudiante.token))).body;
    const esperado = calcularPuntaje(perfil, visto.body, {
      idConfiguracion: 1,
      nombre: 'v1',
      pesoTecnologias: 0.7,
      pesoTexto: 0,
      pesoContexto: 0.3,
      umbralRecomendacion: 0.5,
    });
    expect(visto.body.compatibilidad).toBe(esperado.total);
  });

  it('recalcula al publicar un proyecto y avisa con `match.nuevo` a quien llega al umbral', async () => {
    const estudiante = await crearEstudiante(t.http, {
      tecnologias: [{ idTecnologia: docker, nivel: 'avanzado' }],
    });
    const nuevos = await capturarEventos<{ idEstudiante: number; idProyecto: number }>(
      t,
      'match.nuevo',
      () =>
        crearProyecto(t.http(), empresa.token, {
          titulo: 'Infraestructura con contenedores',
          tecnologias: [{ idTecnologia: docker, obligatoria: true }],
        }),
    );
    const delEstudiante = nuevos.filter((e) => e.idEstudiante === estudiante.idEstudiante);
    expect(delEstudiante).toEqual([
      expect.objectContaining({
        idUsuarioEstudiante: estudiante.idUsuario,
        tituloProyecto: 'Infraestructura con contenedores',
        puntajeTotal: 1,
      }),
    ]);
    const recomendaciones = await t
      .http()
      .get('/api/matching/recomendaciones')
      .set(conSesion(estudiante.token))
      .expect(200);
    expect(recomendaciones.body[0]).toMatchObject({
      proyecto: { idProyecto: delEstudiante[0].idProyecto },
      puntajeTotal: 1,
      tecnologiasCoincidentes: ['Docker'],
      tecnologiasFaltantes: [],
      postulacion: null,
      invitacionPendiente: null,
    });
    // Un borrador no se puntúa: no genera avisos.
    const enBorrador = await capturarEventos(t, 'match.nuevo', () =>
      crearProyecto(t.http(), empresa.token, {
        publicar: false,
        tecnologias: [{ idTecnologia: docker, obligatoria: true }],
      }),
    );
    expect(enBorrador).toEqual([]);
  });

  it('recalcula al guardar el perfil del estudiante', async () => {
    const proyecto = await crearProyecto(t.http(), empresa.token, {
      tecnologias: [{ idTecnologia: nest, obligatoria: true }],
    });
    const estudiante = await crearEstudiante(t.http);
    const compatibilidad = async () =>
      (await t.http().get(`/api/proyectos/${proyecto.idProyecto}`).set(conSesion(estudiante.token))).body
        .compatibilidad;
    const antes = await compatibilidad();

    const perfil = (await t.http().get('/api/perfil').set(conSesion(estudiante.token))).body;
    await t
      .http()
      .put('/api/perfil')
      .set(conSesion(estudiante.token))
      .send({
        idCarrera: perfil.idCarrera,
        anioCursada: perfil.anioCursada,
        horasSemanales: perfil.horasSemanales,
        tecnologias: [{ idTecnologia: nest, nivel: 'avanzado' }],
      })
      .expect(200);
    expect(antes).toBeCloseTo(0.3, 4);
    expect(await compatibilidad()).toBe(1);
  });

  it('un proyecto que deja de estar publicado no se recomienda, pero conserva su puntaje', async () => {
    const estudiante = await crearEstudiante(t.http, {
      tecnologias: [{ idTecnologia: react, nivel: 'avanzado' }],
    });
    const proyecto = await crearProyecto(t.http(), empresa.token, {
      tecnologias: [{ idTecnologia: react, obligatoria: true }],
    });
    await t
      .http()
      .patch(`/api/proyectos/${proyecto.idProyecto}/estado`)
      .set(conSesion(empresa.token))
      .send({ estado: 'en_curso' })
      .expect(200);
    const recomendaciones = await t
      .http()
      .get('/api/matching/recomendaciones?limite=50')
      .set(conSesion(estudiante.token))
      .expect(200);
    expect(recomendaciones.body.map((r: { proyecto: { idProyecto: number } }) => r.proyecto.idProyecto)).not.toContain(
      proyecto.idProyecto,
    );
    const visto = await t
      .http()
      .get(`/api/proyectos/${proyecto.idProyecto}`)
      .set(conSesion(estudiante.token))
      .expect(200);
    expect(visto.body.compatibilidad).toBe(1);
  });

  it('el dueño ve los estudiantes recomendados (sin email); nadie más', async () => {
    const estudiante = await crearEstudiante(t.http, {
      tecnologias: [{ idTecnologia: react, nivel: 'intermedio' }],
    });
    const proyecto = await crearProyecto(t.http(), empresa.token, {
      tecnologias: [{ idTecnologia: react, obligatoria: true }],
    });
    const respuesta = await t
      .http()
      .get(`/api/matching/proyectos/${proyecto.idProyecto}/recomendados?limite=50`)
      .set(conSesion(empresa.token))
      .expect(200);
    const propio = respuesta.body.find(
      (r: { estudiante: { idEstudiante: number } }) => r.estudiante.idEstudiante === estudiante.idEstudiante,
    );
    expect(propio).toMatchObject({
      estudiante: {
        nombre: 'Persona',
        carrera: expect.any(String),
        anioCursada: 3,
        horasSemanales: 20,
        tecnologias: [{ nombre: 'React', nivel: 'intermedio' }],
      },
      tecnologiasCoincidentes: ['React'],
      idPostulacion: null,
      idInvitacion: null,
    });
    expect(propio.estudiante).not.toHaveProperty('email');
    for (const r of respuesta.body) expect(r.puntajeTotal).toBeGreaterThanOrEqual(0.5);

    const otro = await crearPublicador(t.http, 'docente');
    await t
      .http()
      .get(`/api/matching/proyectos/${proyecto.idProyecto}/recomendados`)
      .set(conSesion(otro.token))
      .expect(403);
    await t
      .http()
      .get(`/api/matching/proyectos/${proyecto.idProyecto}/recomendados`)
      .set(conSesion(estudiante.token))
      .expect(403);
  });

  it('permisos y validaciones de las recomendaciones', async () => {
    await t.http().get('/api/matching/recomendaciones').expect(401);
    await t.http().get('/api/matching/recomendaciones').set(conSesion(empresa.token)).expect(403);
    const { token } = await registrarUsuario(t.http(), 'estudiante');
    const sinPerfil = await t.http().get('/api/matching/recomendaciones').set(conSesion(token)).expect(422);
    expect(sinPerfil.body.message).toBe('Complete su perfil para recibir recomendaciones');
    const estudiante = await crearEstudiante(t.http);
    await t.http().get('/api/matching/recomendaciones?limite=0').set(conSesion(estudiante.token)).expect(400);
  });
});

describe('Postulaciones e invitaciones (e2e)', () => {
  let t: AppDePrueba;
  let empresa: Persona;
  let docente: Persona;
  let admin: string;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    empresa = await crearPublicador(t.http, 'empresa');
    docente = await crearPublicador(t.http, 'docente');
    admin = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
  });
  afterAll(async () => {
    await t.cerrar();
  });

  const postularse = (token: string, idProyecto: number, mensajePresentacion?: string) =>
    t.http().post('/api/postulaciones').set(conSesion(token)).send({ idProyecto, mensajePresentacion });
  const cambiarEstado = (token: string, idPostulacion: number, estado: string) =>
    t.http().patch(`/api/postulaciones/${idPostulacion}/estado`).set(conSesion(token)).send({ estado });

  describe('postulaciones', () => {
    it('un estudiante se postula, el dueño lo ve con email y se avisa con `postulacion.creada`', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token, { titulo: 'Para postularse' });
      let respuesta!: { status: number; body: Record<string, any> };
      const eventos = await capturarEventos(t, 'postulacion.creada', async () => {
        respuesta = await postularse(estudiante.token, proyecto.idProyecto, 'Me interesa');
      });
      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({
        estado: 'pendiente',
        mensajePresentacion: 'Me interesa',
        proyecto: { idProyecto: proyecto.idProyecto, titulo: 'Para postularse', estado: 'publicado' },
        estudiante: { idEstudiante: estudiante.idEstudiante, nombre: 'Persona' },
        puntajeTotal: expect.any(Number),
        historial: [{ estadoAnterior: null, estadoNuevo: 'pendiente', fechaCambio: expect.any(String) }],
      });
      expect(respuesta.body.estudiante).not.toHaveProperty('email');
      expect(eventos).toEqual([
        {
          idPostulacion: respuesta.body.idPostulacion,
          idProyecto: proyecto.idProyecto,
          tituloProyecto: 'Para postularse',
          idUsuarioPublicador: empresa.idUsuario,
          idUsuarioEstudiante: estudiante.idUsuario,
        },
      ]);

      const delProyecto = await t
        .http()
        .get(`/api/proyectos/${proyecto.idProyecto}/postulaciones`)
        .set(conSesion(empresa.token))
        .expect(200);
      expect(delProyecto.body).toHaveLength(1);
      expect(delProyecto.body[0].estudiante.email).toBe(estudiante.email);
      expect(delProyecto.body[0]).not.toHaveProperty('historial');
      const conCantidad = await t
        .http()
        .get(`/api/proyectos/${proyecto.idProyecto}`)
        .set(conSesion(empresa.token))
        .expect(200);
      expect(conCantidad.body.cantidadPostulaciones).toBe(1);

      const repetida = await postularse(estudiante.token, proyecto.idProyecto).expect(409);
      expect(repetida.body.message).toBe('Ya se postuló a este proyecto');
    });

    it('el publicador recorre la máquina de estados y el historial guarda quién hizo cada cambio', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      const { idPostulacion } = (await postularse(estudiante.token, proyecto.idProyecto).expect(201)).body;

      const eventos = await capturarEventos(t, 'postulacion.estado_cambiado', async () => {
        for (const estado of ['en_revision', 'entrevista', 'aceptada']) {
          const respuesta = await cambiarEstado(empresa.token, idPostulacion, estado).expect(200);
          expect(respuesta.body.estado).toBe(estado);
        }
      });
      expect(eventos).toHaveLength(3);
      expect(eventos[2]).toEqual({
        idPostulacion,
        idProyecto: proyecto.idProyecto,
        tituloProyecto: 'Proyecto de prueba',
        idUsuarioEstudiante: estudiante.idUsuario,
        idUsuarioPublicador: empresa.idUsuario,
        estadoAnterior: 'entrevista',
        estadoNuevo: 'aceptada',
      });

      const detalle = await t
        .http()
        .get(`/api/postulaciones/${idPostulacion}`)
        .set(conSesion(estudiante.token))
        .expect(200);
      expect(detalle.body.historial.map((h: { estadoNuevo: string }) => h.estadoNuevo)).toEqual([
        'pendiente',
        'en_revision',
        'entrevista',
        'aceptada',
      ]);
      const { rows } = await t.db.query<{ idUsuarioResponsable: number }>(
        `SELECT id_usuario_responsable FROM postulacion_historial
          WHERE id_postulacion = $1 ORDER BY id_historial`,
        [idPostulacion],
      );
      expect(rows.map((r) => r.idUsuarioResponsable)).toEqual([
        estudiante.idUsuario,
        empresa.idUsuario,
        empresa.idUsuario,
        empresa.idUsuario,
      ]);

      const final = await cambiarEstado(empresa.token, idPostulacion, 'rechazada').expect(409);
      expect(final.body.message).toBe('Una postulación aceptada no puede pasar a rechazada');
    });

    it('el estudiante solo puede retirarse; el publicador no puede retirarlo', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      const { idPostulacion } = (await postularse(estudiante.token, proyecto.idProyecto).expect(201)).body;

      const avanzar = await cambiarEstado(estudiante.token, idPostulacion, 'en_revision').expect(403);
      expect(avanzar.body.message).toBe('El estudiante solo puede retirar su postulación');
      const retirarlo = await cambiarEstado(empresa.token, idPostulacion, 'retirada').expect(403);
      expect(retirarlo.body.message).toBe('Solo el estudiante puede retirar su postulación');

      const retirada = await cambiarEstado(estudiante.token, idPostulacion, 'retirada').expect(200);
      expect(retirada.body.estado).toBe('retirada');
      await cambiarEstado(estudiante.token, idPostulacion, 'retirada').expect(409);
    });

    it('nadie ajeno ve ni cambia una postulación', async () => {
      const estudiante = await crearEstudiante(t.http);
      const otroEstudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      const { idPostulacion } = (await postularse(estudiante.token, proyecto.idProyecto).expect(201)).body;

      for (const token of [otroEstudiante.token, docente.token]) {
        await t.http().get(`/api/postulaciones/${idPostulacion}`).set(conSesion(token)).expect(403);
      }
      await cambiarEstado(docente.token, idPostulacion, 'en_revision').expect(403);
      await cambiarEstado(otroEstudiante.token, idPostulacion, 'retirada').expect(403);
      await cambiarEstado(admin, idPostulacion, 'en_revision').expect(403);
      await t.http().get(`/api/proyectos/${proyecto.idProyecto}/postulaciones`).set(conSesion(docente.token)).expect(403);

      const delAdmin = await t.http().get(`/api/postulaciones/${idPostulacion}`).set(conSesion(admin)).expect(200);
      expect(delAdmin.body.estudiante.email).toBe(estudiante.email);
      await t.http().get(`/api/proyectos/${proyecto.idProyecto}/postulaciones`).set(conSesion(admin)).expect(200);
      await t.http().get('/api/postulaciones/999999').set(conSesion(admin)).expect(404);
      await cambiarEstado(empresa.token, idPostulacion, 'archivada').expect(400);
    });

    it('solo se postula a proyectos publicados y con el perfil completo', async () => {
      const estudiante = await crearEstudiante(t.http);
      const borrador = await crearProyecto(t.http(), empresa.token, { publicar: false });
      await postularse(estudiante.token, borrador.idProyecto).expect(404);

      const enCurso = await crearProyecto(t.http(), empresa.token);
      await t
        .http()
        .patch(`/api/proyectos/${enCurso.idProyecto}/estado`)
        .set(conSesion(empresa.token))
        .send({ estado: 'en_curso' })
        .expect(200);
      const cerrado = await postularse(estudiante.token, enCurso.idProyecto).expect(422);
      expect(cerrado.body.message).toBe('El proyecto no está recibiendo postulaciones');

      const { token } = await registrarUsuario(t.http(), 'estudiante');
      const sinPerfil = await postularse(token, enCurso.idProyecto).expect(422);
      expect(sinPerfil.body.message).toBe('Complete su perfil antes de postularse');
      await postularse(empresa.token, enCurso.idProyecto).expect(403);
      await t.http().post('/api/postulaciones').send({ idProyecto: 1 }).expect(401);
      await t.http().post('/api/postulaciones').set(conSesion(estudiante.token)).send({}).expect(400);
    });

    it('`GET /postulaciones/mias` trae las propias y filtra por estado', async () => {
      const estudiante = await crearEstudiante(t.http);
      const uno = await crearProyecto(t.http(), empresa.token);
      const dos = await crearProyecto(t.http(), docente.token);
      const primera = (await postularse(estudiante.token, uno.idProyecto).expect(201)).body;
      await postularse(estudiante.token, dos.idProyecto).expect(201);
      await cambiarEstado(estudiante.token, primera.idPostulacion, 'retirada').expect(200);

      const todas = await t.http().get('/api/postulaciones/mias').set(conSesion(estudiante.token)).expect(200);
      expect(todas.body).toHaveLength(2);
      const retiradas = await t
        .http()
        .get('/api/postulaciones/mias?estado=retirada')
        .set(conSesion(estudiante.token))
        .expect(200);
      expect(retiradas.body.map((p: { idPostulacion: number }) => p.idPostulacion)).toEqual([primera.idPostulacion]);
      await t.http().get('/api/postulaciones/mias').set(conSesion(empresa.token)).expect(403);
    });

    it('el email del estudiante lo ve solo el publicador con quien tiene una postulación', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      const ver = (token: string) =>
        t.http().get(`/api/estudiantes/${estudiante.idEstudiante}`).set(conSesion(token)).expect(200);
      expect((await ver(empresa.token)).body).not.toHaveProperty('email');

      await postularse(estudiante.token, proyecto.idProyecto).expect(201);
      expect((await ver(empresa.token)).body.email).toBe(estudiante.email);
      expect((await ver(docente.token)).body).not.toHaveProperty('email');
    });
  });

  describe('invitaciones', () => {
    const invitar = (token: string, idProyecto: number, idEstudiante: number) =>
      t
        .http()
        .post('/api/invitaciones')
        .set(conSesion(token))
        .send({ idProyecto, idEstudiante, mensaje: 'Te queremos en el equipo' });
    const responder = (token: string, idInvitacion: number, aceptar: boolean) =>
      t.http().post(`/api/invitaciones/${idInvitacion}/responder`).set(conSesion(token)).send({ aceptar });

    it('el dueño invita, el estudiante acepta y se crea la postulación en pendiente', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token, { titulo: 'Con invitación' });

      let alta!: { status: number; body: Record<string, any> };
      const enviadas = await capturarEventos(t, 'invitacion.enviada', async () => {
        alta = await invitar(empresa.token, proyecto.idProyecto, estudiante.idEstudiante);
      });
      expect(alta.status).toBe(201);
      expect(alta.body).toMatchObject({
        proyecto: { idProyecto: proyecto.idProyecto, titulo: 'Con invitación', publicador: expect.any(String) },
        estudiante: { idEstudiante: estudiante.idEstudiante, nombre: 'Persona', apellido: 'De Prueba' },
        mensaje: 'Te queremos en el equipo',
        estado: 'pendiente',
        fechaRespuesta: null,
      });
      expect(enviadas).toEqual([
        {
          idInvitacion: alta.body.idInvitacion,
          idProyecto: proyecto.idProyecto,
          tituloProyecto: 'Con invitación',
          idUsuarioEstudiante: estudiante.idUsuario,
        },
      ]);

      // Con la invitación pendiente, no se postula por su cuenta: la responde.
      const directa = await postularse(estudiante.token, proyecto.idProyecto).expect(409);
      expect(directa.body.message).toBe('Ya tiene una invitación a este proyecto: respóndala desde Invitaciones');
      const mias = await t.http().get('/api/invitaciones/mias').set(conSesion(estudiante.token)).expect(200);
      expect(mias.body.map((i: { idInvitacion: number }) => i.idInvitacion)).toEqual([alta.body.idInvitacion]);

      const creadas = await capturarEventos(t, 'postulacion.creada', async () => {
        const respuesta = await responder(estudiante.token, alta.body.idInvitacion, true).expect(200);
        expect(respuesta.body.invitacion).toMatchObject({ estado: 'aceptada', fechaRespuesta: expect.any(String) });
        expect(respuesta.body.postulacion).toMatchObject({
          estado: 'pendiente',
          proyecto: { idProyecto: proyecto.idProyecto },
          historial: [{ estadoAnterior: null, estadoNuevo: 'pendiente' }],
        });
      });
      expect(creadas).toHaveLength(1);
      const otraVez = await responder(estudiante.token, alta.body.idInvitacion, false).expect(409);
      expect(otraVez.body.message).toBe('La invitación ya fue respondida');
    });

    it('rechazar no crea la postulación, y el estudiante puede postularse después', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      const { idInvitacion } = (await invitar(empresa.token, proyecto.idProyecto, estudiante.idEstudiante).expect(201))
        .body;
      const respuesta = await responder(estudiante.token, idInvitacion, false).expect(200);
      expect(respuesta.body.invitacion.estado).toBe('rechazada');
      expect(respuesta.body.postulacion).toBeNull();
      await postularse(estudiante.token, proyecto.idProyecto).expect(201);
    });

    it('409 si el estudiante ya tiene una postulación o una invitación en el proyecto', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      await invitar(empresa.token, proyecto.idProyecto, estudiante.idEstudiante).expect(201);
      const duplicada = await invitar(empresa.token, proyecto.idProyecto, estudiante.idEstudiante).expect(409);
      expect(duplicada.body.message).toBe('El estudiante ya tiene una postulación o una invitación en este proyecto');

      const postulado = await crearEstudiante(t.http);
      await postularse(postulado.token, proyecto.idProyecto).expect(201);
      await invitar(empresa.token, proyecto.idProyecto, postulado.idEstudiante).expect(409);
    });

    it('solo el dueño de un proyecto publicado invita, a un estudiante que existe', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      await invitar(docente.token, proyecto.idProyecto, estudiante.idEstudiante).expect(403);
      await invitar(estudiante.token, proyecto.idProyecto, estudiante.idEstudiante).expect(403);
      await invitar(empresa.token, proyecto.idProyecto, 999999).expect(404);
      const borrador = await crearProyecto(t.http(), empresa.token, { publicar: false });
      const noPublicado = await invitar(empresa.token, borrador.idProyecto, estudiante.idEstudiante).expect(422);
      expect(noPublicado.body.message).toBe('Solo se puede invitar a un proyecto publicado');
      await t.http().post('/api/invitaciones').set(conSesion(empresa.token)).send({ idProyecto: 'x' }).expect(400);
    });

    it('solo el invitado responde; el dueño ve las invitaciones de su proyecto', async () => {
      const estudiante = await crearEstudiante(t.http);
      const otro = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      const { idInvitacion } = (await invitar(empresa.token, proyecto.idProyecto, estudiante.idEstudiante).expect(201))
        .body;

      await responder(otro.token, idInvitacion, true).expect(403);
      await responder(empresa.token, idInvitacion, true).expect(403);
      await responder(estudiante.token, 999999, true).expect(404);

      const delProyecto = await t
        .http()
        .get(`/api/proyectos/${proyecto.idProyecto}/invitaciones`)
        .set(conSesion(empresa.token))
        .expect(200);
      expect(delProyecto.body.map((i: { idInvitacion: number }) => i.idInvitacion)).toEqual([idInvitacion]);
      await t.http().get(`/api/proyectos/${proyecto.idProyecto}/invitaciones`).set(conSesion(docente.token)).expect(403);

      // Los recomendados del dueño marcan a quién ya invitó.
      const recomendados = await t
        .http()
        .get(`/api/matching/proyectos/${proyecto.idProyecto}/recomendados?limite=50`)
        .set(conSesion(empresa.token))
        .expect(200);
      const invitado = recomendados.body.find(
        (r: { estudiante: { idEstudiante: number } }) => r.estudiante.idEstudiante === estudiante.idEstudiante,
      );
      expect(invitado?.idInvitacion).toBe(idInvitacion);
    });

    it('no se acepta una invitación a un proyecto que ya no está publicado', async () => {
      const estudiante = await crearEstudiante(t.http);
      const proyecto = await crearProyecto(t.http(), empresa.token);
      const { idInvitacion } = (await invitar(empresa.token, proyecto.idProyecto, estudiante.idEstudiante).expect(201))
        .body;
      await t
        .http()
        .patch(`/api/proyectos/${proyecto.idProyecto}/estado`)
        .set(conSesion(empresa.token))
        .send({ estado: 'cancelado' })
        .expect(200);
      const respuesta = await responder(estudiante.token, idInvitacion, true).expect(422);
      expect(respuesta.body.message).toBe('El proyecto no está recibiendo postulaciones');
      await responder(estudiante.token, idInvitacion, false).expect(200);
    });

    it('la recomendación muestra la invitación pendiente y, después, la postulación', async () => {
      const [react] = await idsTecnologias(t.http(), 'React');
      const estudiante = await crearEstudiante(t.http, {
        tecnologias: [{ idTecnologia: react, nivel: 'avanzado' }],
      });
      const proyecto = await crearProyecto(t.http(), empresa.token, {
        tecnologias: [{ idTecnologia: react, obligatoria: true }],
      });
      const { idInvitacion } = (await invitar(empresa.token, proyecto.idProyecto, estudiante.idEstudiante).expect(201))
        .body;
      const buscar = async () =>
        (
          await t.http().get('/api/matching/recomendaciones?limite=50').set(conSesion(estudiante.token)).expect(200)
        ).body.find((r: { proyecto: { idProyecto: number } }) => r.proyecto.idProyecto === proyecto.idProyecto);

      expect((await buscar()).invitacionPendiente).toEqual({ idInvitacion });
      const { postulacion } = (await responder(estudiante.token, idInvitacion, true).expect(200)).body;
      expect(await buscar()).toMatchObject({
        invitacionPendiente: null,
        postulacion: { idPostulacion: postulacion.idPostulacion, estado: 'pendiente' },
      });
    });
  });
});
