import type { StatusIndicador } from "@/lib/types";
import { turmas } from "@/lib/mock-data/turmas";
import {
  totalFaturadoMes,
  totalRecebidoMes,
  totalInadimplenteMes,
  totalAReceberMes,
  variacaoFaturamentoMesAnterior,
  inadimplentes,
} from "@/lib/mock-data/financeiro";

export interface IndicadorCockpit {
  id: string;
  titulo: string;
  valor: string;
  valorNumerico: number;
  variacao?: string; // ex: "+8,2%"
  variacaoTipo?: "positiva" | "negativa" | "neutra";
  status: StatusIndicador;
  descricao: string;
  link: string;
  icone: string; // identificador do icone lucide-react
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const alunosAtivos = turmas.reduce((acc, t) => acc + t.totalAlunos, 0);
const novasMatriculas = 7; // mock
const evasaoMes = 2; // mock

export const indicadoresCockpit: IndicadorCockpit[] = [
  {
    id: "faturamento",
    titulo: "Faturamento do mês",
    valor: fmtBRL(totalFaturadoMes),
    valorNumerico: totalFaturadoMes,
    variacao: `${variacaoFaturamentoMesAnterior >= 0 ? "+" : ""}${variacaoFaturamentoMesAnterior.toFixed(1)}%`,
    variacaoTipo: variacaoFaturamentoMesAnterior >= 0 ? "positiva" : "negativa",
    status: variacaoFaturamentoMesAnterior >= 2 ? "verde" : variacaoFaturamentoMesAnterior >= 0 ? "amarelo" : "vermelho",
    descricao: "vs. mês anterior",
    link: "/financeiro",
    icone: "TrendingUp",
  },
  {
    id: "recebido",
    titulo: "Recebido",
    valor: fmtBRL(totalRecebidoMes),
    valorNumerico: totalRecebidoMes,
    variacao: `${((totalRecebidoMes / totalFaturadoMes) * 100).toFixed(1)}%`,
    variacaoTipo: "neutra",
    status: totalRecebidoMes / totalFaturadoMes > 0.9 ? "verde" : "amarelo",
    descricao: "do faturamento previsto",
    link: "/financeiro",
    icone: "Wallet",
  },
  {
    id: "a-receber",
    titulo: "A receber",
    valor: fmtBRL(totalAReceberMes),
    valorNumerico: totalAReceberMes,
    status: "amarelo",
    descricao: "Mensalidades ainda no prazo",
    link: "/financeiro",
    icone: "Clock",
  },
  {
    id: "inadimplencia",
    titulo: "Inadimplência",
    valor: fmtBRL(totalInadimplenteMes),
    valorNumerico: totalInadimplenteMes,
    variacao: `${inadimplentes.length} famílias`,
    variacaoTipo: "negativa",
    status: totalInadimplenteMes > 30000 ? "vermelho" : "amarelo",
    descricao: `${((totalInadimplenteMes / totalFaturadoMes) * 100).toFixed(1)}% do faturamento`,
    link: "/financeiro",
    icone: "AlertTriangle",
  },
  {
    id: "alunos-ativos",
    titulo: "Alunos ativos",
    valor: alunosAtivos.toString(),
    valorNumerico: alunosAtivos,
    variacao: `+${novasMatriculas} mês`,
    variacaoTipo: "positiva",
    status: "verde",
    descricao: "Matrículas vigentes",
    link: "/alunos",
    icone: "Users",
  },
  {
    id: "matriculas",
    titulo: "Novas matrículas",
    valor: novasMatriculas.toString(),
    valorNumerico: novasMatriculas,
    variacao: "+40% vs. maio",
    variacaoTipo: "positiva",
    status: "verde",
    descricao: "No mês de junho",
    link: "/alunos",
    icone: "UserPlus",
  },
  {
    id: "evasao",
    titulo: "Evasão",
    valor: evasaoMes.toString(),
    valorNumerico: evasaoMes,
    variacao: "2 alunos",
    variacaoTipo: "negativa",
    status: evasaoMes <= 2 ? "amarelo" : "vermelho",
    descricao: "Transferências/cancelamentos",
    link: "/alunos",
    icone: "UserMinus",
  },
];
