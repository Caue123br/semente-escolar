import type { PessoaAutorizada } from "./types";

export const PERIODOS_MATRICULA = [
  { valor: "parcial_manha", nome: "Parcial Manhã", horario: "Saída até 12:00", contrato: "parcial" },
  { valor: "parcial_tarde", nome: "Parcial Tarde", horario: "13:00 às 17:00", contrato: "parcial" },
  { valor: "semi_manha", nome: "Semi Manhã", horario: "Saída até 13:30", contrato: "semi" },
  { valor: "semi_tarde", nome: "Semi Tarde", horario: "13:00 às 18:30", contrato: "semi" },
  { valor: "intermediario_manha", nome: "Intermediário Manhã", horario: "08:00 às 15:00", contrato: "intermediario" },
  { valor: "intermediario_tarde", nome: "Intermediário Tarde", horario: "11:00 às 18:30", contrato: "intermediario" },
  { valor: "integral", nome: "Integral", horario: "07:00 às 18:30", contrato: "integral" },
] as const;

export type PeriodoMatricula = (typeof PERIODOS_MATRICULA)[number]["valor"];

export function obterPeriodoMatricula(valor: unknown) {
  return PERIODOS_MATRICULA.find((periodo) => periodo.valor === valor);
}

export function formatarPeriodoMatricula(valor: unknown): string {
  const periodo = obterPeriodoMatricula(valor);
  return periodo ? `${periodo.nome} — ${periodo.horario}` : "";
}

type PessoasAutorizadasNormalizadas =
  | { ok: true; lista: PessoaAutorizada[] }
  | { ok: false; mensagem: string };

/** Telefones ausentes continuam válidos nas fichas antigas e nos formulários já abertos. */
export function normalizarPessoasAutorizadas(valor: unknown): PessoasAutorizadasNormalizadas {
  if (!Array.isArray(valor)) {
    return { ok: false, mensagem: "Dados inválidos: pessoas autorizadas." };
  }
  const lista: PessoaAutorizada[] = [];
  for (const pessoa of valor) {
    if (!pessoa || typeof pessoa !== "object" || Array.isArray(pessoa)) {
      return { ok: false, mensagem: "Dados inválidos: pessoas autorizadas." };
    }
    const recebido: unknown = pessoa.telefone;
    if (recebido != null && typeof recebido !== "string") {
      return { ok: false, mensagem: "Informe o telefone da pessoa autorizada com DDD e 10 ou 11 números." };
    }
    const texto = typeof recebido === "string" ? recebido.trim() : "";
    const telefone = texto.replace(/\D/g, "");
    if (texto && (!/^[\d\s().-]+$/.test(texto) || !/^\d{10,11}$/.test(telefone))) {
      return { ok: false, mensagem: "Informe o telefone da pessoa autorizada com DDD e 10 ou 11 números." };
    }
    const normalizada = { ...pessoa };
    if (typeof pessoa.nome === "string") normalizada.nome = pessoa.nome.trim();
    if (typeof pessoa.parentesco === "string") normalizada.parentesco = pessoa.parentesco.trim();
    delete normalizada.telefone;
    if (telefone) normalizada.telefone = telefone;
    lista.push(normalizada as PessoaAutorizada);
  }
  return { ok: true, lista };
}
