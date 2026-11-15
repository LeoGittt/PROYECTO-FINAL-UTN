import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "@/lib/api/client";
import { getToken, setToken, TOKEN_STORAGE_KEY } from "@/lib/api/token";
import type { LoginInput } from "@/lib/api/types";
import { PERFIL_ESTUDIANTE, USUARIO_ESTUDIANTE } from "@/test/fixtures";
import { AuthProvider, useAuth } from "./AuthProvider";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

type Manejador = (init: RequestInit) => Response | Promise<Response>;

function json(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

/** Simula el backend: cada clave es "MÉTODO /ruta" (sin la base de la API). */
function simularApi(rutas: Record<string, Manejador>) {
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init = {}) => {
    const url = new URL(String(entrada));
    const clave = `${init.method ?? "GET"} ${url.pathname.replace(/^\/api/, "")}`;
    const manejador = rutas[clave];
    if (!manejador) throw new Error(`Ruta no simulada: ${clave}`);
    return manejador(init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const SESION = { usuario: USUARIO_ESTUDIANTE, perfil: PERFIL_ESTUDIANTE };

/** Muestra el estado del contexto y expone las acciones como botones. */
function Sonda({ credenciales = { email: "ana@utn.edu.ar", contrasena: "clave1234" } }: { credenciales?: LoginInput }) {
  const { estado, usuario, perfil, login, logout, refrescar } = useAuth();
  return (
    <div>
      <p data-testid="estado">{estado}</p>
      <p data-testid="usuario">{usuario ? `${usuario.nombre} ${usuario.apellido}` : "-"}</p>
      <p data-testid="perfil">{perfil ? "con perfil" : "sin perfil"}</p>
      <button onClick={() => login(credenciales).catch(() => undefined)}>login</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => void refrescar()}>refrescar</button>
    </div>
  );
}

const estado = () => screen.getByTestId("estado").textContent;

function montar() {
  return render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.push.mockReset();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("al iniciar", () => {
    it("sin token queda como anónimo y no consulta a la API", async () => {
      const fetchMock = simularApi({});
      montar();

      await waitFor(() => expect(estado()).toBe("anonimo"));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("con un token guardado consulta GET /auth/yo con el Bearer y recupera la sesión", async () => {
      setToken("jwt-guardado");
      const fetchMock = simularApi({ "GET /auth/yo": () => json(200, SESION) });
      montar();

      expect(estado()).toBe("cargando");
      await waitFor(() => expect(estado()).toBe("autenticado"));

      expect(screen.getByTestId("usuario")).toHaveTextContent("Ana Pérez");
      expect(screen.getByTestId("perfil")).toHaveTextContent("con perfil");
      expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer jwt-guardado" });
    });

    it("descarta un token vencido (401) y queda anónimo", async () => {
      setToken("vencido");
      simularApi({ "GET /auth/yo": () => json(401, { message: "Token vencido." }) });
      montar();

      await waitFor(() => expect(estado()).toBe("anonimo"));
      expect(getToken()).toBeNull();
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    it("si no hay conexión queda anónimo pero conserva el token para reintentar", async () => {
      setToken("jwt-guardado");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      montar();

      await waitFor(() => expect(estado()).toBe("anonimo"));
      expect(getToken()).toBe("jwt-guardado");
    });
  });

  describe("login", () => {
    it("guarda el token, carga el perfil y deja la sesión iniciada", async () => {
      const fetchMock = simularApi({
        "POST /auth/login": () => json(200, { token: "jwt-nuevo", usuario: USUARIO_ESTUDIANTE }),
        "GET /auth/yo": () => json(200, SESION),
      });
      const usuario = userEvent.setup();
      montar();
      await waitFor(() => expect(estado()).toBe("anonimo"));

      await usuario.click(screen.getByRole("button", { name: "login" }));

      await waitFor(() => expect(estado()).toBe("autenticado"));
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("jwt-nuevo");
      expect(getToken()).toBe("jwt-nuevo");
      expect(screen.getByTestId("perfil")).toHaveTextContent("con perfil");

      const [, init] = fetchMock.mock.calls[0];
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ email: "ana@utn.edu.ar", contrasena: "clave1234" });
      // La carga del perfil ya viaja con el token recién guardado.
      expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer jwt-nuevo" });
    });

    it("si el perfil no se puede cargar igual deja la sesión iniciada, sin perfil", async () => {
      simularApi({
        "POST /auth/login": () => json(200, { token: "jwt-nuevo", usuario: USUARIO_ESTUDIANTE }),
        "GET /auth/yo": () => json(500, {}),
      });
      const usuario = userEvent.setup();
      montar();
      await waitFor(() => expect(estado()).toBe("anonimo"));

      await usuario.click(screen.getByRole("button", { name: "login" }));

      await waitFor(() => expect(estado()).toBe("autenticado"));
      expect(screen.getByTestId("perfil")).toHaveTextContent("sin perfil");
    });

    it("con credenciales inválidas no guarda nada, no redirige y deja el error para el formulario", async () => {
      simularApi({
        "POST /auth/login": () => json(401, { statusCode: 401, error: "Unauthorized", message: "Email o contraseña incorrectos." }),
      });
      let capturado: unknown;
      function Intento() {
        const { login } = useAuth();
        return (
          <button onClick={() => login({ email: "a@b.com", contrasena: "mal" }).catch((e: unknown) => (capturado = e))}>
            intentar
          </button>
        );
      }
      const usuario = userEvent.setup();
      render(
        <AuthProvider>
          <Intento />
        </AuthProvider>,
      );

      await usuario.click(screen.getByRole("button", { name: "intentar" }));

      await waitFor(() => expect(capturado).toMatchObject({ statusCode: 401, message: "Email o contraseña incorrectos." }));
      expect(getToken()).toBeNull();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  describe("registrar", () => {
    it("guarda el token de la cuenta nueva y deja la sesión iniciada", async () => {
      simularApi({
        "POST /auth/registro": () => json(201, { token: "jwt-registro", usuario: USUARIO_ESTUDIANTE }),
        "GET /auth/yo": () => json(200, { usuario: USUARIO_ESTUDIANTE, perfil: null }),
      });
      function Registro() {
        const { registrar, estado: e, perfil } = useAuth();
        return (
          <>
            <p data-testid="estado">{e}</p>
            <p data-testid="perfil">{perfil ? "con perfil" : "sin perfil"}</p>
            <button
              onClick={() =>
                void registrar({ nombre: "Ana", apellido: "Pérez", email: "ana@utn.edu.ar", contrasena: "clave1234", rol: "estudiante" })
              }
            >
              registrar
            </button>
          </>
        );
      }
      const usuario = userEvent.setup();
      render(
        <AuthProvider>
          <Registro />
        </AuthProvider>,
      );
      await waitFor(() => expect(estado()).toBe("anonimo"));

      await usuario.click(screen.getByRole("button", { name: "registrar" }));

      await waitFor(() => expect(estado()).toBe("autenticado"));
      expect(getToken()).toBe("jwt-registro");
      expect(screen.getByTestId("perfil")).toHaveTextContent("sin perfil");
    });
  });

  describe("logout", () => {
    it("borra el token y el estado de sesión, y vuelve al inicio", async () => {
      setToken("jwt-guardado");
      simularApi({ "GET /auth/yo": () => json(200, SESION) });
      const usuario = userEvent.setup();
      montar();
      await waitFor(() => expect(estado()).toBe("autenticado"));

      await usuario.click(screen.getByRole("button", { name: "logout" }));

      expect(estado()).toBe("anonimo");
      expect(screen.getByTestId("usuario")).toHaveTextContent("-");
      expect(getToken()).toBeNull();
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(router.push).toHaveBeenCalledWith("/");
    });
  });

  describe("ante un 401 en cualquier pantalla", () => {
    it("cierra la sesión, borra el token y manda al login avisando que venció", async () => {
      setToken("jwt-guardado");
      simularApi({
        "GET /auth/yo": () => json(200, SESION),
        "GET /postulaciones/mias": () => json(401, { message: "Token vencido." }),
      });
      montar();
      await waitFor(() => expect(estado()).toBe("autenticado"));

      await act(async () => {
        await request("/postulaciones/mias").catch(() => undefined);
      });

      expect(estado()).toBe("anonimo");
      expect(getToken()).toBeNull();
      expect(router.replace).toHaveBeenCalledWith("/login?expirada=1");
    });
  });

  describe("refrescar", () => {
    it("vuelve a pedir la sesión y actualiza el perfil", async () => {
      setToken("jwt-guardado");
      let respuesta: unknown = { usuario: USUARIO_ESTUDIANTE, perfil: null };
      simularApi({ "GET /auth/yo": () => json(200, respuesta) });
      const usuario = userEvent.setup();
      montar();
      await waitFor(() => expect(screen.getByTestId("perfil")).toHaveTextContent("sin perfil"));

      respuesta = SESION;
      await usuario.click(screen.getByRole("button", { name: "refrescar" }));

      await waitFor(() => expect(screen.getByTestId("perfil")).toHaveTextContent("con perfil"));
    });

    it("un fallo de red al refrescar no le quita la sesión a quien ya la tenía", async () => {
      setToken("jwt-guardado");
      let caido = false;
      simularApi({
        "GET /auth/yo": () => {
          if (caido) throw new TypeError("Failed to fetch");
          return json(200, SESION);
        },
      });
      const usuario = userEvent.setup();
      montar();
      await waitFor(() => expect(estado()).toBe("autenticado"));

      caido = true;
      await usuario.click(screen.getByRole("button", { name: "refrescar" }));

      await waitFor(() => expect(getToken()).toBe("jwt-guardado"));
      expect(estado()).toBe("autenticado");
    });
  });

  it("useAuth fuera del proveedor lanza un error claro", () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Sonda />)).toThrow("useAuth debe usarse dentro de <AuthProvider>.");
    consola.mockRestore();
  });
});
