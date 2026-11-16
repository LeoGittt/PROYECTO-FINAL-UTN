import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  cuerpoProyecto,
  idsTecnologias,
  type Persona,
} from './ayudantes/datos.js';

describe('Proyectos (e2e)', () => {
  let t: AppDePrueba;
  let empresa: Persona;
  let docente: Persona;
  let estudiante: Persona;
  let admin: string;
  let react: number;
  let docker: number;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    empresa = await crearPublicador(t.http, 'empresa');
    docente = await crearPublicador(t.http, 'docente');
    [react, docker] = await idsTecnologias(t.http(), 'React', 'Docker');
    estudiante = await crearEstudiante(t.http, {
      tecnologias: [{ idTecnologia: react, nivel: 'avanzado' }],
    });
    admin = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
  });
  afterAll(async () => {
    await t.cerrar();
  });

  describe('alta, edición y ciclo de vida', () => {
    it('un borrador solo lo ven su dueño y el admin; al publicarlo lo ve cualquiera', async () => {
      const alta = await t
        .http()
        .post('/api/proyectos')
        .set(conSesion(empresa.token))
        .send(
          cuerpoProyecto({
            titulo: 'Tienda online',
            objetivos: '   ',
            tecnologias: [{ idTecnologia: react, obligatoria: true }],
          }),
        )
        .expect(201);
      expect(alta.body).toMatchObject({
        titulo: 'Tienda online',
        objetivos: null,
        estado: 'borrador',
        fechaPublicacion: null,
        fechaCierre: null,
        publicador: { tipo: 'empresa', idUsuario: empresa.idUsuario, nombre: expect.any(String) },
        tecnologias: [{ idTecnologia: react, nombre: 'React', categoria: 'frontend', obligatoria: true }],
        habilidades: [],
        cantidadPostulaciones: 0,
      });
      const id = alta.body.idProyecto;

      for (const ajeno of [estudiante.token, docente.token]) {
        const oculto = await t.http().get(`/api/proyectos/${id}`).set(conSesion(ajeno)).expect(404);
        expect(oculto.body.message).toBe('El proyecto no existe');
      }
      await t.http().get(`/api/proyectos/${id}`).set(conSesion(admin)).expect(200);

      const publicado = await t
        .http()
        .post(`/api/proyectos/${id}/publicar`)
        .set(conSesion(empresa.token))
        .expect(200);
      expect(publicado.body.estado).toBe('publicado');
      expect(Date.parse(publicado.body.fechaPublicacion)).not.toBeNaN();

      const visto = await t.http().get(`/api/proyectos/${id}`).set(conSesion(estudiante.token)).expect(200);
      expect(visto.body).not.toHaveProperty('cantidadPostulaciones');
      expect(visto.body.compatibilidad).toEqual(expect.any(Number));

      const otraVez = await t
        .http()
        .post(`/api/proyectos/${id}/publicar`)
        .set(conSesion(empresa.token))
        .expect(409);
      expect(otraVez.body.message).toBe('Solo se puede publicar un proyecto en borrador');
    });

    it('alta con `publicar: true` nace publicada', async () => {
      const proyecto = await crearProyecto(t.http(), docente.token);
      expect(proyecto).toMatchObject({ estado: 'publicado', publicador: { tipo: 'docente' } });
    });

    it('la edición reemplaza los datos, las tecnologías y las habilidades', async () => {
      const proyecto = await crearProyecto(t.http(), empresa.token, {
        tecnologias: [{ idTecnologia: react, obligatoria: true }],
        habilidades: [1],
      });
      const editado = await t
        .http()
        .put(`/api/proyectos/${proyecto.idProyecto}`)
        .set(conSesion(empresa.token))
        .send(
          cuerpoProyecto({
            titulo: 'Título nuevo',
            horasSemanales: 20,
            tecnologias: [{ idTecnologia: docker, obligatoria: false }],
          }),
        )
        .expect(200);
      expect(editado.body).toMatchObject({
        idProyecto: proyecto.idProyecto,
        titulo: 'Título nuevo',
        horasSemanales: 20,
        estado: 'publicado',
        tecnologias: [{ idTecnologia: docker, nombre: 'Docker', obligatoria: false }],
        habilidades: [],
      });
    });

    it('recorre los estados válidos y fija la fecha de cierre al finalizar', async () => {
      const { idProyecto } = await crearProyecto(t.http(), empresa.token);
      const cambiar = (estado: string) =>
        t.http().patch(`/api/proyectos/${idProyecto}/estado`).set(conSesion(empresa.token)).send({ estado });

      const enCurso = await cambiar('en_curso').expect(200);
      expect(enCurso.body).toMatchObject({ estado: 'en_curso', fechaCierre: null });
      const invalido = await cambiar('publicado').expect(409);
      expect(invalido.body.message).toBe('Un proyecto en curso no puede pasar a publicado');
      const finalizado = await cambiar('finalizado').expect(200);
      expect(Date.parse(finalizado.body.fechaCierre)).not.toBeNaN();

      // Un proyecto finalizado no se edita ni cambia de estado.
      const edicion = await t
        .http()
        .put(`/api/proyectos/${idProyecto}`)
        .set(conSesion(empresa.token))
        .send(cuerpoProyecto())
        .expect(409);
      expect(edicion.body.message).toBe('Un proyecto finalizado, cancelado o suspendido no se puede editar');
      await cambiar('cancelado').expect(409);
    });

    it('un borrador no se cancela (409): sigue siendo borrador y nadie más lo ve', async () => {
      // La base exige fecha de publicación fuera del borrador: cancelarlo lo haría pasar por publicado.
      const { idProyecto } = await crearProyecto(t.http(), empresa.token, { publicar: false });
      const respuesta = await t
        .http()
        .patch(`/api/proyectos/${idProyecto}/estado`)
        .set(conSesion(empresa.token))
        .send({ estado: 'cancelado' })
        .expect(409);
      expect(respuesta.body.message).toBe('Un proyecto borrador no puede pasar a cancelado');
      const propio = await t.http().get(`/api/proyectos/${idProyecto}`).set(conSesion(empresa.token)).expect(200);
      expect(propio.body).toMatchObject({ estado: 'borrador', fechaPublicacion: null, fechaCierre: null });
      await t.http().get(`/api/proyectos/${idProyecto}`).set(conSesion(estudiante.token)).expect(404);
    });

    it('avisa con eventos al publicar, editar y cambiar de estado', async () => {
      const recibidos: Array<[string, unknown]> = [];
      const nombres = ['proyecto.publicado', 'proyecto.actualizado', 'proyecto.estado_cambiado'];
      const escuchas = nombres.map((nombre) => {
        const escucha = (payload: unknown) => recibidos.push([nombre, payload]);
        t.eventos.on(nombre, escucha);
        return () => t.eventos.off(nombre, escucha);
      });
      try {
        const { idProyecto } = await crearProyecto(t.http(), empresa.token, { titulo: 'Con eventos' });
        await t
          .http()
          .put(`/api/proyectos/${idProyecto}`)
          .set(conSesion(empresa.token))
          .send(cuerpoProyecto({ titulo: 'Con eventos' }))
          .expect(200);
        await t
          .http()
          .patch(`/api/proyectos/${idProyecto}/estado`)
          .set(conSesion(empresa.token))
          .send({ estado: 'en_curso' })
          .expect(200);
        expect(recibidos).toEqual([
          ['proyecto.publicado', { idProyecto, titulo: 'Con eventos' }],
          ['proyecto.actualizado', { idProyecto }],
          [
            'proyecto.estado_cambiado',
            {
              idProyecto,
              titulo: 'Con eventos',
              idUsuarioPublicador: empresa.idUsuario,
              estadoAnterior: 'publicado',
              estadoNuevo: 'en_curso',
            },
          ],
        ]);
      } finally {
        escuchas.forEach((quitar) => quitar());
      }
    });
  });

  describe('permisos y validaciones', () => {
    it('sin sesión es 401; un estudiante o el admin no pueden crear (403)', async () => {
      await t.http().get('/api/proyectos').expect(401);
      await t.http().post('/api/proyectos').send(cuerpoProyecto()).expect(401);
      for (const token of [estudiante.token, admin]) {
        await t.http().post('/api/proyectos').set(conSesion(token)).send(cuerpoProyecto()).expect(403);
      }
    });

    it('solo el dueño edita, publica o cambia el estado (403 para otro publicador)', async () => {
      const { idProyecto } = await crearProyecto(t.http(), empresa.token);
      const otro = conSesion(docente.token);
      const respuesta = await t
        .http()
        .put(`/api/proyectos/${idProyecto}`)
        .set(otro)
        .send(cuerpoProyecto())
        .expect(403);
      expect(respuesta.body.message).toBe('Solo quien publicó el proyecto puede modificarlo');
      await t.http().post(`/api/proyectos/${idProyecto}/publicar`).set(otro).expect(403);
      await t.http().patch(`/api/proyectos/${idProyecto}/estado`).set(otro).send({ estado: 'cancelado' }).expect(403);
    });

    it('400 con un renglón por campo cuando el formato es inválido', async () => {
      const respuesta = await t
        .http()
        .post('/api/proyectos')
        .set(conSesion(empresa.token))
        .send(
          cuerpoProyecto({
            titulo: '',
            horasSemanales: 41,
            modalidad: 'a distancia',
            tecnologias: [
              { idTecnologia: react, obligatoria: true },
              { idTecnologia: react, obligatoria: false },
            ],
          }),
        )
        .expect(400);
      expect(respuesta.body.details.map((d: { campo: string }) => d.campo).sort()).toEqual([
        'horasSemanales',
        'modalidad',
        'tecnologias',
        'titulo',
      ]);
      await t
        .http()
        .patch('/api/proyectos/1/estado')
        .set(conSesion(empresa.token))
        .send({ estado: 'archivado' })
        .expect(400);
    });

    it('422 si una tecnología o una habilidad no existen', async () => {
      const respuesta = await t
        .http()
        .post('/api/proyectos')
        .set(conSesion(empresa.token))
        .send(
          cuerpoProyecto({ tecnologias: [{ idTecnologia: 999999, obligatoria: true }], habilidades: [999999] }),
        )
        .expect(422);
      expect(respuesta.body.details).toEqual([
        { campo: 'tecnologias', mensaje: 'Alguna de las tecnologías no existe' },
        { campo: 'habilidades', mensaje: 'Alguna de las habilidades no existe' },
      ]);
    });

    it('422 si el publicador todavía no completó su perfil', async () => {
      const { token } = await registrarUsuario(t.http(), 'empresa');
      const respuesta = await t.http().post('/api/proyectos').set(conSesion(token)).send(cuerpoProyecto()).expect(422);
      expect(respuesta.body.message).toBe('Debe completar su perfil antes de publicar proyectos');
      await t.http().get('/api/proyectos/mios').set(conSesion(token)).expect(422);
    });

    it('un id mal formado es 400 y uno inexistente es 404', async () => {
      await t.http().get('/api/proyectos/abc').set(conSesion(estudiante.token)).expect(400);
      await t.http().get('/api/proyectos/999999').set(conSesion(estudiante.token)).expect(404);
      await t.http().put('/api/proyectos/999999').set(conSesion(empresa.token)).send(cuerpoProyecto()).expect(404);
    });

    it('valores fuera de rango en la búsqueda son 400, no un error del servidor', async () => {
      const buscar = (query: string) => t.http().get(`/api/proyectos?${query}`).set(conSesion(estudiante.token));
      await buscar('tecnologias=99999999999999999999').expect(400);
      await buscar('pagina=200000000').expect(400);
      await buscar('pagina=10000').expect(200);
    });
  });

  describe('mis proyectos y búsqueda', () => {
    it('GET /proyectos/mios trae solo los propios, con la cantidad de postulaciones, y filtra por estado', async () => {
      const publicador = await crearPublicador(t.http, 'docente');
      const uno = await crearProyecto(t.http(), publicador.token);
      const dos = await crearProyecto(t.http(), publicador.token, { publicar: false });

      const todos = await t.http().get('/api/proyectos/mios').set(conSesion(publicador.token)).expect(200);
      expect(todos.body.map((p: { idProyecto: number }) => p.idProyecto)).toEqual([dos.idProyecto, uno.idProyecto]);
      expect(todos.body[0].cantidadPostulaciones).toBe(0);

      const borradores = await t
        .http()
        .get('/api/proyectos/mios?estado=borrador')
        .set(conSesion(publicador.token))
        .expect(200);
      expect(borradores.body.map((p: { idProyecto: number }) => p.idProyecto)).toEqual([dos.idProyecto]);
      await t.http().get('/api/proyectos/mios').set(conSesion(estudiante.token)).expect(403);
    });

    it('la búsqueda solo trae publicados y aplica cada filtro', async () => {
      const marca = `Zeta${Date.now()}`;
      const a = await crearProyecto(t.http(), empresa.token, {
        titulo: `${marca} frontend`,
        modalidad: 'presencial',
        horasSemanales: 8,
        anioMinimo: 1,
        tecnologias: [{ idTecnologia: react, obligatoria: true }],
      });
      const b = await crearProyecto(t.http(), empresa.token, {
        titulo: `${marca} infraestructura`,
        tipoRetribucion: 'remunerado',
        horasSemanales: 30,
        anioMinimo: 4,
        tecnologias: [{ idTecnologia: docker, obligatoria: true }],
      });
      await crearProyecto(t.http(), empresa.token, { titulo: `${marca} borrador`, publicar: false });

      const buscar = async (filtros: Record<string, string | number>) => {
        const respuesta = await t
          .http()
          .get('/api/proyectos')
          .query({ q: marca, ...filtros })
          .set(conSesion(estudiante.token))
          .expect(200);
        return respuesta.body.items.map((p: { idProyecto: number }) => p.idProyecto).sort();
      };
      expect(await buscar({})).toEqual([a.idProyecto, b.idProyecto].sort());
      expect(await buscar({ tecnologias: `${docker}` })).toEqual([b.idProyecto]);
      expect(await buscar({ tecnologias: `${react},${docker}` })).toEqual([a.idProyecto, b.idProyecto].sort());
      expect(await buscar({ modalidad: 'presencial' })).toEqual([a.idProyecto]);
      expect(await buscar({ tipoRetribucion: 'remunerado' })).toEqual([b.idProyecto]);
      expect(await buscar({ horasMax: 10 })).toEqual([a.idProyecto]);
      expect(await buscar({ anioMax: 3 })).toEqual([a.idProyecto]);
    });

    it('pagina los resultados y no trata `%` como comodín', async () => {
      const marca = `Pagina${Date.now()}`;
      for (let i = 0; i < 3; i += 1) {
        await crearProyecto(t.http(), empresa.token, { titulo: `${marca} ${i}` });
      }
      const pagina = await t
        .http()
        .get('/api/proyectos')
        .query({ q: marca, pagina: 2, tamano: 2 })
        .set(conSesion(estudiante.token))
        .expect(200);
      expect(pagina.body).toMatchObject({ total: 3, pagina: 2, tamano: 2 });
      expect(pagina.body.items).toHaveLength(1);

      const comodin = await t.http().get('/api/proyectos').query({ q: '%' }).set(conSesion(estudiante.token)).expect(200);
      expect(comodin.body.total).toBe(0);
      await t.http().get('/api/proyectos').query({ tecnologias: 'abc' }).set(conSesion(estudiante.token)).expect(400);
    });
  });
});
