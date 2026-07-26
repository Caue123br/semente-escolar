import type { Perfil } from "@/lib/types";

/**
 * Mapa compartilhado entre navegação cliente e autorização de páginas.
 * Rotas derivadas apontam para o módulo que realmente concede o acesso.
 */
export const MODULO_POR_ROTA: Readonly<Record<string, string>> = {
  "/cockpit": "cockpit",
  "/financeiro": "financeiro",
  "/vendas": "vendas",
  "/nota-fiscal": "nota-fiscal",
  "/pedagogico": "pedagogico",
  "/boletim": "pedagogico",
  "/alunos": "alunos",
  "/ficha": "alunos",
  "/kanban": "kanban",
  "/biblioteca": "biblioteca",
  "/bercario": "bercario",
  "/frequencia": "frequencia",
  "/calendario": "calendario",
  "/cardapio": "cardapio",
  "/mural": "mural",
  "/reservas": "reservas",
  "/transporte": "transporte",
  "/estoque": "estoque",
  "/patrimonio": "patrimonio",
  "/rh": "rh",
  "/crm": "crm",
  "/relatorios": "relatorios",
  "/extrato": "financeiro",
  "/saude": "saude",
  "/recados": "recados",
  "/whatsapp": "whatsapp",
  "/configuracoes": "configuracoes",
  "/lgpd": "lgpd",
};

export const ROTAS_SOMENTE_DIRETOR = [
  "/super-admin",
  "/configuracoes",
  "/lgpd",
] as const;

export function rotaSomenteDiretor(pathname: string): boolean {
  return ROTAS_SOMENTE_DIRETOR.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  );
}

/** A ficha reúne dados cadastrais e de saúde, por isso é mais restrita. */
export function podeAcessarFicha(perfil: Perfil): boolean {
  return perfil === "diretor" || perfil === "coordenador";
}
