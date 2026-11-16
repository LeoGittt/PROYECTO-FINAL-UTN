import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from '../src/comunicacion/email.service.js';
import { type AppDePrueba, conSesion, crearAppDePrueba } from './ayudantes/app.js';
import { crearEstudiante, crearProyecto, crearPublicador, idsTecnologias, type Persona } from './ayudantes/datos.js';

interface Notificacion {
  idNotificacion: number;
  tipo: string;
  mensaje: string;
  urlReferencia: string | null;
  fecha: string;
  leida: boolean;
}

describe('Notificaciones (e2e)', () => {
  let t: AppDePrueba;
  let react: number;
  let empresa: Persona;
  let ana: Persona & { idEstudiante: number };
  let beto: Persona & { idEstudiante: number };

  const bandeja = async (persona: Persona, query = '') =>
    (await t.http().get(`/api/notificaciones${query}`).set(conSesion(persona.token)).expect(200)).body as {
      items: Notificacion[];
      noLeidas: number;
    };
  const ultima = async (persona: Persona) => (await bandeja(persona)).items[0];
  const postular = async (persona: Persona, idProyecto: number) =>
    (await t.http().post('/api/postulaciones').set(conSesion(persona.token)).send({ idProyecto }).expect(201)).body;
  const cambiarPostulacion = (persona: Persona, idPostulacion: number, estado: string) =>
    t.http().patch(`/api/postulaciones/${idPostulacion}/estado`).set(conSesion(persona.token)).send({ estado }).expect(200);

  beforeAll(async () => {
    t = await crearAppDePrueba();
    [react] = await idsTecnologias(t.http(), 'React');
    empresa = await crearPublicador(t.http);
    const datos = { tecnologias: [{ idTecnologia: react, nivel: 'avanzado' as const }], anioCursada: 5, horasSemanales: 40 };
    ana = await crearEstudiante(t.http, datos);
    beto = await crearEstudiante(t.http, datos);
  });
  afterAll(async () => {
    await t.cerrar();
  });
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('las notificaciones del seed usan solo los tipos del contrato y pantallas que existen', async () => {
    const { rows } = await t.db.query<{ tipo: string; urlReferencia: string | null }>(
      'SELECT DISTINCT tipo, url_referencia FROM notificacion',
    );
    const tipos = ['nuevo_match', 'invitacion', 'nueva_postulacion', 'cambio_estado_postulacion', 'cambio_estado_proyecto'];
    for (const fila of rows) {
      expect(tipos).toContain(fila.tipo);
      expect(fila.urlReferencia).toMatch(/^\/(proyectos\/\d+|mis-proyectos\/\d+|postulaciones|invitaciones)$/);
    }
  });

  it('sin sesión es 401', async () => {
    await t.http().get('/api/notificaciones').expect(401);
    await t.http().post('/api/notificaciones/1/leer').expect(401);
    await t.http().post('/api/notificaciones/leer-todas').expect(401);
  });

  it('un proyecto nuevo compatible avisa al estudiante (match.nuevo)', async () => {
    const { idProyecto, titulo } = await crearProyecto(t.http(), empresa.token, {
      tecnologias: [{ idTecnologia: react, obligatoria: true }],
    });
    expect(await ultima(ana)).toEqual({
      idNotificacion: expect.any(Number),
      tipo: 'nuevo_match',
      mensaje: `Hay un proyecto nuevo compatible con tu perfil: «${titulo}» (100 %).`,
      urlReferencia: `/proyectos/${idProyecto}`,
      fecha: expect.any(String),
      leida: false,
    });
  });

  it('una postulación avisa al publicador y cada cambio de estado, al estudiante', async () => {
    const { idProyecto, titulo } = await crearProyecto(t.http(), empresa.token);
    const postulacion = await postular(ana, idProyecto);
    expect(await ultima(empresa)).toMatchObject({
      tipo: 'nueva_postulacion',
      mensaje: `Recibiste una postulación nueva en «${titulo}».`,
      urlReferencia: `/mis-proyectos/${idProyecto}`,
    });

    await cambiarPostulacion(empresa, postulacion.idPostulacion, 'en_revision');
    expect(await ultima(ana)).toMatchObject({
      tipo: 'cambio_estado_postulacion',
      mensaje: `Tu postulación a «${titulo}» pasó a «en revisión».`,
      urlReferencia: '/postulaciones',
    });
  });

  it('si el estudiante retira su postulación, el aviso es para el publicador y no para él', async () => {
    const { idProyecto, titulo } = await crearProyecto(t.http(), empresa.token);
    const postulacion = await postular(beto, idProyecto);
    const antes = (await bandeja(beto)).items.length;
    await cambiarPostulacion(beto, postulacion.idPostulacion, 'retirada');
    expect(await ultima(empresa)).toMatchObject({
      tipo: 'cambio_estado_postulacion',
      mensaje: `Un estudiante retiró su postulación a «${titulo}».`,
    });
    expect((await bandeja(beto)).items).toHaveLength(antes);
  });

  it('una invitación avisa al estudiante', async () => {
    const { idProyecto, titulo } = await crearProyecto(t.http(), empresa.token);
    await t
      .http()
      .post('/api/invitaciones')
      .set(conSesion(empresa.token))
      .send({ idProyecto, idEstudiante: beto.idEstudiante })
      .expect(201);
    expect(await ultima(beto)).toMatchObject({
      tipo: 'invitacion',
      mensaje: `Te invitaron a postularte a «${titulo}».`,
      urlReferencia: '/invitaciones',
    });
  });

  it('un cambio de estado del proyecto avisa solo a quienes tienen una postulación activa', async () => {
    const { idProyecto, titulo } = await crearProyecto(t.http(), empresa.token);
    await postular(ana, idProyecto);
    const deBeto = await postular(beto, idProyecto);
    await cambiarPostulacion(beto, deBeto.idPostulacion, 'retirada');
    const antesBeto = (await bandeja(beto)).items.length;

    await t
      .http()
      .patch(`/api/proyectos/${idProyecto}/estado`)
      .set(conSesion(empresa.token))
      .send({ estado: 'en_curso' })
      .expect(200);
    expect(await ultima(ana)).toMatchObject({
      tipo: 'cambio_estado_proyecto',
      mensaje: `El proyecto «${titulo}» pasó a «en curso».`,
      urlReferencia: '/postulaciones',
    });
    expect((await bandeja(beto)).items).toHaveLength(antesBeto);
  });

  it('marca una o todas como leídas, filtra las no leídas y respeta el límite', async () => {
    const inicio = await bandeja(ana);
    expect(inicio.noLeidas).toBeGreaterThanOrEqual(3);
    const primera = inicio.items[0];

    await t.http().post(`/api/notificaciones/${primera.idNotificacion}/leer`).set(conSesion(ana.token)).expect(204);
    const despues = await bandeja(ana);
    expect(despues.noLeidas).toBe(inicio.noLeidas - 1);
    expect(despues.items.find((n) => n.idNotificacion === primera.idNotificacion)?.leida).toBe(true);
    expect((await bandeja(ana, '?soloNoLeidas=true')).items.map((n) => n.idNotificacion)).not.toContain(
      primera.idNotificacion,
    );
    expect((await bandeja(ana, '?limite=1')).items).toHaveLength(1);

    // La de otro usuario no existe para quien no es su dueño.
    await t.http().post(`/api/notificaciones/${primera.idNotificacion}/leer`).set(conSesion(beto.token)).expect(404);

    await t.http().post('/api/notificaciones/leer-todas').set(conSesion(ana.token)).expect(204);
    const final = await bandeja(ana);
    expect(final.noLeidas).toBe(0);
    expect(final.items.every((n) => n.leida)).toBe(true);
    // Leer todas no toca las de otro usuario.
    expect((await bandeja(beto)).noLeidas).toBeGreaterThan(0);
  });

  it('valida los parámetros (400)', async () => {
    await t.http().get('/api/notificaciones?limite=0').set(conSesion(ana.token)).expect(400);
    await t.http().get('/api/notificaciones?limite=101').set(conSesion(ana.token)).expect(400);
    await t.http().get('/api/notificaciones?soloNoLeidas=quizas').set(conSesion(ana.token)).expect(400);
    await t.http().post('/api/notificaciones/abc/leer').set(conSesion(ana.token)).expect(400);
  });

  describe('email (RF-08)', () => {
    const enviadaPorEmail = async (idNotificacion: number) =>
      (
        await t.db.query<{ enviadaEmail: boolean }>(
          'SELECT enviada_email FROM notificacion WHERE id_notificacion = $1',
          [idNotificacion],
        )
      ).rows[0].enviadaEmail;

    it('después de guardar la notificación manda el email al usuario con el enlace y la marca como enviada', async () => {
      const enviar = vi.spyOn(t.app.get(EmailService), 'enviar');
      const { idProyecto, titulo } = await crearProyecto(t.http(), empresa.token);
      await postular(ana, idProyecto);
      const notificacion = await ultima(empresa);

      await vi.waitFor(async () => expect(await enviadaPorEmail(notificacion.idNotificacion)).toBe(true));
      expect(enviar).toHaveBeenCalledWith({
        para: empresa.email,
        asunto: 'UTN Match: Recibiste una postulación',
        texto: expect.stringContaining(
          `Recibiste una postulación nueva en «${titulo}».\n\nVer en UTN Match: ${t.configuracion.email.urlAplicacion}/mis-proyectos/${idProyecto}`,
        ),
      });
    });

    it('si el email falla, la operación principal y la notificación siguen en pie (RNF-04)', async () => {
      vi.spyOn(t.app.get(EmailService), 'enviar').mockRejectedValue(new Error('SMTP caído'));
      const { idProyecto } = await crearProyecto(t.http(), empresa.token);
      const postulacion = await postular(beto, idProyecto); // 201 igual
      expect(postulacion.estado).toBe('pendiente');
      const notificacion = await ultima(empresa);
      expect(notificacion.tipo).toBe('nueva_postulacion');
      // Se deja pasar el intento de envío y se confirma que no quedó marcada.
      await new Promise((resolver) => setTimeout(resolver, 50));
      expect(await enviadaPorEmail(notificacion.idNotificacion)).toBe(false);
    });
  });
});
