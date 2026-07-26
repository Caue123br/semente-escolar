import type {
  Aluno,
  Venda,
  ItemEstoque,
  CategoriaEstoque,
  SubcategoriaConsumo,
  SubcategoriaVenda,
  TipoVenda,
  Mensalidade,
  Turma,
  SerieEnum,
  Turno,
  KanbanCard,
  NotaFiscal,
  StatusNF,
} from "@/lib/types";
import type { EventoCalendario, TipoEvento } from "@/lib/mock-data/calendario";
import type { MuralPost } from "@/lib/data/store";
import type { Despesa } from "@/lib/mock-data/despesas";
import type { Funcionario, CargoFuncionario } from "@/lib/mock-data/rh";
import type { Livro, Emprestimo } from "@/lib/mock-data/biblioteca";
import type { BebeBercario, RegistroBercario } from "@/lib/mock-data/bercario";
import type { DiaCardapio } from "@/lib/mock-data/cardapio";
import type { RotaTransporte } from "@/lib/mock-data/transporte";
import type { Lead, EstagioFunil } from "@/lib/mock-data/crm";

type Row = Record<string, unknown>;

const str = (v: unknown, def = ""): string => (v == null ? def : String(v));
const numb = (v: unknown, def = 0): number => (v == null ? def : Number(v));
const bool = (v: unknown): boolean => v === true || v === 1 || v === "true";

export function rowToAluno(r: Row): Aluno {
  return {
    id: str(r.id),
    nome: str(r.nome),
    dataNascimento: str(r.data_nascimento),
    cpf: str(r.cpf),
    rg: r.rg ? str(r.rg) : undefined,
    turmaId: str(r.turma_id),
    bilingue: bool(r.bilingue),
    matricula: str(r.matricula),
    dataMatricula: str(r.data_matricula),
    status: (r.status as Aluno["status"]) ?? "Ativo",
    observacoes: r.observacoes ? str(r.observacoes) : undefined,
    foto: r.foto ? str(r.foto) : undefined,
    responsaveis: Array.isArray(r.responsaveis_json) ? r.responsaveis_json as Aluno["responsaveis"] : [],
    // Campos da ficha completa
    ra: r.ra ? str(r.ra) : undefined,
    raca: r.raca ? str(r.raca) : undefined,
    sexo: r.sexo ? (r.sexo as Aluno["sexo"]) : undefined,
    naturalDe: r.natural_de ? str(r.natural_de) : undefined,
    estado: r.estado ? str(r.estado) : undefined,
    cep: r.cep ? str(r.cep) : undefined,
    endereco: r.endereco ? str(r.endereco) : undefined,
    bairro: r.bairro ? str(r.bairro) : undefined,
    telefoneAluno: r.telefone_aluno ? str(r.telefone_aluno) : undefined,
    religiao: r.religiao ? str(r.religiao) : undefined,
    escolaAnteriorNome: r.escola_anterior_nome ? str(r.escola_anterior_nome) : undefined,
    escolaAnteriorTempo: r.escola_anterior_tempo ? str(r.escola_anterior_tempo) : undefined,
    pessoasAutorizadas: Array.isArray(r.pessoas_autorizadas_json) ? r.pessoas_autorizadas_json as Aluno["pessoasAutorizadas"] : undefined,
    fichaSaude: r.ficha_saude_json && typeof r.ficha_saude_json === "object" ? r.ficha_saude_json as Aluno["fichaSaude"] : undefined,
  };
}

export function rowToEvento(r: Row): EventoCalendario {
  return {
    id: str(r.id),
    titulo: str(r.titulo),
    data: str(r.data),
    horaInicio: r.hora_inicio ? str(r.hora_inicio) : undefined,
    horaFim: r.hora_fim ? str(r.hora_fim) : undefined,
    tipo: (r.tipo as TipoEvento) ?? "Outros",
    local: r.local ? str(r.local) : undefined,
    responsavel: r.responsavel ? str(r.responsavel) : undefined,
    descricao: r.descricao ? str(r.descricao) : undefined,
    turmas: Array.isArray(r.turmas_json) ? (r.turmas_json as string[]) : undefined,
  };
}

export function rowToMuralPost(r: Row): MuralPost {
  return {
    id: str(r.id),
    autor: str(r.autor),
    cargo: str(r.cargo),
    tipo: (r.tipo as MuralPost["tipo"]) ?? "Avisos",
    titulo: str(r.titulo),
    conteudo: str(r.conteudo),
    data: str(r.data),
    likes: numb(r.likes),
    comentarios: numb(r.comentarios),
    fixado: bool(r.fixado),
  };
}

export function rowToVenda(r: Row): Venda {
  return {
    id: str(r.id),
    data: str(r.data),
    itemNome: str(r.item_nome),
    tipo: (r.tipo as TipoVenda) ?? "Material",
    quantidade: numb(r.quantidade, 1),
    precoUnitario: numb(r.preco_unitario),
    total: numb(r.total),
    cliente: str(r.cliente),
    alunoId: r.aluno_id ? str(r.aluno_id) : undefined,
    formaPagamento: (r.forma_pagamento as Venda["formaPagamento"]) ?? "Pix",
    notaFiscal: r.nota_fiscal ? str(r.nota_fiscal) : undefined,
  };
}

export function rowToDespesa(r: Row): Despesa {
  return {
    id: str(r.id),
    data: str(r.data),
    descricao: str(r.descricao),
    categoria: (r.categoria as Despesa["categoria"]) ?? "Outros",
    valor: numb(r.valor),
    status: (r.status as Despesa["status"]) ?? "A Pagar",
    fornecedor: str(r.fornecedor),
    formaPagamento: r.forma_pagamento ? (r.forma_pagamento as Despesa["formaPagamento"]) : undefined,
  };
}

export function rowToFuncionario(r: Row): Funcionario {
  return {
    id: str(r.id),
    nome: str(r.nome),
    cargo: r.cargo as CargoFuncionario,
    cpf: str(r.cpf),
    email: str(r.email),
    telefone: str(r.telefone),
    admissao: str(r.admissao),
    salarioBruto: numb(r.salario_bruto),
    vinculo: (r.vinculo as Funcionario["vinculo"]) ?? "CLT",
    status: (r.status as Funcionario["status"]) ?? "Ativo",
    turmasAtuacao: Array.isArray(r.turmas_atuacao_json) ? (r.turmas_atuacao_json as string[]) : undefined,
  };
}

export function rowToItemEstoque(r: Row): ItemEstoque {
  return {
    id: str(r.id),
    nome: str(r.nome),
    categoria: r.categoria as CategoriaEstoque,
    subcategoria: r.subcategoria as SubcategoriaConsumo | SubcategoriaVenda,
    quantidade: numb(r.quantidade),
    unidade: str(r.unidade, "un"),
    pontoReposicao: numb(r.ponto_reposicao),
    custoUnitario: numb(r.custo_unitario),
    precoVenda: r.preco_venda != null ? numb(r.preco_venda) : undefined,
    fornecedor: r.fornecedor ? str(r.fornecedor) : undefined,
    validade: r.validade ? str(r.validade) : undefined,
    tamanho: r.tamanho ? str(r.tamanho) : undefined,
    codigoBarras: r.codigo_barras ? str(r.codigo_barras) : undefined,
  };
}

export function rowToTurma(r: Row): Turma {
  return {
    id: str(r.id),
    nome: str(r.nome),
    serie: r.serie as SerieEnum,
    turno: r.turno as Turno,
    professorId: str(r.professor_usuario_id ?? r.professor_id),
    professorNome: str(r.professor_nome),
    totalAlunos: numb(r.total_alunos),
    capacidade: numb(r.capacidade, 25),
    cor: str(r.cor, "#3b82f6"),
  };
}

export function rowToMensalidade(r: Row): Mensalidade {
  return {
    id: str(r.id),
    alunoId: str(r.aluno_id),
    alunoNome: str(r.aluno_nome),
    turmaNome: str(r.turma_nome),
    competencia: str(r.competencia),
    vencimento: str(r.vencimento),
    valor: numb(r.valor),
    valorPago: r.valor_pago != null ? numb(r.valor_pago) : undefined,
    dataPagamento: r.data_pagamento ? str(r.data_pagamento) : undefined,
    status: (r.status as Mensalidade["status"]) ?? "A Vencer",
    diasAtraso: numb(r.dias_atraso),
    formaPagamento: r.forma_pagamento ? (r.forma_pagamento as Mensalidade["formaPagamento"]) : undefined,
  };
}

export function rowToKanban(r: Row): KanbanCard {
  return {
    id: str(r.id),
    colunaId: str(r.coluna_id),
    turmaId: str(r.turma_id),
    titulo: str(r.titulo),
    descricao: r.descricao ? str(r.descricao) : undefined,
    tipo: (r.tipo as KanbanCard["tipo"]) ?? "Atividade",
    prazo: r.prazo ? str(r.prazo) : undefined,
    responsavel: r.responsavel ? str(r.responsavel) : undefined,
    cor: r.cor ? str(r.cor) : undefined,
  };
}

export function rowToLivro(r: Row): Livro {
  return {
    id: str(r.id),
    titulo: str(r.titulo),
    autor: str(r.autor),
    isbn: str(r.isbn),
    categoria: r.categoria as Livro["categoria"],
    faixaEtaria: str(r.faixa_etaria),
    exemplares: numb(r.exemplares, 1),
    disponiveis: numb(r.disponiveis),
    emprestados: numb(r.emprestados),
  };
}

export function rowToEmprestimo(r: Row): Emprestimo {
  return {
    id: str(r.id),
    livroId: str(r.livro_id),
    alunoNome: str(r.aluno_nome),
    turma: str(r.turma),
    dataEmprestimo: str(r.data_emprestimo),
    dataDevolucaoPrevista: str(r.data_devolucao_prevista),
    status: (r.status as Emprestimo["status"]) ?? "Em andamento",
  };
}

export function rowToBebe(r: Row): BebeBercario {
  return {
    id: str(r.id),
    nome: str(r.nome),
    idadeMeses: numb(r.idade_meses),
    responsavel: str(r.responsavel),
    professora: str(r.professora),
  };
}

export function rowToRegistroBercario(r: Row): RegistroBercario {
  return {
    id: str(r.id),
    bebeId: str(r.bebe_id),
    data: str(r.data),
    hora: str(r.hora),
    tipo: (r.tipo as RegistroBercario["tipo"]) ?? "Observação",
    detalhes: str(r.detalhes),
    registradoPor: str(r.registrado_por),
  };
}

export function rowToCardapioDia(r: Row): DiaCardapio {
  const refeicoes = Array.isArray(r.refeicoes_json) ? (r.refeicoes_json as DiaCardapio["refeicoes"]) : [];
  return {
    data: str(r.data),
    diaSemana: str(r.dia_semana),
    refeicoes,
  };
}

export function rowToReserva(r: Row): {
  id: string;
  espaco: string;
  data: string;
  horaInicio?: string;
  horaFim?: string;
  responsavel?: string;
  motivo?: string;
  status: string;
} {
  return {
    id: str(r.id),
    espaco: str(r.espaco),
    data: str(r.data),
    horaInicio: r.hora_inicio ? str(r.hora_inicio) : undefined,
    horaFim: r.hora_fim ? str(r.hora_fim) : undefined,
    responsavel: r.responsavel ? str(r.responsavel) : undefined,
    motivo: r.motivo ? str(r.motivo) : undefined,
    status: str(r.status, "Confirmada"),
  };
}

export function rowToRotaTransporte(r: Row): RotaTransporte {
  return {
    id: str(r.id),
    nome: str(r.nome),
    motorista: str(r.motorista),
    monitora: str(r.monitora),
    veiculo: str(r.veiculo),
    placa: str(r.placa),
    capacidade: numb(r.capacidade),
    alunosAtuais: numb(r.alunos_atuais),
    alunosIds: Array.isArray(r.alunos_ids_json) ? (r.alunos_ids_json as string[]) : [],
    bairros: Array.isArray(r.bairros_json) ? (r.bairros_json as string[]) : [],
    horarioSaida: str(r.horario_saida),
    horarioRetorno: str(r.horario_retorno),
  };
}

export function rowToPatrimonio(r: Row): {
  id: string;
  item: string;
  categoria: string;
  local: string;
  valor: number;
  dataCompra: string;
  estado: string;
  responsavel: string;
} {
  return {
    id: str(r.id),
    item: str(r.item),
    categoria: str(r.categoria),
    local: str(r.local),
    valor: numb(r.valor),
    dataCompra: str(r.data_compra),
    estado: str(r.estado),
    responsavel: str(r.responsavel),
  };
}

export function rowToLead(r: Row): Lead {
  return {
    id: str(r.id),
    nomeResponsavel: str(r.nome_responsavel),
    nomeCrianca: str(r.nome_crianca),
    idadeCrianca: numb(r.idade_crianca),
    serieInteresse: str(r.serie_interesse),
    telefone: str(r.telefone),
    email: str(r.email),
    origem: r.origem as Lead["origem"],
    estagio: r.estagio as EstagioFunil,
    dataPrimeiroContato: str(r.data_primeiro_contato),
    proximaAcao: str(r.proxima_acao),
    proximaData: str(r.proxima_data),
    responsavelComercial: str(r.responsavel_comercial),
    valorPotencial: numb(r.valor_potencial),
    observacoes: r.observacoes ? str(r.observacoes) : undefined,
  };
}

export function rowToNotaFiscal(r: Row): NotaFiscal {
  return {
    id: str(r.id),
    numero: str(r.numero),
    data: str(r.data),
    cliente: str(r.cliente),
    cpfCnpj: str(r.cpf_cnpj),
    valor: numb(r.valor),
    servico: str(r.servico),
    status: (r.status as StatusNF) ?? "Pendente",
    vendaId: r.venda_id ? str(r.venda_id) : undefined,
  };
}

export function rowToFrequencia(r: Row): {
  id: string;
  alunoId: string;
  data: string;
  presente: boolean;
  justificativa?: string;
} {
  return {
    id: str(r.id),
    alunoId: str(r.aluno_id),
    data: str(r.data),
    presente: bool(r.presente),
    justificativa: r.justificativa ? str(r.justificativa) : undefined,
  };
}
