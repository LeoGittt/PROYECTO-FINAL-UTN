import type request from 'supertest';
import { conSesion, registrarUsuario } from './app.js';

/**
 * Datos propios para las pruebas de proyectos y matching: cada prueba crea sus publicadores,
 * estudiantes y proyectos, así no depende de cómo quedó el seed después de otras pruebas.
 */
type Http = ReturnType<typeof request>;
type Nivel = 'basico' | 'intermedio' | 'avanzado';

export interface Persona {
  token: string;
  idUsuario: number;
  email: string;
}

/** Los identificadores de las tecnologías del catálogo, por nombre. */
export async function idsTecnologias(http: Http, ...nombres: string[]): Promise<number[]> {
  const catalogo: Array<{ idTecnologia: number; nombre: string }> = (
    await http.get('/api/catalogos/tecnologias').expect(200)
  ).body;
  return nombres.map((nombre) => {
    const tecnologia = catalogo.find((t) => t.nombre === nombre);
    if (!tecnologia) throw new Error(`La tecnología ${nombre} no está en el catálogo`);
    return tecnologia.idTecnologia;
  });
}

/** Una empresa o un docente nuevo, con el perfil completo. */
export async function crearPublicador(
  nuevoHttp: () => Http,
  rol: 'empresa' | 'docente' = 'empresa',
): Promise<Persona> {
  const { token, usuario, email } = await registrarUsuario(nuevoHttp(), rol);
  const perfil =
    rol === 'empresa'
      ? { nombreEmpresa: `Empresa ${usuario.idUsuario}`, sector: 'Software', contacto: email }
      : { catedra: `Cátedra ${usuario.idUsuario}` };
  await nuevoHttp().put('/api/perfil').set(conSesion(token)).send(perfil).expect(200);
  return { token, idUsuario: usuario.idUsuario, email };
}

/** Un estudiante nuevo, con el perfil completo y las tecnologías indicadas. */
export async function crearEstudiante(
  nuevoHttp: () => Http,
  datos: {
    tecnologias?: Array<{ idTecnologia: number; nivel: Nivel }>;
    anioCursada?: number;
    horasSemanales?: number;
  } = {},
): Promise<Persona & { idEstudiante: number }> {
  const { token, usuario, email } = await registrarUsuario(nuevoHttp(), 'estudiante');
  const carreras: Array<{ idCarrera: number; duracionAnios: number }> = (
    await nuevoHttp().get('/api/catalogos/carreras').expect(200)
  ).body;
  const carrera = carreras.find((c) => c.duracionAnios >= 5) ?? carreras[0];
  const perfil = await nuevoHttp()
    .put('/api/perfil')
    .set(conSesion(token))
    .send({
      idCarrera: carrera.idCarrera,
      anioCursada: datos.anioCursada ?? 3,
      horasSemanales: datos.horasSemanales ?? 20,
      tecnologias: datos.tecnologias ?? [],
    })
    .expect(200);
  return { token, idUsuario: usuario.idUsuario, email, idEstudiante: perfil.body.idEstudiante };
}

/** Un cuerpo válido de `POST /proyectos`, con los cambios indicados. */
export function cuerpoProyecto(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    titulo: 'Proyecto de prueba',
    descripcion: 'Una aplicación web para gestionar turnos.',
    duracionSemanas: 8,
    horasSemanales: 10,
    anioMinimo: 1,
    cupos: 2,
    modalidad: 'remoto',
    tipoRetribucion: 'certificado',
    tecnologias: [],
    ...cambios,
  };
}

/** Crea un proyecto (publicado, salvo que se pida `publicar: false`) y devuelve su cuerpo. */
export async function crearProyecto(
  http: Http,
  token: string,
  cambios: Record<string, unknown> = {},
): Promise<{ idProyecto: number; [campo: string]: unknown }> {
  const respuesta = await http
    .post('/api/proyectos')
    .set(conSesion(token))
    .send(cuerpoProyecto({ publicar: true, ...cambios }))
    .expect(201);
  return respuesta.body;
}
