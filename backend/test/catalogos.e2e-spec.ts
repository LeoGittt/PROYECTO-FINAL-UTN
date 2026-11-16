import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AppDePrueba,
  conSesion,
  crearAppDePrueba,
  iniciarSesion,
  USUARIOS_SEMILLA,
} from './ayudantes/app.js';

interface Tecnologia {
  idTecnologia: number;
  nombre: string;
  categoria: string;
  descripcion: string | null;
}

describe('Catálogos (e2e)', () => {
  let t: AppDePrueba;
  let tokenAdmin: string;

  const contar = async (tabla: string): Promise<number> => {
    const { rows } = await t.db.query<{ total: number }>(`SELECT count(*) AS total FROM ${tabla}`);
    return rows[0].total;
  };

  beforeAll(async () => {
    t = await crearAppDePrueba();
    tokenAdmin = await iniciarSesion(t.http(), USUARIOS_SEMILLA.administrador);
  });
  afterAll(async () => {
    await t.cerrar();
  });

  describe('lectura pública (sin token)', () => {
    it('GET /api/catalogos/carreras devuelve las tres carreras del seed', async () => {
      const respuesta = await t.http().get('/api/catalogos/carreras').expect(200);
      expect(respuesta.body).toHaveLength(3);
      expect(respuesta.body[0]).toEqual({
        idCarrera: expect.any(Number),
        nombre: 'Tecnicatura Universitaria en Programación',
        duracionAnios: 2,
      });
      expect(respuesta.body.map((c: { duracionAnios: number }) => c.duracionAnios)).toEqual([2, 5, 5]);
    });

    it('GET /api/catalogos/materias devuelve todas las materias, con su carrera y año del plan', async () => {
      const respuesta = await t.http().get('/api/catalogos/materias').expect(200);
      expect(respuesta.body).toHaveLength(await contar('materia'));
      expect(respuesta.body.length).toBeGreaterThan(10);
      const { cuatrimestre, ...resto } = respuesta.body[0];
      expect(resto).toEqual({
        idMateria: expect.any(Number),
        idCarrera: expect.any(Number),
        nombre: expect.any(String),
        anioPlan: expect.any(Number),
      });
      // Las materias anuales no tienen cuatrimestre.
      expect(cuatrimestre === null || typeof cuatrimestre === 'number').toBe(true);
    });

    it('GET /api/catalogos/materias?idCarrera= filtra por carrera', async () => {
      const carreras = (await t.http().get('/api/catalogos/carreras').expect(200)).body as Array<{
        idCarrera: number;
      }>;
      const todas = (await t.http().get('/api/catalogos/materias').expect(200)).body as Array<{
        idCarrera: number;
      }>;
      for (const { idCarrera } of carreras) {
        const respuesta = await t
          .http()
          .get('/api/catalogos/materias')
          .query({ idCarrera })
          .expect(200);
        const esperadas = todas.filter((m) => m.idCarrera === idCarrera).length;
        expect(esperadas).toBeGreaterThan(0);
        expect(respuesta.body).toHaveLength(esperadas);
        expect(respuesta.body.every((m: { idCarrera: number }) => m.idCarrera === idCarrera)).toBe(true);
      }
    });

    it('una carrera que no existe da una lista vacía', async () => {
      const respuesta = await t.http().get('/api/catalogos/materias?idCarrera=99999').expect(200);
      expect(respuesta.body).toEqual([]);
    });

    it.each(['abc', '0', '-2', '1.5'])('idCarrera=%s responde 400 con details', async (valor) => {
      const respuesta = await t.http().get(`/api/catalogos/materias?idCarrera=${valor}`).expect(400);
      expect(respuesta.body.details).toEqual([{ campo: 'idCarrera', mensaje: expect.any(String) }]);
    });

    it('GET /api/catalogos/tecnologias devuelve las 43 del seed, agrupables por categoría', async () => {
      const respuesta = await t.http().get('/api/catalogos/tecnologias').expect(200);
      expect(respuesta.body).toHaveLength(43);
      expect(respuesta.body).toContainEqual({
        idTecnologia: expect.any(Number),
        nombre: 'TypeScript',
        categoria: 'lenguaje',
        descripcion: null,
      });
      // Vienen agrupadas: cada categoría forma un único bloque.
      const categorias = respuesta.body.map((x: Tecnologia) => x.categoria) as string[];
      const bloques = categorias.filter((c, i) => i === 0 || c !== categorias[i - 1]);
      expect(new Set(bloques).size).toBe(bloques.length);
      expect(bloques.length).toBeGreaterThan(3);
    });

    it('GET /api/catalogos/habilidades devuelve las 8 del seed, ordenadas por nombre', async () => {
      const respuesta = await t.http().get('/api/catalogos/habilidades').expect(200);
      expect(respuesta.body).toHaveLength(8);
      expect(respuesta.body[0]).toEqual({
        idHabilidad: expect.any(Number),
        nombre: expect.any(String),
        descripcion: expect.any(String),
      });
      const nombres = respuesta.body.map((h: { nombre: string }) => h.nombre) as string[];
      expect(nombres).toEqual([...nombres].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'es')));
    });
  });

  describe('POST /api/admin/tecnologias', () => {
    it('el administrador crea una tecnología (201) y aparece en el catálogo público', async () => {
      const respuesta = await t
        .http()
        .post('/api/admin/tecnologias')
        .set(conSesion(tokenAdmin))
        .send({ nombre: '  Rust ', categoria: 'lenguaje', descripcion: 'Lenguaje de sistemas' })
        .expect(201);
      expect(respuesta.body).toEqual({
        idTecnologia: expect.any(Number),
        nombre: 'Rust',
        categoria: 'lenguaje',
        descripcion: 'Lenguaje de sistemas',
      });

      const catalogo = (await t.http().get('/api/catalogos/tecnologias').expect(200)).body as Tecnologia[];
      expect(catalogo).toContainEqual(respuesta.body);
      const { rows } = await t.db.query<{ nombre: string }>(
        `SELECT nombre FROM tecnologia WHERE id_tecnologia = $1`,
        [respuesta.body.idTecnologia],
      );
      expect(rows[0].nombre).toBe('Rust');
    });

    it('la descripción es opcional', async () => {
      const respuesta = await t
        .http()
        .post('/api/admin/tecnologias')
        .set(conSesion(tokenAdmin))
        .send({ nombre: 'Zig', categoria: 'lenguaje' })
        .expect(201);
      expect(respuesta.body.descripcion).toBeNull();
    });

    it('rechaza un nombre repetido (409), sin distinguir mayúsculas', async () => {
      for (const nombre of ['TypeScript', 'typescript', 'TYPESCRIPT ']) {
        const respuesta = await t
          .http()
          .post('/api/admin/tecnologias')
          .set(conSesion(tokenAdmin))
          .send({ nombre, categoria: 'lenguaje' })
          .expect(409);
        expect(respuesta.body).toEqual({
          statusCode: 409,
          error: 'Conflict',
          message: 'Ya existe una tecnología con ese nombre',
          details: [{ campo: 'nombre', mensaje: 'Ya existe una tecnología con ese nombre' }],
        });
      }
    });

    it('rechaza datos inválidos (400 con details): nombre vacío y categoría inexistente', async () => {
      const respuesta = await t
        .http()
        .post('/api/admin/tecnologias')
        .set(conSesion(tokenAdmin))
        .send({ nombre: '   ', categoria: 'magia' })
        .expect(400);
      expect(respuesta.body.details.map((d: { campo: string }) => d.campo)).toEqual(['nombre', 'categoria']);
    });

    it('sin token responde 401', async () => {
      await t.http().post('/api/admin/tecnologias').send({ nombre: 'Go', categoria: 'lenguaje' }).expect(401);
    });

    it.each(['estudiante', 'empresa', 'docente'] as const)('el rol %s no puede crear (403)', async (rol) => {
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA[rol]);
      await t
        .http()
        .post('/api/admin/tecnologias')
        .set(conSesion(token))
        .send({ nombre: `Intruso ${rol}`, categoria: 'lenguaje' })
        .expect(403);
      const { rows } = await t.db.query(`SELECT 1 FROM tecnologia WHERE nombre = $1`, [`Intruso ${rol}`]);
      expect(rows).toHaveLength(0);
    });
  });

  describe('PUT /api/admin/tecnologias/:id', () => {
    const crear = async (nombre: string): Promise<Tecnologia> =>
      (
        await t
          .http()
          .post('/api/admin/tecnologias')
          .set(conSesion(tokenAdmin))
          .send({ nombre, categoria: 'devops' })
          .expect(201)
      ).body;

    it('actualiza nombre, categoría y descripción', async () => {
      const creada = await crear('Terraform');
      const respuesta = await t
        .http()
        .put(`/api/admin/tecnologias/${creada.idTecnologia}`)
        .set(conSesion(tokenAdmin))
        .send({ nombre: 'Terraform IaC', categoria: 'backend', descripcion: 'Infraestructura como código' })
        .expect(200);
      expect(respuesta.body).toEqual({
        idTecnologia: creada.idTecnologia,
        nombre: 'Terraform IaC',
        categoria: 'backend',
        descripcion: 'Infraestructura como código',
      });
    });

    it('permite guardar con el mismo nombre (no choca consigo misma)', async () => {
      const creada = await crear('Pulumi');
      await t
        .http()
        .put(`/api/admin/tecnologias/${creada.idTecnologia}`)
        .set(conSesion(tokenAdmin))
        .send({ nombre: 'PULUMI', categoria: 'devops' })
        .expect(200);
    });

    it('responde 404 si la tecnología no existe', async () => {
      const respuesta = await t
        .http()
        .put('/api/admin/tecnologias/999999')
        .set(conSesion(tokenAdmin))
        .send({ nombre: 'Nada', categoria: 'lenguaje' })
        .expect(404);
      expect(respuesta.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'La tecnología no existe',
      });
    });

    it('responde 409 si el nombre ya lo usa otra tecnología, y no cambia nada', async () => {
      const creada = await crear('Ansible');
      await t
        .http()
        .put(`/api/admin/tecnologias/${creada.idTecnologia}`)
        .set(conSesion(tokenAdmin))
        .send({ nombre: 'python', categoria: 'devops' })
        .expect(409);
      const { rows } = await t.db.query<{ nombre: string }>(
        `SELECT nombre FROM tecnologia WHERE id_tecnologia = $1`,
        [creada.idTecnologia],
      );
      expect(rows[0].nombre).toBe('Ansible');
    });

    it('un id que no es un entero positivo responde 400', async () => {
      const respuesta = await t
        .http()
        .put('/api/admin/tecnologias/abc')
        .set(conSesion(tokenAdmin))
        .send({ nombre: 'X', categoria: 'lenguaje' })
        .expect(400);
      expect(respuesta.body.details[0].campo).toBe('id');
    });

    it('un rol que no es administrador recibe 403 y sin token 401', async () => {
      const creada = await crear('Packer');
      const token = await iniciarSesion(t.http(), USUARIOS_SEMILLA.empresa);
      await t
        .http()
        .put(`/api/admin/tecnologias/${creada.idTecnologia}`)
        .set(conSesion(token))
        .send({ nombre: 'Hackeada', categoria: 'devops' })
        .expect(403);
      await t
        .http()
        .put(`/api/admin/tecnologias/${creada.idTecnologia}`)
        .send({ nombre: 'Hackeada', categoria: 'devops' })
        .expect(401);
      const { rows } = await t.db.query<{ nombre: string }>(
        `SELECT nombre FROM tecnologia WHERE id_tecnologia = $1`,
        [creada.idTecnologia],
      );
      expect(rows[0].nombre).toBe('Packer');
    });
  });
});
