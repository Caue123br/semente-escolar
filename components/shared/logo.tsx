import { cn } from "@/lib/utils";

export function SementeLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
    >
      <defs>
        <linearGradient id="leaf-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="stem-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
      </defs>
      {/* Folha esquerda */}
      <path
        d="M32 36 C 16 36, 8 24, 12 12 C 24 14, 32 22, 32 36 Z"
        fill="url(#leaf-grad)"
      />
      {/* Folha direita */}
      <path
        d="M32 36 C 48 36, 56 24, 52 12 C 40 14, 32 22, 32 36 Z"
        fill="url(#leaf-grad)"
        opacity="0.85"
      />
      {/* Caule */}
      <path
        d="M32 36 L 32 52"
        stroke="url(#stem-grad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Brotinho central */}
      <circle cx="32" cy="36" r="3" fill="#fbbf24" />
    </svg>
  );
}
