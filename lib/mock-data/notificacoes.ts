export type TipoNotif =
  | "inadimplencia"
  | "pedagogico"
  | "estoque"
  | "matricula"
  | "evento"
  | "sistema";

export interface Notificacao {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  desc: string;
  tempo: string;
  lida: boolean;
  link?: string;
  prioridade?: "alta" | "media" | "baixa";
}

export const notificacoes: Notificacao[] = [
  {
    id: "n1",
    tipo: "inadimplencia",
    titulo: "3 novos inadimplentes",
    desc: "Mariana Almeida, Patrícia Costa e Daniela Carvalho não pagaram a mensalidade.",
    tempo: "há 15 min",
    lida: false,
    link: "/financeiro",
    prioridade: "alta",
  },
  {
    id: "n2",
    tipo: "pedagogico",
    titulo: "Aluno em estagnação detectado",
    desc: "Heitor Pereira Lima não evoluiu em 4 competências entre o 1º e 2º bimestre.",
    tempo: "há 1h",
    lida: false,
    link: "/pedagogico/a2",
    prioridade: "alta",
  },
  {
    id: "n3",
    tipo: "estoque",
    titulo: "Estoque crítico: Feijão carioca",
    desc: "Restam apenas 18 kg (ponto de reposição: 25 kg).",
    tempo: "há 2h",
    lida: false,
    link: "/estoque",
    prioridade: "media",
  },
  {
    id: "n4",
    tipo: "matricula",
    titulo: "Nova matrícula confirmada",
    desc: "Eduarda Faria matriculou Henrique no 2º Ano - A. Início em julho.",
    tempo: "há 3h",
    lida: true,
    link: "/crm",
    prioridade: "baixa",
  },
  {
    id: "n5",
    tipo: "evento",
    titulo: "Festa Junina amanhã",
    desc: "Lembrete: a Festa Junina será dia 22/06 das 10h às 16h no pátio.",
    tempo: "há 5h",
    lida: true,
    link: "/calendario",
    prioridade: "media",
  },
  {
    id: "n6",
    tipo: "pedagogico",
    titulo: "Boletins do 2º bim disponíveis",
    desc: "Todos os 20 boletins do 2º bimestre estão prontos para revisão.",
    tempo: "ontem",
    lida: true,
    link: "/pedagogico",
    prioridade: "baixa",
  },
  {
    id: "n7",
    tipo: "sistema",
    titulo: "Backup automático concluído",
    desc: "2,4 GB de dados copiados às 02:00. Próximo backup amanhã.",
    tempo: "ontem",
    lida: true,
    prioridade: "baixa",
  },
];
