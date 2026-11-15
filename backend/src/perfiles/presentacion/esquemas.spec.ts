import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { ErrorValidacion } from '../../compartido/dominio/errores.js';
import { validar } from '../../compartido/infraestructura/http/validacion.js';
import {
  loginEsquema,
  perfilDocenteEsquema,
  perfilEmpresaEsquema,
  perfilEstudianteEsquema,
  registroEsquema,
} from './esquemas.js';

/** Los campos con error, en el orden en que los informa la validación. */
function camposInvalidos(esquema: z.ZodType, datos: unknown): string[] {
  try {
    validar(esquema, datos);
  } catch (error) {
    return (error as ErrorValidacion).detalles.map((d) => d.campo);
  }
  return [];
}

describe('registroEsquema', () => {
  const valido = {
    nombre: ' Ana ',
    apellido: 'Paz',
    email: '  ANA@Alumnos.UtnMatch.test ',
    contrasena: 'UtnMatch2026!',
    rol: 'estudiante',
  };

  it('normaliza nombre y email (recorta y pasa el email a minúsculas)', () => {
    expect(validar(registroEsquema, valido)).toMatchObject({
      nombre: 'Ana',
      email: 'ana@alumnos.utnmatch.test',
    });
  });

  it.each(['estudiante', 'empresa', 'docente'])('permite registrarse como %s', (rol) => {
    expect(camposInvalidos(registroEsquema, { ...valido, rol })).toEqual([]);
  });

  it('no permite registrarse como administrador ni con un rol inventado', () => {
    expect(camposInvalidos(registroEsquema, { ...valido, rol: 'administrador' })).toEqual(['rol']);
    expect(camposInvalidos(registroEsquema, { ...valido, rol: 'superusuario' })).toEqual(['rol']);
  });

  it('exige todos los campos', () => {
    expect(camposInvalidos(registroEsquema, {})).toEqual([
      'nombre',
      'apellido',
      'email',
      'contrasena',
      'rol',
    ]);
  });

  it('rechaza un email mal formado', () => {
    expect(camposInvalidos(registroEsquema, { ...valido, email: 'sin-arroba' })).toEqual(['email']);
  });

  it('aplica la política de contraseñas y la informa en español', () => {
    expect(() => validar(registroEsquema, { ...valido, contrasena: 'solo letras' })).toThrow(
      ErrorValidacion,
    );
    try {
      validar(registroEsquema, { ...valido, contrasena: 'corta' });
    } catch (error) {
      expect((error as ErrorValidacion).detalles).toEqual([
        { campo: 'contrasena', mensaje: 'Debe tener al menos 8 caracteres' },
        { campo: 'contrasena', mensaje: 'Debe incluir al menos un número' },
      ]);
    }
  });
});

describe('loginEsquema', () => {
  it('pide email y contraseña pero no aplica la política (para no revelar reglas ni bloquear cuentas viejas)', () => {
    expect(camposInvalidos(loginEsquema, {})).toEqual(['email', 'contrasena']);
    expect(camposInvalidos(loginEsquema, { email: 'x', contrasena: 'a' })).toEqual([]);
  });
});

describe('perfilEstudianteEsquema', () => {
  const valido = {
    idCarrera: 1,
    anioCursada: 2,
    horasSemanales: 10,
    tecnologias: [{ idTecnologia: 3, nivel: 'intermedio' }],
    habilidades: [1, 2],
    materiasAprobadas: [5],
  };

  it('completa los opcionales ausentes con null y con listas vacías', () => {
    const datos = validar(perfilEstudianteEsquema, {
      idCarrera: 1,
      anioCursada: 1,
      horasSemanales: 5,
    });
    expect(datos).toEqual({
      idCarrera: 1,
      anioCursada: 1,
      horasSemanales: 5,
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

  it('acepta un perfil completo', () => {
    expect(camposInvalidos(perfilEstudianteEsquema, valido)).toEqual([]);
  });

  it('exige carrera, año y horas', () => {
    expect(camposInvalidos(perfilEstudianteEsquema, {})).toEqual([
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
    ['idCarrera', 0],
    ['idCarrera', -3],
  ])('rechaza %s = %j', (campo, valor) => {
    expect(camposInvalidos(perfilEstudianteEsquema, { ...valido, [campo]: valor })).toEqual([campo]);
  });

  it('rechaza un nivel de tecnología que no existe', () => {
    expect(
      camposInvalidos(perfilEstudianteEsquema, {
        ...valido,
        tecnologias: [{ idTecnologia: 3, nivel: 'experto' }],
      }),
    ).toEqual(['tecnologias.0.nivel']);
  });

  it('rechaza tecnologías, habilidades y materias repetidas', () => {
    expect(
      camposInvalidos(perfilEstudianteEsquema, {
        ...valido,
        tecnologias: [
          { idTecnologia: 3, nivel: 'basico' },
          { idTecnologia: 3, nivel: 'avanzado' },
        ],
        habilidades: [1, 1],
        materiasAprobadas: [5, 5],
      }),
    ).toEqual(['tecnologias', 'habilidades', 'materiasAprobadas']);
  });

  it.each(['javascript:alert(1)', 'data:text/html;base64,PGI+', 'ftp://x.test/cv.pdf', 'no es una url'])(
    'rechaza como enlace %j (solo http y https)',
    (peligroso) => {
      expect(
        camposInvalidos(perfilEstudianteEsquema, {
          ...valido,
          cvUrl: peligroso,
          githubUrl: peligroso,
          portfolioUrl: peligroso,
        }),
      ).toEqual(['cvUrl', 'githubUrl', 'portfolioUrl']);
    },
  );

  it('trata un enlace o texto vacío como ausente', () => {
    expect(
      validar(perfilEstudianteEsquema, { ...valido, githubUrl: '', descripcion: '   ' }),
    ).toMatchObject({ githubUrl: null, descripcion: null });
  });

  it('limita el largo de la descripción', () => {
    expect(
      camposInvalidos(perfilEstudianteEsquema, { ...valido, descripcion: 'x'.repeat(2001) }),
    ).toEqual(['descripcion']);
  });
});

describe('perfilEmpresaEsquema', () => {
  const valido = { nombreEmpresa: 'Andes Software', sector: 'Software', contacto: 'rrhh@andes.test' };

  it('acepta los datos mínimos', () => {
    expect(validar(perfilEmpresaEsquema, valido)).toEqual({
      ...valido,
      descripcion: null,
      sitioWeb: null,
    });
  });

  it('exige nombre, sector y contacto', () => {
    expect(camposInvalidos(perfilEmpresaEsquema, {})).toEqual([
      'nombreEmpresa',
      'sector',
      'contacto',
    ]);
    expect(camposInvalidos(perfilEmpresaEsquema, { ...valido, sector: '   ' })).toEqual(['sector']);
  });

  it('el sitio web solo admite http y https', () => {
    expect(camposInvalidos(perfilEmpresaEsquema, { ...valido, sitioWeb: 'javascript:alert(1)' })).toEqual([
      'sitioWeb',
    ]);
    expect(camposInvalidos(perfilEmpresaEsquema, { ...valido, sitioWeb: 'https://andes.test' })).toEqual([]);
  });
});

describe('perfilDocenteEsquema', () => {
  it('exige la cátedra y deja el resto como opcional', () => {
    expect(camposInvalidos(perfilDocenteEsquema, {})).toEqual(['catedra']);
    expect(validar(perfilDocenteEsquema, { catedra: 'Programación II' })).toEqual({
      catedra: 'Programación II',
      areaInvestigacion: null,
      descripcion: null,
    });
  });
});
