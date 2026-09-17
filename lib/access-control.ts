import type { Perfil } from "@/lib/types";

/**
 * Matriz única de acesso por módulo, compartilhada pelo servidor e pela UI.
 * Regras por ação mais sensíveis (como alterar alunos) continuam no proxy.
 */
export const MODULOS_POR_PERFIL: Readonly<Record<Perfil, readonly string[]>> = {
  diretor: ["*"],
  coordenador: [
    "cockpit",
    "alunos",
    "pedagogico",
    "kanban",
    "biblioteca",
    "bercario",
    "saude",
    "recados",
    "calendario",
    "cardapio",
    "transporte",
    "reservas",
    "patrimonio",
    "whatsapp",
    "mural",
    "rh",
    "crm",
    "relatorios",
    "frequencia",
  ],
  professor: [
    "cockpit",
    "alunos",
    "pedagogico",
    "kanban",
    "biblioteca",
    "bercario",
    "saude",
    "recados",
    "calendario",
    "cardapio",
    "reservas",
    "mural",
    "frequencia",
  ],
  financeiro: [
    "cockpit",
    "financeiro",
    "vendas",
    "nota-fiscal",
    "estoque",
    "despesas",
    "relatorios",
  ],
};

export function podeAcessarModulo(perfil: Perfil, modulo: string): boolean {
  const permitidos = MODULOS_POR_PERFIL[perfil];
  return permitidos.includes("*") || permitidos.includes(modulo);
}

export function podeGerenciarAlunos(perfil: Perfil): boolean {
  return perfil === "diretor" || perfil === "coordenador";
}

/**
 * Leitura do cadastro de alunos e turmas. Além dos perfis do módulo `alunos`,
 * o financeiro precisa do responsável e da turma para cobrar — a escrita
 * continua restrita a `podeGerenciarAlunos`.
 */
export function podeLerCadastroDeAlunos(perfil: Perfil): boolean {
  return podeAcessarModulo(perfil, "alunos") || perfil === "financeiro";
}

/**
 * Cobranças e mensalidades de um aluno formam a ficha financeira individual,
 * que faz parte da matrícula — por isso a coordenação entra aqui. Não é o
 * módulo `financeiro` inteiro: DRE, despesas e folha seguem fora do alcance
 * da coordenação.
 */
export function podeVerFinanceiroDoAluno(perfil: Perfil): boolean {
  return podeAcessarModulo(perfil, "financeiro") || perfil === "coordenador";
}
