import { SementeLogo } from "@/components/shared/logo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-white/30 blur-2xl animate-pulse" />
          <div className="relative h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl">
            <SementeLogo className="h-10 w-10" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">Semente</div>
        <div className="text-xs text-emerald-200">Carregando o sistema...</div>
        <div className="flex gap-1 mt-2">
          <span className="h-2 w-2 rounded-full bg-white/80 animate-bounce" />
          <span
            className="h-2 w-2 rounded-full bg-white/80 animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-white/80 animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>
    </div>
  );
}
