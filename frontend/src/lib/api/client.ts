import { clearToken, getToken } from "./token";
import type { ErrorDetalle } from "./types";

export const API_URL_POR_DEFECTO = "http://localhost:3001/api";

/** URL base de la API, sin barra final. Se lee en cada llamada para poder cambiarla en pruebas. */
export function getApiBaseUrl(): string {
  const configurada = process.env.NEXT_PUBLIC_API_URL?.trim();
  return (configurada || API_URL_POR_DEFECTO).replace(/\/+$/, "");
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: "Los datos enviados no son válidos. Revisalos e intentá de nuevo.",
  401: "Tu sesión no es válida o venció. Ingresá de nuevo.",
  403: "No tenés permiso para realizar esta acción.",
  404: "No encontramos lo que buscabas.",
  409: "La operación entra en conflicto con el estado actual de los datos.",
  422: "No se pudo completar la operación porque no cumple una regla del sistema.",
};

const MENSAJE_SERVIDOR = "Ocurrió un error en el servidor. Intentá de nuevo en unos minutos.";
const MENSAJE_RED = "No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.";

/** Error normalizado: siempre tiene el formato del contrato, venga de donde venga la falla. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly details: ErrorDetalle[];
  /** `true` cuando nunca hubo respuesta (servidor caído, sin red, CORS). */
  readonly esRed: boolean;

  constructor(init: {
    statusCode: number;
    error: string;
    message: string;
    details?: ErrorDetalle[];
    esRed?: boolean;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.statusCode = init.statusCode;
    this.error = init.error;
    this.details = init.details ?? [];
    this.esRed = init.esRed ?? false;
  }

  /** Mensajes por campo, listos para mostrar debajo de cada input. */
  get erroresPorCampo(): Record<string, string> {
    const porCampo: Record<string, string> = {};
    for (const { campo, mensaje } of this.details) {
      if (campo && !(campo in porCampo)) porCampo[campo] = mensaje;
    }
    return porCampo;
  }
}

export function esApiError(valor: unknown): valor is ApiError {
  return valor instanceof ApiError;
}

/** Texto para mostrar al usuario ante cualquier error capturado. */
export function mensajeDeError(error: unknown): string {
  if (esApiError(error)) return error.message;
  return "Ocurrió un error inesperado. Intentá de nuevo.";
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Convierte cualquier cuerpo de error (JSON del contrato, texto, vacío) en un ApiError. */
export function normalizarError(statusCode: number, cuerpo: unknown): ApiError {
  const base = esObjeto(cuerpo) ? cuerpo : {};

  let message = "";
  if (typeof base.message === "string") message = base.message.trim();
  else if (Array.isArray(base.message)) {
    message = base.message.filter((m): m is string => typeof m === "string").join(" ");
  }
  if (!message) {
    message = MENSAJES_POR_ESTADO[statusCode] ?? (statusCode >= 500 ? MENSAJE_SERVIDOR : "No se pudo completar la operación.");
  }

  const details: ErrorDetalle[] = Array.isArray(base.details)
    ? base.details.flatMap((d): ErrorDetalle[] =>
        esObjeto(d) && typeof d.campo === "string" && typeof d.mensaje === "string"
          ? [{ campo: d.campo, mensaje: d.mensaje }]
          : [],
      )
    : [];

  return new ApiError({
    statusCode: typeof base.statusCode === "number" ? base.statusCode : statusCode,
    error: typeof base.error === "string" && base.error ? base.error : `HTTP ${statusCode}`,
    message,
    details,
  });
}

// ---------------------------------------------------------------------------
// Redirección ante 401
// ---------------------------------------------------------------------------

let manejadorNoAutorizado: (() => void) | null = null;

/**
 * El proveedor de sesión registra acá qué hacer ante un 401 (limpiar estado y navegar
 * a /login). Devuelve la función para desregistrarlo.
 */
export function setManejadorNoAutorizado(manejador: (() => void) | null): () => void {
  manejadorNoAutorizado = manejador;
  return () => {
    if (manejadorNoAutorizado === manejador) manejadorNoAutorizado = null;
  };
}

function alNoAutorizado(): void {
  clearToken();
  if (manejadorNoAutorizado) {
    manejadorNoAutorizado();
    return;
  }
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    // Sin router disponible (fuera del AuthProvider) alcanza una navegación completa.
    window.location.replace("/login");
  }
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export type ValorQuery = string | number | boolean | null | undefined | (string | number)[];

export interface OpcionesRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, ValorQuery>;
  signal?: AbortSignal;
  /**
   * Por defecto, un 401 limpia el token y redirige a /login. Se desactiva en login y
   * registro (donde 401 significa "credenciales inválidas") y en la carga inicial de sesión.
   */
  redirigirSi401?: boolean;
}

/** Arma el query string omitiendo valores vacíos. Los arreglos se unen con comas (`tecnologias=1,2`). */
export function construirQuery(query?: Record<string, ValorQuery>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) {
    if (valor === undefined || valor === null || valor === "") continue;
    if (Array.isArray(valor)) {
      if (valor.length > 0) params.set(clave, valor.join(","));
    } else {
      params.set(clave, String(valor));
    }
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

async function leerCuerpo(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text();
  if (!texto) return undefined;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}

export async function request<T>(path: string, opciones: OpcionesRequest = {}): Promise<T> {
  const { method = "GET", body, query, signal, redirigirSi401 = true } = opciones;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${getApiBaseUrl()}${path}${construirQuery(query)}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // Una cancelación voluntaria (cambió la pantalla, se desmontó el componente) no es un error de red.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ statusCode: 0, error: "Network Error", message: MENSAJE_RED, esRed: true });
  }

  if (respuesta.status === 204) return undefined as T;

  const cuerpo = await leerCuerpo(respuesta);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && redirigirSi401) alNoAutorizado();
    throw normalizarError(respuesta.status, cuerpo);
  }

  return cuerpo as T;
}
