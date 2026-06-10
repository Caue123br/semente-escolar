import type { Alerta } from "@/lib/types";
import { inadimplentes } from "@/lib/mock-data/financeiro";
import { alunosEstagnados } from "@/lib/mock-data/pedagogico";
import { itensAbaixoPontoReposicao, itensValidadeProxima } from "@/lib/mock-data/estoque";

// Constrói lista de alertas dinamicamente a partir dos outros mocks
function construirAlertas(): Alerta[] {
  const lista: Alerta[] = [];

  // Inadimplência (top 3 por dias)
  inadimplentes.slice(0, 3).forEach((m, i) => {
    lista.push({
      id: `a-inad-${i}`,
      tipo: "inadimplencia",
      severidade: m.diasAtraso > 20 ? "vermelho" : "amarelo",
      titulo: `${m.alunoNome.split(" ")[0]} ${m.alunoNome.split(" ").slice(-1)[0]} — ${m.diasAtraso} dias em atraso`,
      descricao: `Mensalidade de junho/2026 em aberto (R$ ${m.valor.toFixed(2).replace(".", ",")}). ${m.turmaNome}.`,
      link: "/financeiro",
      data: m.vencimento,
    });
  });

  // Estagnação pedagógica
  alunosEstagnados().slice(0, 2).forEach((e, i) => {
    lista.push({
      id: `a-estag-${i}`,
      tipo: "estagnacao",
      severidade: "amarelo",
      titulo: `${e.alunoNome} sem evolução pedagógica`,
      descricao: "Aluno não apresentou avanço em 3+ competências entre os dois últimos bimestres.",
      link: `/pedagogico/${e.alunoId}`,
      data: "2026-06-07",
    });
  });

  // Estoque baixo (top 2)
  itensAbaixoPontoReposicao.slice(0, 2).forEach((item, i) => {
    lista.push({
      id: `a-estq-${i}`,
      tipo: "estoque",
      severidade: "vermelho",
      titulo: `Estoque baixo: ${item.nome}`,
      descricao: `Restam ${item.quantidade} ${item.unidade} (ponto de reposição: ${item.pontoReposicao}).`,
      link: "/estoque",
      data: "2026-06-09",
    });
  });

  // Validade próxima
  itensValidadeProxima.slice(0, 2).forEach((item, i) => {
    lista.push({
      id: `a-val-${i}`,
      tipo: "validade",
      severidade: "amarelo",
      titulo: `Validade próxima: ${item.nome}`,
      descricao: `Vence em ${new Date(item.validade!).toLocaleDateString("pt-BR")} (${item.quantidade} ${item.unidade} em estoque).`,
      link: "/estoque",
      data: item.validade!,
    });
  });

  // Evasão (mock)
  lista.push({
    id: "a-evasao-1",
    tipo: "evasao",
    severidade: "amarelo",
    titulo: "2 famílias solicitaram informações sobre transferência",
    descricao: "Liz Cardoso (3º Ano) e Théo Araújo (1º Ano) — entrar em contato para entender motivo.",
    link: "/alunos",
    data: "2026-06-06",
  });

  return lista;
}

export const alertasCockpit: Alerta[] = construirAlertas();
