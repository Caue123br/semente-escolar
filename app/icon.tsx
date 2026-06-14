import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
          borderRadius: 8,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
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
    ),
    { ...size }
  );
}
