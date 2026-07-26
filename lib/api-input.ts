export function objetoSimples(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function texto(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function textoOpcional(value: unknown): string | null {
  const normalizado = texto(value);
  return normalizado || null;
}

export function dataCivilValida(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, anoTexto, mesTexto, diaTexto] = match;
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

export function horaValida(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

export function horaCurta(value: string): string {
  return value.slice(0, 5);
}

export function minutosDaHora(value: string): number {
  const [hora, minuto] = value.split(":").map(Number);
  return hora * 60 + minuto;
}
