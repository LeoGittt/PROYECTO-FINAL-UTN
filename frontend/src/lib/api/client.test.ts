import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  construirQuery,
  mensajeDeError,
  normalizarError,
  request,
  setManejadorNoAutorizado,
} from "./client";
import { auth } from "./endpoints";
import { getToken, setToken } from "./token";

function respuestaJson(estado: number, cuerpo?: unknown): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

function mockFetch(...respuestas: Array<Response | Error | DOMException>) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const r of respuestas) {
    // `DOMException` de jsdom no hereda de `Error`: se distingue por "no es una Response".
    if (r instanceof Response) fetchMock.mockResolvedValueOnce(r);
    else fetchMock.mockRejectedValueOnce(r);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("normalizarError", () => {
  it("respeta el formato de error del contrato, con detalles por campo", () => {
    const error = normalizarError(400, {
      statusCode: 400,
      error: "Bad Request",
      message: "Los datos enviados no son válidos.",
      details: [
        { campo: "email", mensaje: "El email no es válido." },
        { campo: "contrasena", mensaje: "La contraseña es demasiado corta." },
      ],
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.error).toBe("Bad Request");
    expect(error.message).toBe("Los datos enviados no son válidos.");
    expect(error.erroresPorCampo).toEqual({
      email: "El email no es válido.",
      contrasena: "La contraseña es demasiado corta.",
    });
  });

  it("une un message en arreglo (formato de class-validator) en un solo texto", () => {
    const error = normalizarError(400, { message: ["Primero.", "Segundo."] });
    expect(error.message).toBe("Primero. Segundo.");
  });

  it("usa un mensaje en español cuando el cuerpo no es JSON o está vacío", () => {
    expect(normalizarError(404, undefined).message).toBe("No encontramos lo que buscabas.");
    expect(normalizarError(403, "<html>Forbidden</html>").message).toBe(
      "No tenés permiso para realizar esta acción.",
    );
    expect(normalizarError(502, undefined).message).toBe(
      "Ocurrió un error en el servidor. Intentá de nuevo en unos minutos.",
    );
    expect(normalizarError(418, undefined).message).toBe("No se pudo completar la operación.");
  });

  it("ignora detalles mal formados y conserva el primer mensaje por campo", () => {
    const error = normalizarError(400, {
      details: [
        { campo: "nombre", mensaje: "Primero." },
        { campo: "nombre", mensaje: "Segundo." },
        { campo: 3, mensaje: "inválido" },
        "texto suelto",
      ],
    });
    expect(error.details).toHaveLength(2);
    expect(error.erroresPorCampo).toEqual({ nombre: "Primero." });
  });
});

describe("mensajeDeError", () => {
  it("devuelve el mensaje de un ApiError y uno genérico para cualquier otra cosa", () => {
    expect(mensajeDeError(normalizarError(409, { message: "El email ya está registrado." }))).toBe(
      "El email ya está registrado.",
    );
    expect(mensajeDeError(new TypeError("boom"))).toBe("Ocurrió un error inesperado. Intentá de nuevo.");
  });
});

describe("construirQuery", () => {
  it("omite vacíos, une arreglos con comas y escapa los valores", () => {
    expect(
      construirQuery({
        q: "react nativo",
        tecnologias: [1, 2, 3],
        vacio: "",
        nulo: null,
        indefinido: undefined,
        lista: [],
        pagina: 2,
        activo: false,
      }),
    ).toBe("?q=react+nativo&tecnologias=1%2C2%2C3&pagina=2&activo=false");
  });

  it("devuelve una cadena vacía sin parámetros", () => {
    expect(construirQuery()).toBe("");
    expect(construirQuery({ a: undefined })).toBe("");
  });
});

describe("request", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    setManejadorNoAutorizado(null);
  });

  it("arma la URL con la base configurada (sin barra final) y el query string", async () => {
    const fetchMock = mockFetch(respuestaJson(200, { ok: true }));
    await request("/proyectos", { query: { pagina: 2, estado: "publicado" } });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/proyectos?pagina=2&estado=publicado");
  });

  it("envía el token como Bearer y el cuerpo como JSON", async () => {
    setToken("jwt-de-prueba");
    const fetchMock = mockFetch(respuestaJson(201, { id: 7 }));

    const resultado = await request<{ id: number }>("/proyectos", { method: "POST", body: { titulo: "Hola" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(resultado).toEqual({ id: 7 });
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ titulo: "Hola" }));
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer jwt-de-prueba",
      "Content-Type": "application/json",
    });
  });

  it("no envía Authorization cuando no hay sesión", async () => {
    const fetchMock = mockFetch(respuestaJson(200, {}));
    await request("/publico/estadisticas");
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
  });

  it("devuelve undefined ante un 204", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(request("/notificaciones/leer", { method: "POST" })).resolves.toBeUndefined();
  });

  it("convierte una respuesta de error en un ApiError con el formato del contrato", async () => {
    mockFetch(
      respuestaJson(409, {
        statusCode: 409,
        error: "Conflict",
        message: "El email ya está registrado.",
        details: [{ campo: "email", mensaje: "Ya existe una cuenta con ese email." }],
      }),
    );

    const error = await request("/auth/registro", { method: "POST", body: {}, redirigirSi401: false }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 409,
      error: "Conflict",
      message: "El email ya está registrado.",
      esRed: false,
    });
    expect((error as ApiError).erroresPorCampo).toEqual({ email: "Ya existe una cuenta con ese email." });
  });

  it("normaliza una falla de red a un ApiError con esRed y mensaje en español", async () => {
    mockFetch(new TypeError("Failed to fetch"));

    const error = await request("/proyectos").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 0, esRed: true });
    expect((error as ApiError).message).toMatch(/No pudimos conectarnos con el servidor/);
  });

  it("deja pasar una cancelación voluntaria sin convertirla en error de red", async () => {
    mockFetch(new DOMException("cancelada", "AbortError"));
    const error = await request("/proyectos").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  describe("ante un 401", () => {
    it("limpia el token, avisa al manejador y lanza el error", async () => {
      setToken("vencido");
      const manejador = vi.fn();
      setManejadorNoAutorizado(manejador);
      mockFetch(respuestaJson(401, { statusCode: 401, error: "Unauthorized", message: "Token vencido." }));

      const error = await request("/postulaciones").catch((e: unknown) => e);

      expect(error).toMatchObject({ statusCode: 401, message: "Token vencido." });
      expect(getToken()).toBeNull();
      expect(manejador).toHaveBeenCalledTimes(1);
    });

    it("no redirige ni borra la sesión cuando redirigirSi401 es false", async () => {
      setToken("vigente");
      const manejador = vi.fn();
      setManejadorNoAutorizado(manejador);
      mockFetch(respuestaJson(401, { message: "Credenciales inválidas." }));

      const error = await request("/auth/login", { method: "POST", body: {}, redirigirSi401: false }).catch(
        (e: unknown) => e,
      );

      expect(error).toMatchObject({ statusCode: 401, message: "Credenciales inválidas." });
      expect(manejador).not.toHaveBeenCalled();
      expect(getToken()).toBe("vigente");
    });

    it("los endpoints de login y de sesión (auth.yo) no disparan la redirección", async () => {
      const manejador = vi.fn();
      setManejadorNoAutorizado(manejador);
      mockFetch(respuestaJson(401, {}), respuestaJson(401, {}));

      await auth.login({ email: "a@b.com", contrasena: "x" }).catch(() => undefined);
      await auth.yo().catch(() => undefined);

      expect(manejador).not.toHaveBeenCalled();
    });

    it("un 403 no cierra la sesión", async () => {
      setToken("vigente");
      const manejador = vi.fn();
      setManejadorNoAutorizado(manejador);
      mockFetch(respuestaJson(403, { message: "No tenés permiso." }));

      await request("/admin/usuarios").catch(() => undefined);

      expect(manejador).not.toHaveBeenCalled();
      expect(getToken()).toBe("vigente");
    });

    it("desregistrar el manejador evita llamadas posteriores", async () => {
      const manejador = vi.fn();
      const desregistrar = setManejadorNoAutorizado(manejador);
      desregistrar();
      // Con el manejador fuera y la ruta ya en /login no hay a dónde navegar: solo se limpia el token.
      window.history.pushState({}, "", "/login");
      mockFetch(respuestaJson(401, {}));

      await request("/postulaciones").catch(() => undefined);

      expect(manejador).not.toHaveBeenCalled();
      window.history.pushState({}, "", "/");
    });
  });
});
