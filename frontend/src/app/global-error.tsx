"use client";

/**
 * Último recurso: se muestra cuando falla el layout raíz. Reemplaza al documento completo,
 * por eso define su propio <html> y estilos mínimos en línea (no dependen de la hoja global).
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          background: "#f6f3eb",
          color: "#131629",
        }}
      >
        <main role="alert" style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.875rem", margin: "0 0 0.75rem" }}>Algo salió mal</h1>
          <p style={{ margin: "0 0 1.5rem", lineHeight: 1.6, color: "#4a4f68" }}>
            La aplicación tuvo un error grave y no pudo cargarse. Probá de nuevo; si sigue igual, volvé a intentar en unos minutos.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              height: "2.75rem",
              padding: "0 1.25rem",
              border: 0,
              borderRadius: "0.5rem",
              background: "#2b3fd9",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
