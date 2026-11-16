import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AppDePrueba,
  CONTRASENA_SEMILLA,
  conSesion,
  crearAppDePrueba,
  emailUnico,
  iniciarSesion,
  registrarUsuario,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';
import {
  crearEstudiante,
  crearProyecto,
  crearPublicador,
  cuerpoProyecto,
  idsTecnologias,
  type Persona,
} from './ayudantes/datos.js';

/** La contraseña con la que `registrarUsuario` da de alta a los usuarios de prueba. */
const CLAVE_DE_PRUEBA = 'Clave1234';

describe('Administración y reportes (e2e)', () => {
  let t: AppDePrueba;
  let admin: Record<string, string>;
  let idAdmin: number;
  let estudiante: Record<string, string>;
  let empresa: Record<string, string>;
  let docente: Record<string, string>;

  const login = (email: string, contrasena: string) =>
    t.http().post('/api/auth/login').send({ email, contrasena });

  beforeAll(async () => {
    t = await crearAppDePrueba();
    const sesion = (await login(USUARIOS_SEMILLA.administrador, CONTRASENA_SEMILLA).expect(200)).body;
    admin = conSesion(sesion.token);
    idAdmin = sesion.usuario.idUsuario;
    estudiante = conSesion(await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante));
    empresa = conSesion(await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa));
    docente = conSesion(await iniciarSesion(t.http(), USUARIOS_SEMILLA.docente));
  });
  afterAll(async () => {
    await t.cerrar();
  });

  it('solo el administrador entra: 401 sin sesión y 403 para los demás roles', async () => {
    const rutas: Array<[metodo: 'get' | 'post' | 'patch', ruta: string]> = [
      ['get', '/api/admin/usuarios'],
      ['patch', '/api/admin/usuarios/1'],
      ['post', '/api/admin/administradores'],
      ['post', '/api/admin/usuarios/1/restablecer-contrasena'],
      ['get', '/api/admin/proyectos'],
      ['post', '/api/admin/proyectos/1/suspender'],
      ['post', '/api/admin/proyectos/1/reactivar'],
      ['get', '/api/reportes/resumen'],
      ['get', '/api/reportes/dashboard'],
    ];
    for (const [metodo, ruta] of rutas) {
      await t.http()[metodo](ruta).expect(401);
      for (const otro of [estudiante, empresa, docente]) await t.http()[metodo](ruta).set(otro).expect(403);
    }
  });

  describe('usuarios', () => {
    it('lista paginada con filtros por rol, estado y texto', async () => {
      const todos = (await t.http().get('/api/admin/usuarios?tamano=5').set(admin).expect(200)).body;
      expect(todos).toMatchObject({ pagina: 1, tamano: 5, total: expect.any(Number) });
      expect(todos.items).toHaveLength(5);
      expect(Object.keys(todos.items[0]).sort()).toEqual(
        ['activo', 'apellido', 'email', 'fechaRegistro', 'idEstudiante', 'idUsuario', 'nombre', 'rol'].sort(),
      );

      const estudiantes = (await t.http().get('/api/admin/usuarios?rol=estudiante&tamano=100').set(admin).expect(200))
        .body;
      expect(estudiantes.items.every((u: { rol: string }) => u.rol === 'estudiante')).toBe(true);
      expect(estudiantes.total).toBeLessThan(todos.total);

      const porTexto = (
        await t.http().get(`/api/admin/usuarios?q=${encodeURIComponent('martin.paz')}`).set(admin).expect(200)
      ).body;
      expect(porTexto.items.map((u: { email: string }) => u.email)).toEqual([USUARIOS_SEMILLA.empresa]);

      const inactivos = (await t.http().get('/api/admin/usuarios?activo=false&tamano=100').set(admin).expect(200)).body;
      expect(inactivos.items.every((u: { activo: boolean }) => !u.activo)).toBe(true);
    });

    it('trae el número de perfil (idEstudiante) solo de los estudiantes que lo completaron', async () => {
      const conPerfil = await crearEstudiante(t.http);
      const sinPerfil = await registrarUsuario(t.http(), 'estudiante');
      const renglon = async (email: string) =>
        (await t.http().get(`/api/admin/usuarios?q=${encodeURIComponent(email)}`).set(admin).expect(200)).body.items[0];
      expect((await renglon(conPerfil.email)).idEstudiante).toBe(conPerfil.idEstudiante);
      expect((await renglon(sinPerfil.email)).idEstudiante).toBeNull();
      expect((await renglon(USUARIOS_SEMILLA.empresa)).idEstudiante).toBeNull();
    });

    it('valida los filtros (400)', async () => {
      await t.http().get('/api/admin/usuarios?rol=jefe').set(admin).expect(400);
      await t.http().get('/api/admin/usuarios?activo=quizas').set(admin).expect(400);
      await t.http().get('/api/admin/usuarios?tamano=500').set(admin).expect(400);
    });

    it('desactivar corta la sesión del usuario y le impide entrar; reactivarlo lo devuelve', async () => {
      const persona = await crearEstudiante(t.http);
      const desactivado = await t
        .http()
        .patch(`/api/admin/usuarios/${persona.idUsuario}`)
        .set(admin)
        .send({ activo: false })
        .expect(200);
      expect(desactivado.body).toMatchObject({ idUsuario: persona.idUsuario, activo: false, rol: 'estudiante' });
      expect(desactivado.body.fechaRegistro).toEqual(expect.any(String));
      await t.http().get('/api/perfil').set(conSesion(persona.token)).expect(401);
      await login(persona.email, CLAVE_DE_PRUEBA).expect(403);

      await t.http().patch(`/api/admin/usuarios/${persona.idUsuario}`).set(admin).send({ activo: true }).expect(200);
      await login(persona.email, CLAVE_DE_PRUEBA).expect(200);
    });

    it('al reactivar a un estudiante recibe el puntaje de los proyectos publicados mientras estaba inactivo', async () => {
      const [react] = await idsTecnologias(t.http(), 'React');
      const persona = await crearEstudiante(t.http, {
        tecnologias: [{ idTecnologia: react, nivel: 'avanzado' }],
        anioCursada: 5,
        horasSemanales: 40,
      });
      const publicador = await crearPublicador(t.http);
      await t.http().patch(`/api/admin/usuarios/${persona.idUsuario}`).set(admin).send({ activo: false }).expect(200);
      const { idProyecto } = await crearProyecto(t.http(), publicador.token, {
        tecnologias: [{ idTecnologia: react, obligatoria: true }],
      });
      await t.http().patch(`/api/admin/usuarios/${persona.idUsuario}`).set(admin).send({ activo: true }).expect(200);

      const sesion = (await login(persona.email, CLAVE_DE_PRUEBA).expect(200)).body.token;
      const { body } = await t
        .http()
        .get('/api/matching/recomendaciones?limite=50')
        .set(conSesion(sesion))
        .expect(200);
      expect(body.map((r: { proyecto: { idProyecto: number } }) => r.proyecto.idProyecto)).toContain(idProyecto);
    });

    it('no se le puede cambiar el rol a otro administrador (409)', async () => {
      const datos = { nombre: 'Otro', apellido: 'Admin', email: emailUnico('admin'), contrasena: 'Segura2026' };
      const otro = (await t.http().post('/api/admin/administradores').set(admin).send(datos).expect(201)).body;
      const respuesta = await t
        .http()
        .patch(`/api/admin/usuarios/${otro.idUsuario}`)
        .set(admin)
        .send({ rol: 'estudiante' })
        .expect(409);
      expect(respuesta.body.message).toBe('No se puede cambiar el rol de un administrador');
      // Desactivar a otro administrador sí se puede.
      await t.http().patch(`/api/admin/usuarios/${otro.idUsuario}`).set(admin).send({ activo: false }).expect(200);
    });

    it('un administrador no puede desactivarse ni cambiarse el rol a sí mismo (409)', async () => {
      for (const cambios of [{ activo: false }, { rol: 'estudiante' }]) {
        const respuesta = await t.http().patch(`/api/admin/usuarios/${idAdmin}`).set(admin).send(cambios).expect(409);
        expect(respuesta.body.message).toBe('Un administrador no puede desactivarse ni cambiarse el rol a sí mismo');
      }
      await t.http().get('/api/admin/usuarios').set(admin).expect(200);
    });

    it('cambia el rol de quien todavía no completó su perfil; si ya lo completó, 409', async () => {
      const recien = await registrarUsuario(t.http(), 'estudiante');
      const cambiado = await t
        .http()
        .patch(`/api/admin/usuarios/${recien.usuario.idUsuario}`)
        .set(admin)
        .send({ rol: 'docente' })
        .expect(200);
      expect(cambiado.body.rol).toBe('docente');

      const conPerfil = await crearEstudiante(t.http);
      const conflicto = await t
        .http()
        .patch(`/api/admin/usuarios/${conPerfil.idUsuario}`)
        .set(admin)
        .send({ rol: 'empresa' })
        .expect(409);
      expect(conflicto.body.message).toBe('No se puede cambiar el rol de un usuario que ya completó su perfil');
    });

    it('PATCH valida el cuerpo (400) y el usuario (404)', async () => {
      await t.http().patch(`/api/admin/usuarios/${idAdmin}`).set(admin).send({}).expect(400);
      await t.http().patch('/api/admin/usuarios/2').set(admin).send({ rol: 'administrador' }).expect(400);
      await t.http().patch('/api/admin/usuarios/999999').set(admin).send({ activo: false }).expect(404);
    });

    it('da de alta otro administrador, que puede entrar al panel', async () => {
      const datos = { nombre: 'Rocío', apellido: 'Admin', email: emailUnico('admin'), contrasena: 'Segura2026' };
      const alta = await t.http().post('/api/admin/administradores').set(admin).send(datos).expect(201);
      expect(alta.body).toMatchObject({ nombre: 'Rocío', email: datos.email, rol: 'administrador', activo: true });
      const sesion = (await login(datos.email, datos.contrasena).expect(200)).body;
      await t.http().get('/api/admin/usuarios').set(conSesion(sesion.token)).expect(200);

      await t.http().post('/api/admin/administradores').set(admin).send(datos).expect(409);
      await t
        .http()
        .post('/api/admin/administradores')
        .set(admin)
        .send({ ...datos, email: emailUnico('admin'), contrasena: 'corta' })
        .expect(400);
    });

    it('restablece la contraseña de un usuario: la nueva sirve y la anterior no', async () => {
      const persona = await crearEstudiante(t.http);
      await t
        .http()
        .post(`/api/admin/usuarios/${persona.idUsuario}/restablecer-contrasena`)
        .set(admin)
        .send({ contrasenaNueva: 'NuevaClave2026' })
        .expect(204);
      await login(persona.email, 'NuevaClave2026').expect(200);
      await login(persona.email, CLAVE_DE_PRUEBA).expect(401);

      await t
        .http()
        .post(`/api/admin/usuarios/${persona.idUsuario}/restablecer-contrasena`)
        .set(admin)
        .send({ contrasenaNueva: 'corta' })
        .expect(400);
      await t
        .http()
        .post('/api/admin/usuarios/999999/restablecer-contrasena')
        .set(admin)
        .send({ contrasenaNueva: 'NuevaClave2026' })
        .expect(404);
    });
  });

  describe('moderación de proyectos', () => {
    let publicador: Persona;
    let alumno: Persona;

    const notificaciones = async (persona: Persona) =>
      (await t.http().get('/api/notificaciones').set(conSesion(persona.token)).expect(200)).body.items as Array<{
        mensaje: string;
      }>;

    beforeAll(async () => {
      publicador = await crearPublicador(t.http);
      alumno = await crearEstudiante(t.http);
    });

    it('lista todos los proyectos, borradores incluidos, con la cantidad de postulaciones', async () => {
      const borrador = await crearProyecto(t.http(), publicador.token, { publicar: false });
      const todos = (await t.http().get('/api/admin/proyectos').set(admin).expect(200)).body;
      const encontrado = todos.find((p: { idProyecto: number }) => p.idProyecto === borrador.idProyecto);
      expect(encontrado).toMatchObject({ estado: 'borrador', cantidadPostulaciones: 0 });

      const soloBorradores = (await t.http().get('/api/admin/proyectos?estado=borrador').set(admin).expect(200)).body;
      expect(soloBorradores.every((p: { estado: string }) => p.estado === 'borrador')).toBe(true);
      await t.http().get('/api/admin/proyectos?estado=perdido').set(admin).expect(400);
    });

    it('suspende un proyecto publicado: deja de verse, se avisa al publicador con el motivo y a los postulados', async () => {
      const titulo = 'Proyecto a moderar';
      const { idProyecto } = await crearProyecto(t.http(), publicador.token, { titulo });
      await t.http().post('/api/postulaciones').set(conSesion(alumno.token)).send({ idProyecto }).expect(201);

      await t.http().post(`/api/admin/proyectos/${idProyecto}/suspender`).set(admin).send({}).expect(400);
      const suspendido = await t
        .http()
        .post(`/api/admin/proyectos/${idProyecto}/suspender`)
        .set(admin)
        .send({ motivo: 'Datos de contacto falsos' })
        .expect(200);
      expect(suspendido.body.estado).toBe('suspendido');

      await t.http().get(`/api/proyectos/${idProyecto}`).set(conSesion(alumno.token)).expect(404);
      const busqueda = (await t.http().get(`/api/proyectos?q=${encodeURIComponent(titulo)}`).set(estudiante).expect(200))
        .body;
      expect(busqueda.items.map((p: { idProyecto: number }) => p.idProyecto)).not.toContain(idProyecto);
      expect((await notificaciones(publicador))[0].mensaje).toBe(
        `La administración suspendió «${titulo}». Motivo: Datos de contacto falsos`,
      );
      expect((await notificaciones(alumno))[0].mensaje).toBe(`El proyecto «${titulo}» pasó a «suspendido».`);
      // El dueño todavía lo ve, pero no lo puede editar mientras está suspendido.
      await t.http().get(`/api/proyectos/${idProyecto}`).set(conSesion(publicador.token)).expect(200);
      const edicion = await t
        .http()
        .put(`/api/proyectos/${idProyecto}`)
        .set(conSesion(publicador.token))
        .send(cuerpoProyecto({ titulo }))
        .expect(409);
      expect(edicion.body.message).toBe('Un proyecto finalizado, cancelado o suspendido no se puede editar');

      const otra = await t
        .http()
        .post(`/api/admin/proyectos/${idProyecto}/suspender`)
        .set(admin)
        .send({ motivo: 'Otra vez' })
        .expect(409);
      expect(otra.body.message).toBe('Solo se puede suspender un proyecto publicado o en curso');

      const reactivado = await t.http().post(`/api/admin/proyectos/${idProyecto}/reactivar`).set(admin).expect(200);
      expect(reactivado.body.estado).toBe('publicado');
      await t.http().get(`/api/proyectos/${idProyecto}`).set(conSesion(alumno.token)).expect(200);
      expect((await notificaciones(publicador))[0].mensaje).toBe(`La administración reactivó «${titulo}».`);
    });

    it('no suspende un borrador ni reactiva lo que no está suspendido (409); un proyecto inexistente es 404', async () => {
      const borrador = await crearProyecto(t.http(), publicador.token, { publicar: false });
      await t
        .http()
        .post(`/api/admin/proyectos/${borrador.idProyecto}/suspender`)
        .set(admin)
        .send({ motivo: 'x' })
        .expect(409);
      const reactivar = await t.http().post(`/api/admin/proyectos/${borrador.idProyecto}/reactivar`).set(admin).expect(409);
      expect(reactivar.body.message).toBe('Solo se puede reactivar un proyecto suspendido');
      await t.http().post('/api/admin/proyectos/999999/suspender').set(admin).send({ motivo: 'x' }).expect(404);
    });
  });

  describe('reportes', () => {
    it('el resumen (RF-07) coincide con la base', async () => {
      const { body } = await t.http().get('/api/reportes/resumen').set(admin).expect(200);
      const contar = async (sql: string) => (await t.db.query<{ n: number }>(sql)).rows[0].n;
      expect(body.estudiantesActivos).toBe(
        await contar(`SELECT count(*)::int AS n FROM usuario WHERE rol = 'estudiante' AND activo`),
      );
      expect(body.empresasActivas).toBe(await contar(`SELECT count(*)::int AS n FROM usuario WHERE rol = 'empresa' AND activo`));
      expect(body.docentesActivos).toBe(await contar(`SELECT count(*)::int AS n FROM usuario WHERE rol = 'docente' AND activo`));
      const suma = (valores: Record<string, number>) => Object.values(valores).reduce((a, b) => a + b, 0);
      expect(suma(body.proyectosPorEstado)).toBe(await contar('SELECT count(*)::int AS n FROM proyecto'));
      expect(suma(body.postulacionesPorEstado)).toBe(await contar('SELECT count(*)::int AS n FROM postulacion'));
      expect(body.proyectosPorEstado.publicado).toBeGreaterThan(0);
    });

    it('el dashboard (RF-11) trae los cinco bloques con la forma del contrato', async () => {
      const { idConfiguracion } = (await t.http().get('/api/matching/configuraciones').set(admin).expect(200)).body[0];
      const evaluacion = (
        await t.http().post('/api/matching/evaluaciones').set(admin).send({ idConfiguracion }).expect(201)
      ).body;

      const { body } = await t.http().get('/api/reportes/dashboard').set(admin).expect(200);
      const { ranking, evolucion } = body.tecnologiasDemandadas;
      expect(ranking[0]).toEqual({
        idTecnologia: expect.any(Number),
        tecnologia: expect.any(String),
        categoria: expect.any(String),
        cantidadProyectos: expect.any(Number),
        cantidadObligatoria: expect.any(Number),
      });
      const cantidades = ranking.map((r: { cantidadProyectos: number }) => r.cantidadProyectos);
      expect(cantidades).toEqual([...cantidades].sort((a, b) => b - a));
      expect(evolucion[0]).toEqual({ mes: expect.stringMatching(/^\d{4}-\d{2}-01$/), tecnologia: expect.any(String), cantidadProyectos: expect.any(Number) });

      expect(body.matchPorCarreraAnio[0]).toEqual({
        carrera: expect.any(String),
        anioCursada: expect.any(Number),
        totalEstudiantes: expect.any(Number),
        conRecomendacion: expect.any(Number),
        conProyecto: expect.any(Number),
        pctConRecomendacion: expect.any(Number),
        pctConProyecto: expect.any(Number),
      });
      expect(body.tiempoPrimerProyecto).toEqual({ promedioDias: expect.any(Number), estudiantes: expect.any(Number) });
      expect(body.embudo[0]).toMatchObject({ mes: expect.stringMatching(/^\d{4}-\d{2}-01$/), postulaciones: expect.any(Number) });
      expect(body.evaluacionMotor).toContainEqual({
        configuracion: evaluacion.configuracion,
        precisionGlobal: evaluacion.precisionGlobal,
        recallGlobal: evaluacion.recallGlobal,
        precisionTopK: evaluacion.precisionTopK,
        k: 5,
      });
    });

    it('las estadísticas públicas no piden sesión y coinciden con el resumen', async () => {
      const resumen = (await t.http().get('/api/reportes/resumen').set(admin).expect(200)).body;
      const { body } = await t.http().get('/api/publico/estadisticas').expect(200);
      const suma = (valores: Record<string, number>) => Object.values(valores).reduce((a, b) => a + b, 0);
      expect(body).toEqual({
        estudiantes: resumen.estudiantesActivos,
        proyectosPublicados: resumen.proyectosPorEstado.publicado,
        publicadores: resumen.empresasActivas + resumen.docentesActivos,
        postulaciones: suma(resumen.postulacionesPorEstado),
      });
    });
  });
});
