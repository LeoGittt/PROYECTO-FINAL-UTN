import {
  analizarTecnologias,
  calcularPares,
  calcularPuntaje,
  crearIndiceTexto,
  puntajeContexto,
  puntajeTecnologias,
  tokenizar,
  type ConfiguracionMotor,
  type PerfilParaPuntaje,
  type ProyectoParaPuntaje,
} from './motor.js';

// Las expectativas de este archivo están calculadas a mano a partir de la fórmula del
// contrato (docs/api/CONTRATO.md, sección 5.2), no copiadas de la salida del código.

const V1: ConfiguracionMotor = {
  idConfiguracion: 1,
  nombre: 'v1',
  pesoTecnologias: 0.7,
  pesoTexto: 0,
  pesoContexto: 0.3,
  umbralRecomendacion: 0.5,
};
const V2: ConfiguracionMotor = {
  idConfiguracion: 2,
  nombre: 'v2',
  pesoTecnologias: 0.5,
  pesoTexto: 0.3,
  pesoContexto: 0.2,
  umbralRecomendacion: 0.5,
};

const REACT = 1;
const TYPESCRIPT = 2;
const DOCKER = 3;

function tecnologiaDeProyecto(idTecnologia: number, obligatoria: boolean) {
  return { idTecnologia, nombre: `T${idTecnologia}`, categoria: 'frontend', obligatoria };
}

function proyecto(cambios: Partial<ProyectoParaPuntaje> = {}): ProyectoParaPuntaje {
  return {
    idProyecto: 10,
    titulo: '',
    descripcion: '',
    objetivos: null,
    perfilBuscado: null,
    horasSemanales: 10,
    anioMinimo: 1,
    tecnologias: [],
    ...cambios,
  };
}

function perfil(cambios: Partial<PerfilParaPuntaje> = {}): PerfilParaPuntaje {
  return {
    idEstudiante: 20,
    anioCursada: 2,
    horasSemanales: 10,
    tecnologias: [],
    descripcion: null,
    proyectosPrevios: null,
    ...cambios,
  };
}

describe('puntajeTecnologias (sT)', () => {
  it('es la cobertura ponderada: obligatoria pesa 2, deseable 1, y el nivel multiplica lo aportado', () => {
    // Pide React (obligatoria, 2), TypeScript (obligatoria, 2) y Docker (deseable, 1): pesa 5.
    // Aporta 2 x 1 (React avanzado) + 2 x 0,85 (TypeScript intermedio) + 0 (Docker) = 3,7.
    const p = proyecto({
      tecnologias: [
        tecnologiaDeProyecto(REACT, true),
        tecnologiaDeProyecto(TYPESCRIPT, true),
        tecnologiaDeProyecto(DOCKER, false),
      ],
    });
    const e = perfil({
      tecnologias: [
        { idTecnologia: REACT, nombre: 'React', nivel: 'avanzado' },
        { idTecnologia: TYPESCRIPT, nombre: 'TypeScript', nivel: 'intermedio' },
      ],
    });
    expect(puntajeTecnologias(e, p)).toBeCloseTo(0.74, 10);
  });

  it('el nivel básico aporta 0,6 de lo que pesa la tecnología', () => {
    const p = proyecto({ tecnologias: [tecnologiaDeProyecto(REACT, true)] });
    const e = perfil({ tecnologias: [{ idTecnologia: REACT, nombre: 'React', nivel: 'basico' }] });
    expect(puntajeTecnologias(e, p)).toBeCloseTo(0.6, 10);
  });

  it('una tecnología que el proyecto no pide no suma', () => {
    const p = proyecto({ tecnologias: [tecnologiaDeProyecto(REACT, true)] });
    const e = perfil({ tecnologias: [{ idTecnologia: DOCKER, nombre: 'Docker', nivel: 'avanzado' }] });
    expect(puntajeTecnologias(e, p)).toBe(0);
  });

  it('vale 1 si el proyecto no pide tecnologías', () => {
    expect(puntajeTecnologias(perfil(), proyecto())).toBe(1);
  });
});

describe('puntajeContexto (sC)', () => {
  it('vale 1 si las horas y el año alcanzan', () => {
    expect(
      puntajeContexto(
        perfil({ horasSemanales: 20, anioCursada: 3 }),
        proyecto({ horasSemanales: 10, anioMinimo: 3 }),
      ),
    ).toBeCloseTo(1, 10);
  });

  it('horas: es el cociente entre las del estudiante y las del proyecto cuando no alcanzan', () => {
    // horas = 5 / 10 = 0,5 ; anio = 1  =>  0,6 x 0,5 + 0,4 x 1 = 0,7
    expect(
      puntajeContexto(perfil({ horasSemanales: 5 }), proyecto({ horasSemanales: 10 })),
    ).toBeCloseTo(0.7, 10);
  });

  it('año: baja 0,5 por cada año que falta y no pasa de 0', () => {
    const p = (anioMinimo: number) => proyecto({ anioMinimo });
    // horas = 1 en los tres casos: 0,6 + 0,4 x anio
    expect(puntajeContexto(perfil({ anioCursada: 2 }), p(3))).toBeCloseTo(0.8, 10); // anio = 0,5
    expect(puntajeContexto(perfil({ anioCursada: 1 }), p(3))).toBeCloseTo(0.6, 10); // anio = 0
    expect(puntajeContexto(perfil({ anioCursada: 1 }), p(5))).toBeCloseTo(0.6, 10); // anio = max(0, -1)
  });
});

describe('tokenizar', () => {
  it('pasa a minúsculas, saca tildes y separa por todo lo que no sea letra o número', () => {
    expect(tokenizar('Programación Avanzada: Node.js y APIs REST!')).toEqual([
      'programacion',
      'avanzada',
      'node',
      'js',
      'apis',
      'rest',
    ]);
  });

  it('descarta palabras vacías en español y palabras de una sola letra', () => {
    expect(tokenizar('El desarrollo de la aplicación para los usuarios, a o c')).toEqual([
      'desarrollo',
      'aplicacion',
      'usuarios',
    ]);
  });

  it('trata igual una palabra con y sin tilde', () => {
    expect(tokenizar('diseño')).toEqual(tokenizar('DISEÑO'));
    expect(tokenizar('Análisis')).toEqual(['analisis']);
  });
});

describe('crearIndiceTexto().similitud (sX, coseno sobre TF-IDF)', () => {
  it('textos con las mismas palabras valen 1 y textos sin palabras en común valen 0', () => {
    const indice = crearIndiceTexto(['react node']);
    expect(indice.similitud('react node', 'Node, React')).toBeCloseTo(1, 10);
    expect(indice.similitud('react node', 'cocina italiana')).toBe(0);
  });

  it('un texto sin palabras útiles vale 0 (no divide por cero)', () => {
    const indice = crearIndiceTexto(['react node']);
    expect(indice.similitud('react node', '')).toBe(0);
    expect(indice.similitud('react node', 'el de la')).toBe(0);
  });

  it('con un solo documento todas las palabras pesan igual: coseno = 1 / raiz(2)', () => {
    // Vectores {react:1, node:1} y {react:1}: 1 / (raiz(2) x 1)
    const indice = crearIndiceTexto(['react node']);
    expect(indice.similitud('react node', 'react')).toBeCloseTo(1 / Math.sqrt(2), 10);
  });

  it('una palabra rara en el corpus pesa más que una común', () => {
    // Corpus de 3 documentos: react aparece en 2 y node en 1 (idf = ln((N+1)/(df+1)) + 1).
    //   idf(react) = ln(4/3) + 1 = 1,2877   idf(node) = ln(4/2) + 1 = 1,6931
    // Proyecto {react:1,2877 ; node:1,6931}
    //   con "react": 1,2877 / raiz(1,2877^2 + 1,6931^2) = 0,605
    //   con "node":  1,6931 / raiz(1,2877^2 + 1,6931^2) = 0,796
    const indice = crearIndiceTexto(['react node', 'react python', 'java spring']);
    expect(indice.similitud('react node', 'react')).toBeCloseTo(0.605, 3);
    expect(indice.similitud('react node', 'node')).toBeCloseTo(0.796, 3);
  });
});

describe('calcularPuntaje', () => {
  const p = proyecto({
    titulo: 'react node',
    horasSemanales: 10,
    anioMinimo: 3,
    tecnologias: [
      tecnologiaDeProyecto(REACT, true),
      tecnologiaDeProyecto(TYPESCRIPT, true),
      tecnologiaDeProyecto(DOCKER, false),
    ],
  });
  const e = perfil({
    horasSemanales: 20,
    anioCursada: 2,
    tecnologias: [
      { idTecnologia: REACT, nombre: 'React', nivel: 'avanzado' },
      { idTecnologia: TYPESCRIPT, nombre: 'TypeScript', nivel: 'intermedio' },
    ],
  });

  it('v1: 0,7 x sT + 0,3 x sC, y no calcula texto', () => {
    // sT = 0,74 ; sC = 0,6 x 1 + 0,4 x 0,5 = 0,8 ; total = 0,7 x 0,74 + 0,3 x 0,8 = 0,758
    expect(calcularPuntaje(e, p, V1)).toEqual({
      total: 0.758,
      tecnologias: 0.74,
      texto: null,
      contexto: 0.8,
    });
  });

  it('v2: suma 0,3 x sX, con el texto del perfil contra el del proyecto', () => {
    // El estudiante describe lo mismo que dice el título del proyecto: sX = 1.
    // total = 0,5 x 0,74 + 0,3 x 1 + 0,2 x 0,8 = 0,83
    const resultado = calcularPuntaje({ ...e, descripcion: 'React, node' }, p, V2);
    expect(resultado).toEqual({ total: 0.83, tecnologias: 0.74, texto: 1, contexto: 0.8 });
  });

  it('v2 sin texto en el perfil: sX = 0 (y el puntaje sigue siendo calculable)', () => {
    const resultado = calcularPuntaje(e, p, V2);
    expect(resultado.texto).toBe(0);
    expect(resultado.total).toBeCloseTo(0.5 * 0.74 + 0.2 * 0.8, 4);
  });

  it('redondea a 4 decimales', () => {
    // Tres deseables y el estudiante sabe una (avanzado): sT = 1/3.
    const tres = proyecto({
      tecnologias: [
        tecnologiaDeProyecto(REACT, false),
        tecnologiaDeProyecto(TYPESCRIPT, false),
        tecnologiaDeProyecto(DOCKER, false),
      ],
    });
    const uno = perfil({ tecnologias: [{ idTecnologia: REACT, nombre: 'React', nivel: 'avanzado' }] });
    expect(calcularPuntaje(uno, tres, V1).tecnologias).toBe(0.3333);
  });

  it('nunca pasa de 1 aunque la suma de punto flotante se pase (la base lo rechaza)', () => {
    // 0,34 + 0,56 + 0,1 da 1,0000000000000002 en punto flotante.
    const casiPerfecta: ConfiguracionMotor = {
      ...V2,
      pesoTecnologias: 0.34,
      pesoTexto: 0.56,
      pesoContexto: 0.1,
    };
    const resultado = calcularPuntaje(
      perfil({ descripcion: 'react node' }),
      proyecto({ titulo: 'react node' }),
      casiPerfecta,
    );
    expect(resultado.total).toBe(1);
  });
});

describe('calcularPares', () => {
  const proyectos = [
    proyecto({ idProyecto: 1, titulo: 'react node', tecnologias: [tecnologiaDeProyecto(REACT, true)] }),
    proyecto({ idProyecto: 2, titulo: 'java spring', tecnologias: [tecnologiaDeProyecto(DOCKER, true)] }),
  ];
  const perfiles = [
    perfil({ idEstudiante: 7, tecnologias: [{ idTecnologia: REACT, nombre: 'React', nivel: 'avanzado' }] }),
    perfil({ idEstudiante: 8, tecnologias: [] }),
  ];

  it('devuelve un puntaje por cada par estudiante x proyecto', () => {
    const pares = calcularPares(perfiles, proyectos, V1);
    expect(pares.map((x) => [x.idEstudiante, x.idProyecto])).toEqual([
      [7, 1],
      [8, 1],
      [7, 2],
      [8, 2],
    ]);
    expect(pares[0].tecnologias).toBe(1);
    expect(pares[3].tecnologias).toBe(0);
  });

  it('con texto, el IDF se calcula sobre el corpus indicado y no solo sobre los proyectos que se recalculan', () => {
    const conTexto = [perfil({ descripcion: 'react' })];
    const corpus = [
      proyecto({ idProyecto: 1, titulo: 'react node' }),
      proyecto({ idProyecto: 2, titulo: 'react python' }),
    ];
    // Corpus de 2 documentos: idf(react) = ln(3/3) + 1 = 1 e idf(node) = ln(3/2) + 1 = 1,4055.
    // Proyecto {react:1 ; node:1,4055} contra {react:1}: 1 / raiz(1 + 1,4055^2) = 0,5797.
    const [conCorpus] = calcularPares(conTexto, [corpus[0]], V2, corpus);
    expect(conCorpus.texto).toBeCloseTo(0.5797, 3);
    // Sin corpus, el único documento es el propio proyecto y todo pesa 1: 1 / raiz(2).
    const [sinCorpus] = calcularPares(conTexto, [corpus[0]], V2);
    expect(sinCorpus.texto).toBeCloseTo(0.7071, 4);
  });
});

describe('analizarTecnologias', () => {
  it('separa lo que el estudiante cubre de lo que le falta, con las obligatorias primero', () => {
    const p = proyecto({
      tecnologias: [
        { idTecnologia: DOCKER, nombre: 'Docker', categoria: 'devops', obligatoria: false },
        { idTecnologia: REACT, nombre: 'React', categoria: 'frontend', obligatoria: true },
        { idTecnologia: TYPESCRIPT, nombre: 'TypeScript', categoria: 'lenguaje', obligatoria: true },
      ],
    });
    expect(analizarTecnologias([REACT], p)).toEqual({
      coincidentes: ['React'],
      faltantes: ['TypeScript', 'Docker'],
    });
  });
});
