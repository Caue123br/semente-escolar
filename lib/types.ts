// ============ Tipos centrais do sistema escolar ============

export type Perfil = "diretor" | "coordenador" | "professor";

export type StatusIndicador = "verde" | "amarelo" | "vermelho";

// ----- Escola -----
export interface Escola {
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  logoTexto: string; // iniciais para logo
}

// ----- Turmas -----
export type SerieEnum =
  | "Berçário"
  | "Maternal I"
  | "Maternal II"
  | "Jardim I"
  | "Jardim II"
  | "1º Ano"
  | "2º Ano"
  | "3º Ano"
  | "4º Ano"
  | "5º Ano";

export type Turno = "Manhã" | "Tarde" | "Integral";

export interface Turma {
  id: string;
  nome: string; // ex: "Jardim II - A"
  serie: SerieEnum;
  turno: Turno;
  professorId: string;
  professorNome: string;
  totalAlunos: number;
  capacidade: number;
  cor: string; // cor para identificação visual
}

// ----- Alunos -----
export interface Responsavel {
  nome: string;
  parentesco: "Mãe" | "Pai" | "Avó" | "Avô" | "Tio" | "Tia" | "Outro";
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  principal: boolean;
}

export interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  cpf: string;
  rg?: string;
  turmaId: string;
  bilingue: boolean;
  matricula: string;
  dataMatricula: string;
  status: "Ativo" | "Inativo" | "Trancado";
  responsaveis: Responsavel[];
  observacoes?: string;
  foto?: string;
}

// ----- Pedagógico -----
// Escala de psicogênese da escrita (Emília Ferreiro)
export type NivelPsicogenese =
  | "Pré-silábico"
  | "Silábico"
  | "Silábico-alfabético"
  | "Alfabético";

export type NivelCompetencia = 1 | 2 | 3 | 4; // 1=Iniciante, 4=Pleno

export const NIVEIS_PSICOGENESE: NivelPsicogenese[] = [
  "Pré-silábico",
  "Silábico",
  "Silábico-alfabético",
  "Alfabético",
];

export interface AvaliacaoBimestre {
  bimestre: 1 | 2 | 3 | 4;
  ano: number;
  // Leitura usa a escala de psicogênese (convertida internamente para 1-4)
  leituraNivel: NivelPsicogenese;
  leitura: NivelCompetencia;
  escrita: NivelCompetencia;
  logicaMatematica: NivelCompetencia;
  oralidade: NivelCompetencia;
  observacao?: string;
}

export interface PedagogicoAluno {
  alunoId: string;
  avaliacoes: AvaliacaoBimestre[];
}

// ----- Financeiro -----
export type StatusMensalidade =
  | "Paga"
  | "A Vencer"
  | "Vence Hoje"
  | "Atrasada"
  | "Renegociada";

export interface Mensalidade {
  id: string;
  alunoId: string;
  alunoNome: string;
  turmaNome: string;
  competencia: string; // ex: "2026-06"
  vencimento: string;
  valor: number;
  valorPago?: number;
  dataPagamento?: string;
  status: StatusMensalidade;
  diasAtraso: number;
  formaPagamento?: "Pix" | "Boleto" | "Cartão" | "Dinheiro";
}

export interface FaturamentoMensal {
  mes: string; // "Jan", "Fev"...
  ano: number;
  faturado: number;
  recebido: number;
  inadimplencia: number;
}

// ----- WhatsApp -----
export interface GrupoWhatsApp {
  id: string;
  turmaId: string;
  turmaNome: string;
  totalMembros: number;
  ativo: boolean;
  ultimaMensagem: string;
  dataUltimaMensagem: string;
}

export interface MensagemWhatsApp {
  id: string;
  grupoId?: string;
  destinatario: string;
  tipo: "Aviso" | "Cobrança" | "Comunicado" | "Evento";
  assunto: string;
  preview: string;
  enviadaEm: string;
  status: "Entregue" | "Lida" | "Pendente";
}

// ----- Kanban -----
export interface KanbanColuna {
  id: string;
  nome: string;
  cor: string;
}

export interface KanbanCard {
  id: string;
  colunaId: string;
  turmaId: string;
  titulo: string;
  descricao?: string;
  tipo: "Atividade" | "Evento" | "Pendência" | "Avaliação";
  prazo?: string;
  responsavel?: string;
  cor?: string;
}

// ----- Estoque -----
export type CategoriaEstoque = "Consumo" | "Venda";
export type SubcategoriaConsumo = "Alimentos" | "Limpeza" | "Material Pedagógico";
export type SubcategoriaVenda = "Uniforme" | "Festa" | "Material Escolar";

export interface ItemEstoque {
  id: string;
  nome: string;
  categoria: CategoriaEstoque;
  subcategoria: SubcategoriaConsumo | SubcategoriaVenda;
  quantidade: number;
  unidade: string; // "un", "kg", "L", "P", "M", "G"
  pontoReposicao: number;
  custoUnitario: number;
  precoVenda?: number; // só para Venda
  fornecedor?: string;
  validade?: string; // só para Consumo
  tamanho?: string; // para uniformes
}

// ----- Vendas -----
export type TipoVenda = "Uniforme" | "Alimentação" | "Evento/Festa" | "Material";

export interface Venda {
  id: string;
  data: string;
  itemNome: string;
  tipo: TipoVenda;
  quantidade: number;
  precoUnitario: number;
  total: number;
  cliente: string; // nome do responsável
  alunoId?: string;
  formaPagamento: "Pix" | "Cartão" | "Dinheiro" | "Boleto";
  notaFiscal?: string;
}

// ----- Nota Fiscal -----
export type StatusNF = "Emitida" | "Cancelada" | "Pendente" | "Rejeitada";

export interface NotaFiscal {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  cpfCnpj: string;
  valor: number;
  servico: string;
  status: StatusNF;
  vendaId?: string;
}

// ----- Alertas (Cockpit) -----
export type TipoAlerta =
  | "inadimplencia"
  | "estagnacao"
  | "estoque"
  | "validade"
  | "evasao"
  | "matricula";

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  severidade: StatusIndicador;
  titulo: string;
  descricao: string;
  link: string;
  data: string;
}
