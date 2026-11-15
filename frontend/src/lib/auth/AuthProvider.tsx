"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api/endpoints";
import { esApiError, setManejadorNoAutorizado } from "@/lib/api/client";
import { clearToken, getToken, setToken } from "@/lib/api/token";
import type { LoginInput, Perfil, RegistroInput, Usuario } from "@/lib/api/types";

/**
 * Sesión del usuario.
 *
 * - `cargando`: todavía no sabemos (se está leyendo el token y consultando `GET /auth/yo`).
 * - `autenticado`: hay usuario; `perfil` es `null` si todavía no lo completó.
 * - `anonimo`: no hay sesión (o el token venció).
 */
export type EstadoSesion = "cargando" | "autenticado" | "anonimo";

interface Sesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  perfil: Perfil | null;
}

interface AuthContextValue extends Sesion {
  /** Inicia sesión, guarda el token y carga el perfil. Lanza `ApiError` si las credenciales son inválidas. */
  login: (datos: LoginInput) => Promise<Usuario>;
  /** Crea la cuenta y deja la sesión iniciada. */
  registrar: (datos: RegistroInput) => Promise<Usuario>;
  /** Borra el token y el estado de sesión. */
  logout: () => void;
  /** Vuelve a pedir `GET /auth/yo` (por ejemplo, después de guardar el perfil). */
  refrescar: () => Promise<void>;
}

const ANONIMO: Sesion = { estado: "anonimo", usuario: null, perfil: null };

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Resuelve la sesión que corresponde según el token guardado. Devuelve `null` cuando no hay
 * nada que cambiar (la consulta se canceló, o un refresco falló por red).
 */
async function consultarSesion(signal?: AbortSignal, esRefresco = false): Promise<Sesion | null> {
  if (!getToken()) return ANONIMO;
  try {
    const { usuario, perfil } = await api.auth.yo({ signal });
    return { estado: "autenticado", usuario, perfil };
  } catch (error) {
    if (signal?.aborted) return null;
    // Token vencido o inválido: se descarta. Ante un error de red se conserva el token para reintentar
    // al recargar, y un refresco no le quita la sesión a quien ya la tenía.
    if (esApiError(error) && error.statusCode === 401) {
      clearToken();
      return ANONIMO;
    }
    return esRefresco ? null : ANONIMO;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion>({ estado: "cargando", usuario: null, perfil: null });

  useEffect(() => {
    const controlador = new AbortController();
    void consultarSesion(controlador.signal).then((nueva) => {
      if (nueva && !controlador.signal.aborted) setSesion(nueva);
    });
    return () => controlador.abort();
  }, []);

  // Ante un 401 en cualquier llamada: sesión descartada y vuelta al login.
  useEffect(
    () =>
      setManejadorNoAutorizado(() => {
        setSesion(ANONIMO);
        router.replace("/login?expirada=1");
      }),
    [router],
  );

  const iniciarConRespuesta = useCallback(async (token: string, usuario: Usuario) => {
    setToken(token);
    try {
      const { perfil } = await api.auth.yo();
      setSesion({ estado: "autenticado", usuario, perfil });
    } catch {
      setSesion({ estado: "autenticado", usuario, perfil: null });
    }
    return usuario;
  }, []);

  const login = useCallback(
    async (datos: LoginInput) => {
      const { token, usuario } = await api.auth.login(datos);
      return iniciarConRespuesta(token, usuario);
    },
    [iniciarConRespuesta],
  );

  const registrar = useCallback(
    async (datos: RegistroInput) => {
      const { token, usuario } = await api.auth.registro(datos);
      return iniciarConRespuesta(token, usuario);
    },
    [iniciarConRespuesta],
  );

  const logout = useCallback(() => {
    clearToken();
    setSesion(ANONIMO);
    router.push("/");
  }, [router]);

  const refrescar = useCallback(async () => {
    const nueva = await consultarSesion(undefined, true);
    if (nueva) setSesion(nueva);
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({ ...sesion, login, registrar, logout, refrescar }),
    [sesion, login, registrar, logout, refrescar],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  return contexto;
}
