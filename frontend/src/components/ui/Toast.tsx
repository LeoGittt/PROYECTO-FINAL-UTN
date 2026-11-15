"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type TipoToast = "exito" | "error" | "info";

interface DatosToast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
  titulo?: string;
}

interface ApiToast {
  exito: (mensaje: string, titulo?: string) => void;
  error: (mensaje: string, titulo?: string) => void;
  info: (mensaje: string, titulo?: string) => void;
}

const ToastContext = createContext<ApiToast | null>(null);

const ESTILOS: Record<TipoToast, { caja: string; icono: ReactNode }> = {
  exito: { caja: "border-success", icono: <CircleCheck className="size-5 text-success" /> },
  error: { caja: "border-danger", icono: <CircleAlert className="size-5 text-danger" /> },
  info: { caja: "border-primary", icono: <Info className="size-5 text-primary" /> },
};

const DURACION_MS: Record<TipoToast, number> = { exito: 5000, info: 5000, error: 9000 };

function ItemToast({ toast, alQuitar }: { toast: DatosToast; alQuitar: (id: number) => void }) {
  useEffect(() => {
    const temporizador = setTimeout(() => alQuitar(toast.id), DURACION_MS[toast.tipo]);
    return () => clearTimeout(temporizador);
  }, [toast.id, toast.tipo, alQuitar]);

  const { caja, icono } = ESTILOS[toast.tipo];
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-xl border-2 bg-surface p-4 shadow-pop animate-toast-in sm:w-96",
        caja,
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icono}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {toast.titulo && <p className="font-semibold text-ink">{toast.titulo}</p>}
        <p className="text-ink">{toast.mensaje}</p>
      </div>
      <button
        type="button"
        onClick={() => alQuitar(toast.id)}
        aria-label="Cerrar aviso"
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

/**
 * Avisos temporales. Las regiones `aria-live` existen siempre (vacías) para que los
 * lectores de pantalla anuncien lo que se agrega: los éxitos con cortesía (`status`)
 * y los errores de inmediato (`alert`).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<DatosToast[]>([]);
  const contador = useRef(0);

  const quitar = useCallback((id: number) => setToasts((actuales) => actuales.filter((t) => t.id !== id)), []);

  const agregar = useCallback((tipo: TipoToast, mensaje: string, titulo?: string) => {
    contador.current += 1;
    const nuevo: DatosToast = { id: contador.current, tipo, mensaje, titulo };
    setToasts((actuales) => [...actuales, nuevo].slice(-4));
  }, []);

  const api = useMemo<ApiToast>(
    () => ({
      exito: (mensaje, titulo) => agregar("exito", mensaje, titulo),
      error: (mensaje, titulo) => agregar("error", mensaje, titulo),
      info: (mensaje, titulo) => agregar("info", mensaje, titulo),
    }),
    [agregar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
        <div role="status" aria-live="polite" className="flex w-full flex-col items-end gap-2">
          {toasts
            .filter((t) => t.tipo !== "error")
            .map((t) => (
              <ItemToast key={t.id} toast={t} alQuitar={quitar} />
            ))}
        </div>
        <div role="alert" aria-live="assertive" className="flex w-full flex-col items-end gap-2">
          {toasts
            .filter((t) => t.tipo === "error")
            .map((t) => (
              <ItemToast key={t.id} toast={t} alQuitar={quitar} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ApiToast {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return contexto;
}
