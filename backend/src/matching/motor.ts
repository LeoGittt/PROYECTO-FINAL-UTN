import type { PerfilMatchingDto } from '../perfiles/dominio/perfil.js';
import type { ProyectoDto } from '../proyectos/proyectos.service.js';

/**
 * El puntaje de compatibilidad entre un estudiante y un proyecto (docs/api/CONTRATO.md,
 * sección 5.2). Son funciones puras: no leen la base ni hacen pedidos, así que se prueban
 * con datos armados a mano.
 *
 *   total = pesoTecnologias x sT + pesoTexto x sX + pesoContexto x sC
 */

/** Una fila de `configuracion_motor`: cómo se pondera cada componente y desde qué puntaje se recomienda. */
export interface ConfiguracionMotor {
  idConfiguracion: number;
  nombre: string;
  pesoTecnologias: number;
  pesoTexto: number;
  pesoContexto: number;
  umbralRecomendacion: number;
}

/** Del perfil del estudiante, solo lo que mira el motor. */
export type PerfilParaPuntaje = Pick<
  PerfilMatchingDto,
  'idEstudiante' | 'anioCursada' | 'horasSemanales' | 'tecnologias' | 'descripcion' | 'proyectosPrevios'
>;

/** Del proyecto, solo lo que mira el motor. */
export type ProyectoParaPuntaje = Pick<
  ProyectoDto,
  | 'idProyecto'
  | 'titulo'
  | 'descripcion'
  | 'objetivos'
  | 'perfilBuscado'
  | 'horasSemanales'
  | 'anioMinimo'
  | 'tecnologias'
>;

export interface Puntaje {
  total: number;
  tecnologias: number;
  /** `null` si la configuración no usa texto (`pesoTexto` = 0). */
  texto: number | null;
  contexto: number;
}

export interface PuntajeDePar extends Puntaje {
  idEstudiante: number;
  idProyecto: number;
}

// ---------------------------------------------------------------------------
// sT: tecnologías
// ---------------------------------------------------------------------------

const FACTOR_NIVEL = { basico: 0.6, intermedio: 0.85, avanzado: 1 } as const;
const PESO_OBLIGATORIA = 2;
const PESO_DESEABLE = 1;

/**
 * Cobertura ponderada de lo que pide el proyecto: cada tecnología aporta su peso por el
 * factor del nivel del estudiante (0 si no la sabe), dividido por la suma de pesos.
 */
export function puntajeTecnologias(
  perfil: Pick<PerfilParaPuntaje, 'tecnologias'>,
  proyecto: Pick<ProyectoParaPuntaje, 'tecnologias'>,
): number {
  if (proyecto.tecnologias.length === 0) return 1;
  const nivelDe = new Map(perfil.tecnologias.map((t) => [t.idTecnologia, t.nivel]));
  let pesoTotal = 0;
  let aportado = 0;
  for (const requerida of proyecto.tecnologias) {
    const peso = requerida.obligatoria ? PESO_OBLIGATORIA : PESO_DESEABLE;
    pesoTotal += peso;
    const nivel = nivelDe.get(requerida.idTecnologia);
    if (nivel) aportado += peso * FACTOR_NIVEL[nivel];
  }
  return aportado / pesoTotal;
}

/** Qué tecnologías del proyecto cubre el estudiante y cuáles le faltan (obligatorias primero). */
export function analizarTecnologias(
  idsTecnologiasDelEstudiante: Iterable<number>,
  proyecto: Pick<ProyectoParaPuntaje, 'tecnologias'>,
): { coincidentes: string[]; faltantes: string[] } {
  const sabidas = new Set(idsTecnologiasDelEstudiante);
  const pedidas = [...proyecto.tecnologias].sort(
    (a, b) => Number(b.obligatoria) - Number(a.obligatoria),
  );
  return {
    coincidentes: pedidas.filter((t) => sabidas.has(t.idTecnologia)).map((t) => t.nombre),
    faltantes: pedidas.filter((t) => !sabidas.has(t.idTecnologia)).map((t) => t.nombre),
  };
}

// ---------------------------------------------------------------------------
// sC: contexto (horas disponibles y año de cursada)
// ---------------------------------------------------------------------------

export function puntajeContexto(
  perfil: Pick<PerfilParaPuntaje, 'horasSemanales' | 'anioCursada'>,
  proyecto: Pick<ProyectoParaPuntaje, 'horasSemanales' | 'anioMinimo'>,
): number {
  const horas =
    perfil.horasSemanales >= proyecto.horasSemanales
      ? 1
      : perfil.horasSemanales / proyecto.horasSemanales;
  const anio =
    perfil.anioCursada >= proyecto.anioMinimo
      ? 1
      : Math.max(0, 1 - 0.5 * (proyecto.anioMinimo - perfil.anioCursada));
  return 0.6 * horas + 0.4 * anio;
}

// ---------------------------------------------------------------------------
// sX: texto (similitud del coseno entre vectores TF-IDF)
// ---------------------------------------------------------------------------

/** Palabras que no distinguen un texto de otro. Van sin tildes porque el texto se normaliza antes. */
const PALABRAS_VACIAS = new Set(
  `de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o
   este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos
   durante todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos unos yo otro
   otras otra tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo
   nosotros mis tu te ti tus ellas es son ser fue ha han he hemos sido tiene tienen tengo estan
   cada ademas asi solo puede pueden sea`.split(/\s+/),
);

/** Minúsculas, sin tildes, separado por todo lo que no sea letra o número, sin palabras vacías. */
export function tokenizar(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((palabra) => palabra.length > 1 && !PALABRAS_VACIAS.has(palabra));
}

type Vector = Map<string, number>;

export interface IndiceTexto {
  similitud(textoA: string, textoB: string): number;
}

/**
 * Arma el índice con el corpus que define cuán rara es cada palabra:
 * `idf = ln((N + 1) / (df + 1)) + 1`, con N documentos y `df` documentos que la contienen
 * (la versión suavizada, para que una palabra fuera del corpus no divida por cero).
 * El peso de cada palabra en un texto es su cantidad de apariciones por su `idf`.
 */
export function crearIndiceTexto(corpus: readonly string[]): IndiceTexto {
  const documentosPorPalabra = new Map<string, number>();
  for (const documento of corpus) {
    for (const palabra of new Set(tokenizar(documento))) {
      documentosPorPalabra.set(palabra, (documentosPorPalabra.get(palabra) ?? 0) + 1);
    }
  }
  const idf = (palabra: string) =>
    Math.log((corpus.length + 1) / ((documentosPorPalabra.get(palabra) ?? 0) + 1)) + 1;

  // Un mismo texto se compara contra muchos otros: se vectoriza una sola vez.
  const vectores = new Map<string, Vector>();
  const vectorizar = (texto: string): Vector => {
    let vector = vectores.get(texto);
    if (!vector) {
      vector = new Map();
      for (const palabra of tokenizar(texto)) {
        vector.set(palabra, (vector.get(palabra) ?? 0) + 1);
      }
      for (const [palabra, apariciones] of vector) {
        vector.set(palabra, apariciones * idf(palabra));
      }
      vectores.set(texto, vector);
    }
    return vector;
  };

  return { similitud: (a, b) => coseno(vectorizar(a), vectorizar(b)) };
}

function coseno(a: Vector, b: Vector): number {
  let productoPunto = 0;
  for (const [palabra, peso] of a) productoPunto += peso * (b.get(palabra) ?? 0);
  const normas = norma(a) * norma(b);
  return normas === 0 ? 0 : Math.min(1, productoPunto / normas);
}

function norma(vector: Vector): number {
  let suma = 0;
  for (const peso of vector.values()) suma += peso * peso;
  return Math.sqrt(suma);
}

const unirTextos = (...partes: Array<string | null>) =>
  partes.filter((parte): parte is string => Boolean(parte)).join(' ');

/** Lo que dice el proyecto de sí mismo: título, descripción, objetivos y perfil buscado. */
function textoDelProyecto(proyecto: ProyectoParaPuntaje): string {
  return unirTextos(proyecto.titulo, proyecto.descripcion, proyecto.objetivos, proyecto.perfilBuscado);
}

/** Lo que dice el estudiante de sí mismo: descripción y proyectos previos. */
function textoDelEstudiante(perfil: PerfilParaPuntaje): string {
  return unirTextos(perfil.descripcion, perfil.proyectosPrevios);
}

// ---------------------------------------------------------------------------
// Puntaje total
// ---------------------------------------------------------------------------

/** Redondea a 4 decimales y lo deja entre 0 y 1: la tabla `match` es `numeric(5,4)` con CHECK de 0 a 1. */
const acotar = (valor: number) => Math.round(Math.min(1, Math.max(0, valor)) * 10_000) / 10_000;

/**
 * Puntaje de un par. El texto usa un índice con el corpus de los proyectos abiertos; si no se
 * pasa, el corpus es el propio proyecto.
 */
export function calcularPuntaje(
  perfil: PerfilParaPuntaje,
  proyecto: ProyectoParaPuntaje,
  configuracion: ConfiguracionMotor,
  indice?: IndiceTexto,
): Puntaje {
  const tecnologias = puntajeTecnologias(perfil, proyecto);
  const contexto = puntajeContexto(perfil, proyecto);
  let texto: number | null = null;
  if (configuracion.pesoTexto > 0) {
    const textoProyecto = textoDelProyecto(proyecto);
    const { similitud } = indice ?? crearIndiceTexto([textoProyecto]);
    texto = similitud(textoProyecto, textoDelEstudiante(perfil));
  }
  const total =
    configuracion.pesoTecnologias * tecnologias +
    configuracion.pesoTexto * (texto ?? 0) +
    configuracion.pesoContexto * contexto;
  return {
    total: acotar(total),
    tecnologias: acotar(tecnologias),
    texto: texto === null ? null : acotar(texto),
    contexto: acotar(contexto),
  };
}

/**
 * El puntaje de cada par estudiante x proyecto. `corpus` son los proyectos que definen el IDF
 * del texto: al recalcular un solo proyecto o un solo estudiante hay que pasar todos los
 * proyectos abiertos para que el resultado no dependa de qué se recalculó.
 */
export function calcularPares(
  perfiles: readonly PerfilParaPuntaje[],
  proyectos: readonly ProyectoParaPuntaje[],
  configuracion: ConfiguracionMotor,
  corpus: readonly ProyectoParaPuntaje[] = proyectos,
): PuntajeDePar[] {
  const indice =
    configuracion.pesoTexto > 0 ? crearIndiceTexto(corpus.map(textoDelProyecto)) : undefined;
  return proyectos.flatMap((proyecto) =>
    perfiles.map((perfil) => ({
      idEstudiante: perfil.idEstudiante,
      idProyecto: proyecto.idProyecto,
      ...calcularPuntaje(perfil, proyecto, configuracion, indice),
    })),
  );
}
