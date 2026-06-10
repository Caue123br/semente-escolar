import type { Aluno } from "@/lib/types";
import type { EventoCalendario, TipoEvento } from "@/lib/mock-data/calendario";
import type { MuralPost } from "@/lib/data/store";

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
