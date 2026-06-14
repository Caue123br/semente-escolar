import { ImageResponse } from "next/og";

export const alt =
  "Semente — o sistema operacional da sua escola infantil";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(135deg, #064e3b 0%, #047857 45%, #10b981 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow decorativo */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -150,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(52, 211, 153, 0.45) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, transparent 70%)",
          }}
        />

        {/* Header — logo + nome */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
              <path
                d="M32 36 C 16 36, 8 24, 12 12 C 24 14, 32 22, 32 36 Z"
                fill="#ffffff"
              />
              <path
                d="M32 36 C 48 36, 56 24, 52 12 C 40 14, 32 22, 32 36 Z"
                fill="#ffffff"
                opacity="0.85"
              />
              <path
                d="M32 36 L 32 52"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="32" cy="36" r="3" fill="#fbbf24" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            Semente
          </div>
        </div>

        {/* Manchete */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              alignSelf: "flex-start",
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#fbbf24",
              }}
            />
            O 1º sistema que une financeiro + pedagógico
          </div>

          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            O sistema operacional da sua escola infantil
          </div>

          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 880,
              lineHeight: 1.35,
            }}
          >
            Gestão administrativa, financeira e acompanhamento pedagógico
            num só lugar.
          </div>
        </div>

        {/* Rodapé — pílulas de módulos */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {[
            "24 módulos",
            "Cockpit com IA",
            "WhatsApp integrado",
            "CRM de matrículas",
            "100% PT-BR",
          ].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.22)",
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
