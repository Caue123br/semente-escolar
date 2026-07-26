"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[GlobalError]", error);
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#fafafa",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>😵‍💫</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Erro grave no sistema
          </h1>
          <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
            Algo deu muito errado no carregamento. Tente recarregar a página. Se o problema persistir, contate a Diretora.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#999", marginBottom: 16, fontFamily: "monospace" }}>
              ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#10b981",
                color: "white",
                border: 0,
                padding: "10px 20px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Tentar de novo
            </button>
            <button
              onClick={() => (window.location.href = "/cockpit")}
              style={{
                background: "white",
                color: "#333",
                border: "1px solid #ddd",
                padding: "10px 20px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Ir pra Cockpit
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
