import type {
  Aluno,
  Venda,
  ItemEstoque,
  CategoriaEstoque,
  SubcategoriaConsumo,
  SubcategoriaVenda,
  TipoVenda,
} from "@/lib/types";
import type { EventoCalendario, TipoEvento } from "@/lib/mock-data/calendario";
import type { MuralPost } from "@/lib/data/store";
import type { Despesa } from "@/lib/mock-data/despesas";
import type { Funcionario, CargoFuncionario } from "@/lib/mock-data/rh";

// Linhas vindas do SQLite têm formato Record<string, any>
type Row = Record<string, unknown>;

export function rowToAluno(r: Row): Aluno {
  return {
    id: String(r.id),
    nome: String(r.nome),
    dataNascimento: String(r.data_nascimento),
    cpf: r.cpf ? String(r.cpf) : "",
    rg: r.rg ? String(r.rg) : undefined,
    turmaId: String(r.turma_id),
    bilingue: Number(r.bilingue) === 1,
    matricula: String(r.matricula ?? ""),
    dataMatricula: String(r.data_matricula ?? ""),
    status: (r.status as Aluno["status"]) ?? "Ativo",
    observacoes: r.observacoes ? String(r.observacoes) : undefined,
    foto: r.foto ? String(r.foto) : undefined,
    responsaveis: r.responsaveis_json
      ? JSON.parse(String(r.responsaveis_json))
      : [],
  };
}

export function rowToEvento(r: Row): EventoCalendario {
  return {
    id: String(r.id),
    titulo: String(r.titulo),
    data: String(r.data),
    horaInicio: r.hora_inicio ? String(r.hora_inicio) : undefined,
    horaFim: r.hora_fim ? String(r.hora_fim) : undefined,
    tipo: (r.tipo as TipoEvento) ?? "Outros",
    local: r.local ? String(r.local) : undefined,
    responsavel: r.responsavel ? String(r.responsavel) : undefined,
    descricao: r.descricao ? String(r.descricao) : undefined,
    turmas: r.turmas_json ? JSON.parse(String(r.turmas_json)) : undefined,
  };
}

export function rowToMuralPost(r: Row): MuralPost {
  return {
    id: String(r.id),
    autor: String(r.autor),
    cargo: r.cargo ? String(r.cargo) : "",
    tipo: (r.tipo as MuralPost["tipo"]) ?? "Avisos",
    titulo: String(r.titulo),
    conteudo: String(r.conteudo),
    data: r.data ? String(r.data) : "",
    likes: Number(r.likes ?? 0),
    comentarios: Number(r.comentarios ?? 0),
    fixado: Number(r.fixado) === 1,
  };
}

export function rowToVenda(r: Row): Venda {
  return {
    id: String(r.id),
    data: String(r.data),
    itemNome: String(r.item_nome),
    tipo: (r.tipo as TipoVenda) ?? "Material",
    quantidade: Number(r.quantidade ?? 1),
    precoUnitario: Number(r.preco_unitario ?? 0),
    total: Number(r.total ?? 0),
    cliente: String(r.cliente ?? ""),
    alunoId: r.aluno_id ? String(r.aluno_id) : undefined,
    formaPagamento: (r.forma_pagamento as Venda["formaPagamento"]) ?? "Pix",
    notaFiscal: r.nota_fiscal ? String(r.nota_fiscal) : undefined,
  };
}

export function rowToDespesa(r: Row): Despesa {
  return {
    id: String(r.id),
    data: String(r.data),
    descricao: String(r.descricao),
    categoria: (r.categoria as Despesa["categoria"]) ?? "Outros",
    valor: Number(r.valor ?? 0),
    status: (r.status as Despesa["status"]) ?? "A Pagar",
    fornecedor: String(r.fornecedor ?? ""),
    formaPagamento: r.forma_pagamento
      ? (r.forma_pagamento as Despesa["formaPagamento"])
      : undefined,
  };
}

export function rowToFuncionario(r: Row): Funcionario {
  return {
    id: String(r.id),
    nome: String(r.nome),
    cargo: r.cargo as CargoFuncionario,
    cpf: String(r.cpf ?? ""),
    email: String(r.email ?? ""),
    telefone: String(r.telefone ?? ""),
    admissao: String(r.admissao ?? ""),
    salarioBruto: Number(r.salario_bruto ?? 0),
    vinculo: (r.vinculo as Funcionario["vinculo"]) ?? "CLT",
    status: (r.status as Funcionario["status"]) ?? "Ativo",
    turmasAtuacao: r.turmas_atuacao_json
      ? JSON.parse(String(r.turmas_atuacao_json))
      : undefined,
  };
}

export function rowToItemEstoque(r: Row): ItemEstoque {
  return {
    id: String(r.id),
    nome: String(r.nome),
    categoria: r.categoria as CategoriaEstoque,
    subcategoria: r.subcategoria as SubcategoriaConsumo | SubcategoriaVenda,
    quantidade: Number(r.quantidade ?? 0),
    unidade: String(r.unidade ?? "un"),
    pontoReposicao: Number(r.ponto_reposicao ?? 0),
    custoUnitario: Number(r.custo_unitario ?? 0),
    precoVenda: r.preco_venda != null ? Number(r.preco_venda) : undefined,
    fornecedor: r.fornecedor ? String(r.fornecedor) : undefined,
    validade: r.validade ? String(r.validade) : undefined,
    tamanho: r.tamanho ? String(r.tamanho) : undefined,
  };
}
