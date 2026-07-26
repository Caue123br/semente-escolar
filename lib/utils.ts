import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const FUSO_HORARIO_ESCOLA = "America/Sao_Paulo";

const formatadorDataCivil = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_HORARIO_ESCOLA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0";
  return value.toLocaleString("pt-BR");
}

export function formatDateBR(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date.length === 10 ? date + "T00:00:00" : date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

/**
 * Retorna a data civil da escola em YYYY-MM-DD, sem convertê-la para UTC.
 * Use em campos DATE, inputs de calendário e nomes de arquivo; timestamps
 * continuam usando Date#toISOString().
 */
export function formatDateLocalISO(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Data inválida");
  }

  const partes = formatadorDataCivil.formatToParts(date);
  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;
  if (!ano || !mes || !dia) throw new Error("Não foi possível formatar a data local");
  return `${ano}-${mes}-${dia}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function diffDays(from: Date | string, to: Date | string = new Date()): number {
  const f = typeof from === "string" ? new Date(from) : from;
  const t = typeof to === "string" ? new Date(to) : to;
  return Math.floor((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Formata data como relativa: "agora", "5 min atrás", "hoje 14:30",
 * "ontem 10:15", "5 dias atrás", "12/06/2026".
 */
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const agora = new Date();
  const diffMs = agora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffH = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffH / 24);

  if (diffMs < 0) {
    // Futuro
    if (diffH > -24) return `em ${Math.abs(diffH)}h`;
    if (diffDias > -7) return `em ${Math.abs(diffDias)} dias`;
    return d.toLocaleDateString("pt-BR");
  }

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min atrás`;
  if (diffH < 6) return `${diffH}h atrás`;

  const ehHoje =
    d.getDate() === agora.getDate() &&
    d.getMonth() === agora.getMonth() &&
    d.getFullYear() === agora.getFullYear();
  if (ehHoje) {
    return `hoje ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  const ehOntem =
    d.getDate() === ontem.getDate() &&
    d.getMonth() === ontem.getMonth() &&
    d.getFullYear() === ontem.getFullYear();
  if (ehOntem) {
    return `ontem ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (diffDias < 7) return `${diffDias} dias atrás`;
  return d.toLocaleDateString("pt-BR");
}
