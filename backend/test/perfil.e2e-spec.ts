import { Logger } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PerfilesService } from '../src/perfiles/aplicacion/perfiles.service.js';
import {
  type AppDePrueba,
  conSesion,
  crearAppDePrueba,
  iniciarSesion,
  registrarUsuario,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';

interface Carrera {
  idCarrera: number;
  nombre: string;
  duracionAnios: number;
}
interface Materia {
  idMateria: number;
  idCarrera: number;
  nombre: string;
  anioPlan: number;
}
interface Tecnologia {
  idTecnologia: number;
  nombre: string;
  categoria: string;
}
interface Habilidad {
  idHabilidad: number;
  nombre: string;
}

describe('Perfil propio (e2e)', () => {
  let t: AppDePrueba;
  let tup: Carrera; // 2 años
  let isi: Carrera; // 5 años
  let materiasTup: Materia[];
  let materiasIsi: Materia[];
  let tecnologias: Tecnologia[];
  let habilidades: Habilidad[];

  const nuevoEstudiante = () => registrarUsuario(t.http(), 'estudiante');

  /** Un cuerpo de PUT /perfil válido para un estudiante de la ISI de 3.º año. */
  const perfilIsi = () => ({
    idCarrera: isi.idCarrera,
    anioCursada: 3,
    horasSemanales: 12,
    descripcion: 'Me interesa el desarrollo web',
    proyectosPrevios: 'Un sistema de turnos para el centro de estudiantes',
    githubUrl: 'https://github.com/estudiante',
    tecnologias: [
      { idTecnologia: tecnologias[0].idTecnologia, nivel: 'avanzado' },
      { idTecnologia: tecnologias[1].idTecnologia, nivel: 'basico' },
    ],
    habilidades: [habilidades[0].idHabilidad, habilidades[1].idHabilidad],
    materiasAprobadas: materiasIsi.slice(0, 3).map((m) => m.idMateria),
  });

  beforeAll(async () => {
    t = await crearAppDePrueba();
    const carreras = (await t.http().get('/api/catalogos/carreras')).body as Carrera[];
    tup = carreras.find((c) => c.duracionAnios === 2)!;
    isi = carreras.find((c) => c.duracionAnios === 5)!;
    materiasTup = (await t.http().get('/api/catalogos/materias').query({ idCarrera: tup.idCarrera })).body;
    materiasIsi = (await t.http().get('/api/catalogos/materias').query({ idCarrera: isi.idCarrera })).body;
    tecnologias = (await t.http().get('/api/catalogos/tecnologias')).body;
    habilidades = (await t.http().get('/api/catalogos/habilidades')).body;
  });
  afterAll(async () => {
    await t.cerrar();
  });

  describe('estudiante', () => {
    it('antes de completar el perfil, GET /perfil responde 404', async () => {
      const { token } = await nuevoEstudiante();
      const respuesta = await t.http().get('/api/perfil').set(conSesion(token)).expect(404);
      expect(respuesta.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Todavía no completó su perfil',
      });
    });

    it('PUT /perfil crea el perfil y devuelve el contrato con los nombres del catálogo', async () => {
      const { token, usuario } = await nuevoEstudiante();
      const cuerpo = perfilIsi();
      const respuesta = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo).expect(200);

      expect(respuesta.body).toEqual({
        idEstudiante: expect.any(Number),
        idCarrera: isi.idCarrera,
        anioCursada: 3,
        horasSemanales: 12,
        descripcion: cuerpo.descripcion,
        proyectosPrevios: cuerpo.proyectosPrevios,
        cvUrl: null,
        githubUrl: 'https://github.com/estudiante',
        portfolioUrl: null,
        carrera: isi,
        tecnologias: expect.arrayContaining([
          {
            idTecnologia: tecnologias[0].idTecnologia,
            nombre: tecnologias[0].nombre,
            categoria: tecnologias[0].categoria,
            nivel: 'avanzado',
          },
          {
            idTecnologia: tecnologias[1].idTecnologia,
            nombre: tecnologias[1].nombre,
            categoria: tecnologias[1].categoria,
            nivel: 'basico',
          },
        ]),
        habilidades: expect.arrayContaining([
          { idHabilidad: habilidades[0].idHabilidad, nombre: habilidades[0].nombre },
          { idHabilidad: habilidades[1].idHabilidad, nombre: habilidades[1].nombre },
        ]),
        materiasAprobadas: expect.arrayContaining(
          materiasIsi.slice(0, 3).map((m) => ({
            idMateria: m.idMateria,
            nombre: m.nombre,
            anioPlan: m.anioPlan,
          })),
        ),
      });
      expect(respuesta.body.tecnologias).toHaveLength(2);
      expect(respuesta.body.habilidades).toHaveLength(2);
      expect(respuesta.body.materiasAprobadas).toHaveLength(3);
      // El perfil no es la persona: nada de email, nombre ni idUsuario.
      expect(respuesta.body).not.toHaveProperty('email');
      expect(respuesta.body).not.toHaveProperty('idUsuario');

      // Lo guardado es lo que se lee, tanto en GET /perfil como en GET /auth/yo.
      const leido = await t.http().get('/api/perfil').set(conSesion(token)).expect(200);
      expect(leido.body).toEqual(respuesta.body);
      const yo = await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
      expect(yo.body.usuario).toEqual({ ...usuario, perfilCompleto: true });
      expect(yo.body.perfil).toEqual(respuesta.body);
    });

    it('PUT /perfil con solo lo obligatorio guarda listas vacías y campos en null', async () => {
      const { token } = await nuevoEstudiante();
      const respuesta = await t
        .http()
        .put('/api/perfil')
        .set(conSesion(token))
        .send({ idCarrera: tup.idCarrera, anioCursada: 1, horasSemanales: 5 })
        .expect(200);
      expect(respuesta.body).toMatchObject({
        descripcion: null,
        proyectosPrevios: null,
        cvUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        tecnologias: [],
        habilidades: [],
        materiasAprobadas: [],
      });
    });

    it('un segundo PUT reemplaza el perfil completo y conserva el idEstudiante', async () => {
      const { token } = await nuevoEstudiante();
      const primero = await t.http().put('/api/perfil').set(conSesion(token)).send(perfilIsi()).expect(200);

      const segundo = await t
        .http()
        .put('/api/perfil')
        .set(conSesion(token))
        .send({
          idCarrera: tup.idCarrera,
          anioCursada: 2,
          horasSemanales: 20,
          tecnologias: [{ idTecnologia: tecnologias[2].idTecnologia, nivel: 'intermedio' }],
          habilidades: [habilidades[2].idHabilidad],
          materiasAprobadas: [materiasTup[0].idMateria],
          cvUrl: 'https://drive.example.test/cv.pdf',
        })
        .expect(200);

      expect(segundo.body.idEstudiante).toBe(primero.body.idEstudiante);
      expect(segundo.body).toMatchObject({
        idCarrera: tup.idCarrera,
        anioCursada: 2,
        horasSemanales: 20,
        descripcion: null,
        githubUrl: null,
        cvUrl: 'https://drive.example.test/cv.pdf',
      });
      expect(segundo.body.tecnologias.map((x: Tecnologia) => x.idTecnologia)).toEqual([tecnologias[2].idTecnologia]);
      expect(segundo.body.habilidades.map((x: Habilidad) => x.idHabilidad)).toEqual([habilidades[2].idHabilidad]);
      expect(segundo.body.materiasAprobadas.map((x: Materia) => x.idMateria)).toEqual([materiasTup[0].idMateria]);

      const { rows } = await t.db.query<{ total: number }>(
        `SELECT count(*) AS total FROM perfil_estudiante pe JOIN usuario u ON u.id_usuario = pe.id_usuario WHERE u.email = $1`,
        [(await t.http().get('/api/auth/yo').set(conSesion(token))).body.usuario.email],
      );
      expect(rows[0].total).toBe(1);
    });

    it('tolera enviar las mismas listas dos veces seguidas (idempotente)', async () => {
      const { token } = await nuevoEstudiante();
      const cuerpo = perfilIsi();
      const a = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo).expect(200);
      const b = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo).expect(200);
      expect(b.body).toEqual(a.body);
    });

    it('emite perfil.actualizado con el idEstudiante al guardar', async () => {
      const { token, usuario } = await nuevoEstudiante();
      const escuchar = vi.fn();
      t.eventos.on('perfil.actualizado', escuchar);
      try {
        const respuesta = await t.http().put('/api/perfil').set(conSesion(token)).send(perfilIsi()).expect(200);
        expect(escuchar).toHaveBeenCalledTimes(1);
        expect(escuchar).toHaveBeenCalledWith({
          idUsuario: usuario.idUsuario,
          rol: 'estudiante',
          idEstudiante: respuesta.body.idEstudiante,
        });
      } finally {
        t.eventos.off('perfil.actualizado', escuchar);
      }
    });

    it('un listener del evento que falla no impide guardar el perfil', async () => {
      const { token } = await nuevoEstudiante();
      const fallido = vi.fn(async () => {
        throw new Error('el recálculo falló');
      });
      // El error del listener queda en el log del servidor (acá se captura para no ensuciar la salida).
      const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      t.eventos.on('perfil.actualizado', fallido);
      try {
        await t.http().put('/api/perfil').set(conSesion(token)).send(perfilIsi()).expect(200);
        expect(fallido).toHaveBeenCalled();
        expect(log).toHaveBeenCalledWith(expect.stringContaining('el recálculo falló'));
        await t.http().get('/api/perfil').set(conSesion(token)).expect(200);
      } finally {
        t.eventos.off('perfil.actualizado', fallido);
        log.mockRestore();
      }
    });

    describe('reglas de negocio (422)', () => {
      const rechazar = async (cuerpo: object) => {
        const { token } = await nuevoEstudiante();
        const escuchar = vi.fn();
        t.eventos.on('perfil.actualizado', escuchar);
        try {
          const respuesta = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo).expect(422);
          // Un perfil rechazado no se guarda ni avisa a nadie.
          await t.http().get('/api/perfil').set(conSesion(token)).expect(404);
          expect(escuchar).not.toHaveBeenCalled();
          return respuesta.body;
        } finally {
          t.eventos.off('perfil.actualizado', escuchar);
        }
      };

      it('el año de cursada no puede superar la duración de la carrera (TUP dura 2 años)', async () => {
        const cuerpo = await rechazar({ idCarrera: tup.idCarrera, anioCursada: 3, horasSemanales: 10 });
        expect(cuerpo).toEqual({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'El año de cursada (3) supera la duración de la carrera (2 años)',
          details: [
            { campo: 'anioCursada', mensaje: 'El año de cursada (3) supera la duración de la carrera (2 años)' },
          ],
        });
      });

      it('tampoco en una carrera de 5 años con 6.º año', async () => {
        const cuerpo = await rechazar({ idCarrera: isi.idCarrera, anioCursada: 6, horasSemanales: 10 });
        expect(cuerpo.details[0].campo).toBe('anioCursada');
      });

      it('el último año de la carrera sí se acepta', async () => {
        const { token } = await nuevoEstudiante();
        await t
          .http()
          .put('/api/perfil')
          .set(conSesion(token))
          .send({ idCarrera: tup.idCarrera, anioCursada: 2, horasSemanales: 10 })
          .expect(200);
      });

      it('las materias aprobadas tienen que ser de la carrera elegida', async () => {
        const cuerpo = await rechazar({
          idCarrera: tup.idCarrera,
          anioCursada: 2,
          horasSemanales: 10,
          materiasAprobadas: [materiasTup[0].idMateria, materiasIsi[0].idMateria],
        });
        expect(cuerpo.details).toEqual([
          {
            campo: 'materiasAprobadas',
            mensaje: `Las materias con id ${materiasIsi[0].idMateria} no pertenecen a la carrera elegida`,
          },
        ]);
      });

      it('una materia que no existe', async () => {
        const cuerpo = await rechazar({
          idCarrera: tup.idCarrera,
          anioCursada: 1,
          horasSemanales: 10,
          materiasAprobadas: [999999],
        });
        expect(cuerpo.details).toEqual([
          { campo: 'materiasAprobadas', mensaje: 'Las materias con id 999999 no existen' },
        ]);
      });

      it('una tecnología que no existe', async () => {
        const cuerpo = await rechazar({
          idCarrera: tup.idCarrera,
          anioCursada: 1,
          horasSemanales: 10,
          tecnologias: [{ idTecnologia: 999999, nivel: 'basico' }],
        });
        expect(cuerpo.details).toEqual([
          { campo: 'tecnologias', mensaje: 'Las tecnologías con id 999999 no existen' },
        ]);
      });

      it('una habilidad que no existe', async () => {
        const cuerpo = await rechazar({
          idCarrera: tup.idCarrera,
          anioCursada: 1,
          horasSemanales: 10,
          habilidades: [999999],
        });
        expect(cuerpo.details).toEqual([
          { campo: 'habilidades', mensaje: 'Las habilidades con id 999999 no existen' },
        ]);
      });

      it('una carrera que no existe', async () => {
        const cuerpo = await rechazar({ idCarrera: 999999, anioCursada: 1, horasSemanales: 10 });
        expect(cuerpo.details).toEqual([{ campo: 'idCarrera', mensaje: 'La carrera indicada no existe' }]);
      });

      it('con varios problemas los informa todos y usa un mensaje general', async () => {
        const cuerpo = await rechazar({
          idCarrera: tup.idCarrera,
          anioCursada: 5,
          horasSemanales: 10,
          materiasAprobadas: [999999],
          tecnologias: [{ idTecnologia: 999999, nivel: 'basico' }],
          habilidades: [999999],
        });
        expect(cuerpo.message).toBe('El perfil tiene datos que no cumplen las reglas del sistema');
        expect(cuerpo.details.map((d: { campo: string }) => d.campo)).toEqual([
          'anioCursada',
          'materiasAprobadas',
          'tecnologias',
          'habilidades',
        ]);
      });
    });

    describe('validación de formato (400)', () => {
      const rechazar = async (cuerpo: unknown) => {
        const { token } = await nuevoEstudiante();
        const respuesta = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo as object).expect(400);
        await t.http().get('/api/perfil').set(conSesion(token)).expect(404);
        return respuesta.body;
      };
      const base = () => ({ idCarrera: tup.idCarrera, anioCursada: 1, horasSemanales: 10 });

      it('sin cuerpo informa los tres campos obligatorios', async () => {
        const cuerpo = await rechazar({});
        expect(cuerpo).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Los datos enviados no son válidos',
          details: [
            { campo: 'idCarrera', mensaje: 'Es obligatorio' },
            { campo: 'anioCursada', mensaje: 'Es obligatorio' },
            { campo: 'horasSemanales', mensaje: 'Es obligatorio' },
          ],
        });
      });

      it('el cuerpo se valida según el rol: un estudiante no puede mandar datos de empresa', async () => {
        const cuerpo = await rechazar({ nombreEmpresa: 'X', sector: 'Y', contacto: 'z@z.test' });
        expect(cuerpo.details.map((d: { campo: string }) => d.campo)).toEqual([
          'idCarrera',
          'anioCursada',
          'horasSemanales',
        ]);
      });

      it.each([
        ['anioCursada', 0],
        ['anioCursada', 7],
        ['anioCursada', 1.5],
        ['anioCursada', '2'],
        ['horasSemanales', 0],
        ['horasSemanales', 61],
        ['idCarrera', -1],
      ])('rechaza %s = %j', async (campo, valor) => {
        const cuerpo = await rechazar({ ...base(), [campo]: valor });
        expect(cuerpo.details).toEqual([{ campo, mensaje: expect.any(String) }]);
      });

      it('rechaza tecnologías repetidas, con nivel inválido o mal formadas', async () => {
        const repetidas = await rechazar({
          ...base(),
          tecnologias: [
            { idTecnologia: tecnologias[0].idTecnologia, nivel: 'basico' },
            { idTecnologia: tecnologias[0].idTecnologia, nivel: 'avanzado' },
          ],
        });
        expect(repetidas.details).toEqual([{ campo: 'tecnologias', mensaje: 'No puede haber tecnologías repetidas' }]);

        const nivel = await rechazar({
          ...base(),
          tecnologias: [{ idTecnologia: tecnologias[0].idTecnologia, nivel: 'experto' }],
        });
        expect(nivel.details[0].campo).toBe('tecnologias.0.nivel');

        const forma = await rechazar({ ...base(), tecnologias: [tecnologias[0].idTecnologia] });
        expect(forma.details[0].campo).toBe('tecnologias.0');
      });

      it('rechaza habilidades y materias repetidas', async () => {
        const cuerpo = await rechazar({
          ...base(),
          habilidades: [habilidades[0].idHabilidad, habilidades[0].idHabilidad],
          materiasAprobadas: [materiasTup[0].idMateria, materiasTup[0].idMateria],
        });
        expect(cuerpo.details.map((d: { campo: string }) => d.campo)).toEqual(['habilidades', 'materiasAprobadas']);
      });

      it.each(['javascript:alert(document.cookie)', 'data:text/html;base64,PHNjcmlwdD4=', 'ftp://x.test/cv'])(
        'los enlaces solo pueden ser http o https: rechaza %s',
        async (peligroso) => {
          const cuerpo = await rechazar({
            ...base(),
            cvUrl: peligroso,
            githubUrl: peligroso,
            portfolioUrl: peligroso,
          });
          expect(cuerpo.details.map((d: { campo: string }) => d.campo)).toEqual(['cvUrl', 'githubUrl', 'portfolioUrl']);
        },
      );

      it('limita el largo de los textos', async () => {
        const cuerpo = await rechazar({ ...base(), descripcion: 'x'.repeat(2001) });
        expect(cuerpo.details).toEqual([{ campo: 'descripcion', mensaje: 'Debe tener como máximo 2000 caracteres' }]);
      });
    });

    it('un texto con HTML se guarda tal cual y se devuelve como dato (el escape es cosa de quien lo muestra)', async () => {
      const { token } = await nuevoEstudiante();
      const respuesta = await t
        .http()
        .put('/api/perfil')
        .set(conSesion(token))
        .send({ ...perfilIsi(), descripcion: '<img src=x onerror=alert(1)> y \'; DROP TABLE usuario; --' })
        .expect(200);
      expect(respuesta.body.descripcion).toBe('<img src=x onerror=alert(1)> y \'; DROP TABLE usuario; --');
      await t.http().get('/api/catalogos/carreras').expect(200);
      const { rows } = await t.db.query<{ total: number }>(`SELECT count(*) AS total FROM usuario`);
      expect(rows[0].total).toBeGreaterThan(29);
    });
  });

  describe('empresa', () => {
    const cuerpo = {
      nombreEmpresa: 'Andes Software',
      sector: 'Software',
      descripcion: 'Desarrollo a medida',
      contacto: 'rrhh@andes.test',
      sitioWeb: 'https://andes.test',
    };

    it('GET /perfil responde 404 hasta que lo completa; PUT lo crea y GET lo devuelve', async () => {
      const { token, usuario } = await registrarUsuario(t.http(), 'empresa');
      await t.http().get('/api/perfil').set(conSesion(token)).expect(404);

      const escuchar = vi.fn();
      t.eventos.on('perfil.actualizado', escuchar);
      try {
        const respuesta = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo).expect(200);
        expect(respuesta.body).toEqual({ idEmpresa: expect.any(Number), ...cuerpo });
        expect(escuchar).toHaveBeenCalledWith({
          idUsuario: usuario.idUsuario,
          rol: 'empresa',
          idEstudiante: null,
        });

        const leido = await t.http().get('/api/perfil').set(conSesion(token)).expect(200);
        expect(leido.body).toEqual(respuesta.body);
        const yo = await t.http().get('/api/auth/yo').set(conSesion(token)).expect(200);
        expect(yo.body.usuario.perfilCompleto).toBe(true);
        expect(yo.body.perfil).toEqual(respuesta.body);
      } finally {
        t.eventos.off('perfil.actualizado', escuchar);
      }
    });

    it('un segundo PUT reemplaza los datos y conserva el idEmpresa', async () => {
      const { token } = await registrarUsuario(t.http(), 'empresa');
      const primero = await t.http().put('/api/perfil').set(conSesion(token)).send(cuerpo).expect(200);
      const segundo = await t
        .http()
        .put('/api/perfil')
        .set(conSesion(token))
        .send({ nombreEmpresa: 'Andes Software SA', sector: 'Servicios', contacto: 'otro@andes.test' })
        .expect(200);
      expect(segundo.body).toEqual({
        idEmpresa: primero.body.idEmpresa,
        nombreEmpresa: 'Andes Software SA',
        sector: 'Servicios',
        descripcion: null,
        contacto: 'otro@andes.test',
        sitioWeb: null,
      });
    });

    it('rechaza datos incompletos o inseguros (400 con details)', async () => {
      const { token } = await registrarUsuario(t.http(), 'empresa');
      const vacio = await t.http().put('/api/perfil').set(conSesion(token)).send({}).expect(400);
      expect(vacio.body.details.map((d: { campo: string }) => d.campo)).toEqual(['nombreEmpresa', 'sector', 'contacto']);

      const enlace = await t
        .http()
        .put('/api/perfil')
        .set(conSesion(token))
        .send({ ...cuerpo, sitioWeb: 'javascript:alert(1)' })
        .expect(400);
      expect(enlace.body.details.map((d: { campo: string }) => d.campo)).toEqual(['sitioWeb']);
      await t.http().get('/api/perfil').set(conSesion(token)).expect(404);
    });

    it('el perfil del seed se lee tal cual', async () => {
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa);
      const respuesta = await t.http().get('/api/perfil').set(conSesion(token)).expect(200);
      const { descripcion, sitioWeb, ...obligatorios } = respuesta.body;
      expect(obligatorios).toEqual({
        idEmpresa: expect.any(Number),
        nombreEmpresa: expect.any(String),
        sector: expect.any(String),
        contacto: expect.any(String),
      });
      // Opcionales: texto o null, nunca ausentes.
      for (const opcional of [descripcion, sitioWeb]) {
        expect(opcional === null || typeof opcional === 'string').toBe(true);
      }
    });
  });

  describe('docente', () => {
    it('crea, lee y reemplaza su perfil', async () => {
      const { token, usuario } = await registrarUsuario(t.http(), 'docente');
      await t.http().get('/api/perfil').set(conSesion(token)).expect(404);

      const escuchar = vi.fn();
      t.eventos.on('perfil.actualizado', escuchar);
      try {
        const creado = await t
          .http()
          .put('/api/perfil')
          .set(conSesion(token))
          .send({ catedra: 'Programación II', areaInvestigacion: 'Ingeniería de software', descripcion: 'Dirijo PFI' })
          .expect(200);
        expect(creado.body).toEqual({
          idDocente: expect.any(Number),
          catedra: 'Programación II',
          areaInvestigacion: 'Ingeniería de software',
          descripcion: 'Dirijo PFI',
        });
        expect(escuchar).toHaveBeenCalledWith({
          idUsuario: usuario.idUsuario,
          rol: 'docente',
          idEstudiante: null,
        });

        const reemplazado = await t
          .http()
          .put('/api/perfil')
          .set(conSesion(token))
          .send({ catedra: 'Bases de Datos' })
          .expect(200);
        expect(reemplazado.body).toEqual({
          idDocente: creado.body.idDocente,
          catedra: 'Bases de Datos',
          areaInvestigacion: null,
          descripcion: null,
        });
        const leido = await t.http().get('/api/perfil').set(conSesion(token)).expect(200);
        expect(leido.body).toEqual(reemplazado.body);
      } finally {
        t.eventos.off('perfil.actualizado', escuchar);
      }
    });

    it('rechaza un perfil sin cátedra (400 con details)', async () => {
      const { token } = await registrarUsuario(t.http(), 'docente');
      const respuesta = await t.http().put('/api/perfil').set(conSesion(token)).send({ descripcion: 'x' }).expect(400);
      expect(respuesta.body.details).toEqual([{ campo: 'catedra', mensaje: 'Es obligatorio' }]);
    });
  });

  describe('acceso', () => {
    it('sin token, GET y PUT /perfil responden 401', async () => {
      await t.http().get('/api/perfil').expect(401);
      await t.http().put('/api/perfil').send({}).expect(401);
    });

    it('el administrador no tiene perfil: GET y PUT responden 403', async () => {
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
      await t.http().get('/api/perfil').set(conSesion(token)).expect(403);
      await t.http().put('/api/perfil').set(conSesion(token)).send({ catedra: 'X' }).expect(403);
    });

    it('cada persona solo ve y modifica su propio perfil (no hay forma de indicar otro usuario)', async () => {
      const lucia = await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante);
      const otra = await nuevoEstudiante();
      await t.http().put('/api/perfil').set(conSesion(otra.token)).send(perfilIsi()).expect(200);

      const antes = (await t.http().get('/api/perfil').set(conSesion(lucia)).expect(200)).body;
      // Un `idEstudiante` o `idUsuario` en el cuerpo se ignora: se usa la sesión.
      const intento = await t
        .http()
        .put('/api/perfil')
        .set(conSesion(otra.token))
        .send({ ...perfilIsi(), idEstudiante: antes.idEstudiante, idUsuario: 1 })
        .expect(200);
      expect(intento.body.idEstudiante).not.toBe(antes.idEstudiante);
      const despues = (await t.http().get('/api/perfil').set(conSesion(lucia)).expect(200)).body;
      expect(despues).toEqual(antes);
    });
  });
});

describe('GET /api/estudiantes/:idEstudiante (e2e)', () => {
  let t: AppDePrueba;
  let idEstudiante: number;
  let emailEstudiante: string;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    // Una estudiante nueva, sin postulaciones ni invitaciones: ningún publicador tiene relación con ella.
    const { token, email } = await registrarUsuario(t.http(), 'estudiante');
    const [carrera] = (await t.http().get('/api/catalogos/carreras')).body as Carrera[];
    const perfil = await t
      .http()
      .put('/api/perfil')
      .set(conSesion(token))
      .send({ idCarrera: carrera.idCarrera, anioCursada: 1, horasSemanales: 10 })
      .expect(200);
    idEstudiante = perfil.body.idEstudiante;
    emailEstudiante = email;
  });
  afterAll(async () => {
    await t.cerrar();
  });

  it('un publicador ve el perfil con nombre y apellido, pero sin email si no hay relación con él', async () => {
    for (const rol of ['empresa', 'docente'] as const) {
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA[rol]);
      const respuesta = await t.http().get(`/api/estudiantes/${idEstudiante}`).set(conSesion(token)).expect(200);
      expect(respuesta.body).toMatchObject({
        idEstudiante,
        nombre: expect.any(String),
        apellido: expect.any(String),
        carrera: { idCarrera: expect.any(Number) },
        tecnologias: expect.any(Array),
      });
      expect(respuesta.body).not.toHaveProperty('email');
      expect(JSON.stringify(respuesta.body)).not.toContain(emailEstudiante);
    }
  });

  it('el administrador siempre ve el email', async () => {
    const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
    const respuesta = await t.http().get(`/api/estudiantes/${idEstudiante}`).set(conSesion(token)).expect(200);
    expect(respuesta.body.email).toBe(emailEstudiante);
  });

  it('un estudiante no puede consultar perfiles ajenos (403) y sin token es 401', async () => {
    const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.estudiante);
    await t.http().get(`/api/estudiantes/${idEstudiante}`).set(conSesion(token)).expect(403);
    await t.http().get(`/api/estudiantes/${idEstudiante}`).expect(401);
  });

  it('un estudiante que no existe es 404 y un id mal formado es 400', async () => {
    const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa);
    const inexistente = await t.http().get('/api/estudiantes/999999').set(conSesion(token)).expect(404);
    expect(inexistente.body.message).toBe('El estudiante no existe');
    for (const malo of ['abc', '0', '-1', '1.5']) {
      const respuesta = await t.http().get(`/api/estudiantes/${malo}`).set(conSesion(token)).expect(400);
      expect(respuesta.body.details).toEqual([
        { campo: 'idEstudiante', mensaje: 'Debe ser un número entero positivo' },
      ]);
    }
  });

  it('un estudiante desactivado solo lo ve el administrador', async () => {
    await t.db.query(`UPDATE usuario SET activo = false WHERE email = $1`, [emailEstudiante]);
    try {
      const empresa = await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa);
      await t.http().get(`/api/estudiantes/${idEstudiante}`).set(conSesion(empresa)).expect(404);
      const admin = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
      await t.http().get(`/api/estudiantes/${idEstudiante}`).set(conSesion(admin)).expect(200);
    } finally {
      await t.db.query(`UPDATE usuario SET activo = true WHERE email = $1`, [emailEstudiante]);
    }
  });

  it('el email aparece solo para el publicador que M3 declara relacionado (punto de extensión)', async () => {
    const empresa = await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa);
    const docente = await iniciarSesion(t.http(), USUARIOS_SEMILLA.docente);
    const idUsuarioEmpresa = (await t.http().get('/api/auth/yo').set(conSesion(empresa))).body.usuario.idUsuario;

    const consultas: Array<[number, number]> = [];
    t.app.get(PerfilesService, { strict: false }).registrarFuenteVisibilidadContacto({
      publicadorTieneRelacionConEstudiante: async (idUsuario, id) => {
        consultas.push([idUsuario, id]);
        return idUsuario === idUsuarioEmpresa && id === idEstudiante;
      },
    });

    const conRelacion = await t.http().get(`/api/estudiantes/${idEstudiante}`).set(conSesion(empresa)).expect(200);
    expect(conRelacion.body.email).toBe(emailEstudiante);
    const sinRelacion = await t.http().get(`/api/estudiantes/${idEstudiante}`).set(conSesion(docente)).expect(200);
    expect(sinRelacion.body).not.toHaveProperty('email');
    expect(consultas).toEqual([
      [idUsuarioEmpresa, idEstudiante],
      [expect.any(Number), idEstudiante],
    ]);
  });
});
