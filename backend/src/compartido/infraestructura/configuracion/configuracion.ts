import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Configuración de la aplicación, leída de variables de entorno. Se carga una sola vez
 * (`cargarConfiguracion`) y se inyecta con el token `CONFIGURACION`.
 */
export interface Configuracion {
  entorno: 'development' | 'test' | 'production';
  puerto: number;
  /** Orígenes permitidos por CORS (la aplicación web). */
  frontendUrls: string[];
  baseDeDatos: {
    /** Si está definida se usa PostgreSQL (`pg`); si es `null`, PGlite. */
    url: string | null;
    /** Activa TLS hacia PostgreSQL (necesario en Supabase). */
    ssl: boolean;
    /** Carpeta de PGlite. `null` = en memoria (pruebas). */
    directorioPglite: string | null;
    /** Aplica `schema.sql` y `seed.sql` si la base está vacía. */
    autoInicializar: boolean;
  };
  seguridad: {
    jwtSecreto: string;
    /** `true` si no se configuró `JWT_SECRET` y se generó uno al arrancar (solo fuera de producción). */
    jwtSecretoGenerado: boolean;
    jwtExpiracionSegundos: number;
    costoBcrypt: number;
    limiteAuth: { maximo: number; ventanaMs: number };
    /** Saltos de proxy confiables para `req.ip` (0 = no hay proxy). */
    confiarEnProxy: number;
  };
}

export const CONFIGURACION = Symbol('CONFIGURACION');

export type VariablesDeEntorno = Record<string, string | undefined>;

const DOCE_HORAS_EN_HORAS = 12;
const LARGO_MINIMO_SECRETO_PRODUCCION = 32;

/** Carpeta raíz del paquete `backend/` (funciona igual desde `src/` y desde `dist/`). */
export function raizDelBackend(): string {
  return fileURLToPath(new URL('../../../../', import.meta.url));
}

/** Una ruta relativa se toma desde backend/, no desde donde se haya lanzado el comando. */
function rutaDeDatos(ruta: string): string {
  return isAbsolute(ruta) ? ruta : resolve(raizDelBackend(), ruta);
}

/**
 * Carga `backend/.env` si existe. Las variables que ya están definidas en el entorno
 * tienen prioridad sobre el archivo.
 */
export function cargarArchivoEnv(): void {
  const ruta = `${raizDelBackend()}.env`;
  if (existsSync(ruta)) process.loadEnvFile(ruta);
}

/** Interpreta las variables de entorno. Si hay errores los informa todos juntos. */
export function cargarConfiguracion(
  env: VariablesDeEntorno,
): Configuracion {
  const errores: string[] = [];
  const texto = (nombre: string): string | undefined => {
    const valor = env[nombre]?.trim();
    return valor ? valor : undefined;
  };
  const entero = (
    nombre: string,
    porDefecto: number,
    minimo: number,
    maximo: number,
  ): number => {
    const crudo = texto(nombre);
    if (crudo === undefined) return porDefecto;
    const valor = Number(crudo);
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
      errores.push(
        `${nombre} debe ser un entero entre ${minimo} y ${maximo} (recibido: "${crudo}")`,
      );
      return porDefecto;
    }
    return valor;
  };
  const booleano = (nombre: string, porDefecto: boolean): boolean => {
    const crudo = texto(nombre)?.toLowerCase();
    if (crudo === undefined) return porDefecto;
    if (['true', '1', 'si', 'sí', 'yes'].includes(crudo)) return true;
    if (['false', '0', 'no'].includes(crudo)) return false;
    errores.push(`${nombre} debe ser true o false (recibido: "${crudo}")`);
    return porDefecto;
  };

  const entornoCrudo = texto('NODE_ENV') ?? 'development';
  if (!['development', 'test', 'production'].includes(entornoCrudo)) {
    errores.push(
      `NODE_ENV debe ser development, test o production (recibido: "${entornoCrudo}")`,
    );
  }
  const entorno = (
    ['development', 'test', 'production'].includes(entornoCrudo)
      ? entornoCrudo
      : 'development'
  ) as Configuracion['entorno'];
  const esProduccion = entorno === 'production';

  const frontendUrls = (texto('FRONTEND_URL') ?? 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const directorioCrudo = texto('PGLITE_DATA_DIR');
  const directorioPglite =
    directorioCrudo === 'memory://' || (!directorioCrudo && entorno === 'test')
      ? null
      : rutaDeDatos(directorioCrudo ?? '.data/pglite');

  let jwtSecreto = texto('JWT_SECRET');
  let jwtSecretoGenerado = false;
  if (!jwtSecreto) {
    if (esProduccion) {
      errores.push('JWT_SECRET es obligatorio en producción');
    } else {
      jwtSecreto = randomBytes(32).toString('hex');
      jwtSecretoGenerado = true;
    }
  } else if (esProduccion && jwtSecreto.length < LARGO_MINIMO_SECRETO_PRODUCCION) {
    errores.push(
      `JWT_SECRET debe tener al menos ${LARGO_MINIMO_SECRETO_PRODUCCION} caracteres en producción`,
    );
  }

  const configuracion: Configuracion = {
    entorno,
    puerto: entero('PORT', 3001, 1, 65535),
    frontendUrls,
    baseDeDatos: {
      url: texto('DATABASE_URL') ?? null,
      ssl: booleano('DATABASE_SSL', false),
      directorioPglite,
      autoInicializar: booleano('DB_AUTO_INIT', !esProduccion),
    },
    seguridad: {
      jwtSecreto: jwtSecreto ?? '',
      jwtSecretoGenerado,
      jwtExpiracionSegundos:
        entero('JWT_EXPIRES_IN_HOURS', DOCE_HORAS_EN_HORAS, 1, 168) * 3600,
      costoBcrypt: entero('BCRYPT_COST', 10, 4, 15),
      limiteAuth: {
        maximo: entero('RATE_LIMIT_AUTH_MAX', 20, 1, 100000),
        ventanaMs: entero('RATE_LIMIT_AUTH_WINDOW_SECONDS', 60, 1, 86400) * 1000,
      },
      confiarEnProxy: entero('TRUST_PROXY', 0, 0, 10),
    },
  };

  if (errores.length > 0) {
    throw new Error(
      `Configuración inválida:\n${errores.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
  return configuracion;
}
