import { createClient, type Client } from "@libsql/client";
import path from "path";

const DB_PATH =
  process.env.SEMENTE_DB_PATH ??
  path.join(process.cwd(), "data", "semente.db");

let _client: Client | null = null;
let _inited = false;

export function getDb(): Client {
  if (_client) return _client;
  _client = createClient({ url: `file:${DB_PATH}` });
  return _client;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS alunos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  turma_id TEXT NOT NULL,
  bilingue INTEGER DEFAULT 0,
  matricula TEXT,
  data_matricula TEXT,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  foto TEXT,
  responsaveis_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  data TEXT NOT NULL,
  hora_inicio TEXT,
  hora_fim TEXT,
  tipo TEXT,
  local TEXT,
  responsavel TEXT,
  descricao TEXT,
  turmas_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mural_posts (
  id TEXT PRIMARY KEY,
  autor TEXT NOT NULL,
  cargo TEXT,
  tipo TEXT,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  data TEXT,
  likes INTEGER DEFAULT 0,
  comentarios INTEGER DEFAULT 0,
  fixado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendas (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  item_nome TEXT NOT NULL,
  tipo TEXT,
  quantidade INTEGER DEFAULT 1,
  preco_unitario REAL,
  total REAL,
  cliente TEXT,
  aluno_id TEXT,
  forma_pagamento TEXT,
  nota_fiscal TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS despesas (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor REAL,
  status TEXT DEFAULT 'A Pagar',
  fornecedor TEXT,
  forma_pagamento TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funcionarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  admissao TEXT,
  salario_bruto REAL,
  vinculo TEXT DEFAULT 'CLT',
  status TEXT DEFAULT 'Ativo',
  turmas_atuacao_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estoque (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  quantidade REAL DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  ponto_reposicao REAL,
  custo_unitario REAL,
  preco_venda REAL,
  fornecedor TEXT,
  validade TEXT,
  tamanho TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export async function initDb() {
  if (_inited) return;
  const fs = await import("fs/promises");
  const dir = path.dirname(DB_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}

  const db = getDb();
  // Executa o schema em statements separados
  for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.execute(stmt);
  }

  // Verifica se está vazio, e se sim, faz seed
  const r = await db.execute("SELECT COUNT(*) as c FROM alunos");
  const count = Number(r.rows[0]?.c ?? 0);
  if (count === 0) {
    await seedDb();
  }

  _inited = true;
}

async function seedDb() {
  const { alunos } = await import("@/lib/mock-data/alunos");
  const { eventos } = await import("@/lib/mock-data/calendario");
  const { vendas } = await import("@/lib/mock-data/vendas");
  const { despesas } = await import("@/lib/mock-data/despesas");
  const { funcionarios } = await import("@/lib/mock-data/rh");
  const { itensEstoque } = await import("@/lib/mock-data/estoque");
  const db = getDb();

  // Alunos
  for (const a of alunos) {
    await db.execute({
      sql: `INSERT INTO alunos (id, nome, data_nascimento, cpf, rg, turma_id, bilingue, matricula, data_matricula, status, observacoes, foto, responsaveis_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        a.id,
        a.nome,
        a.dataNascimento,
        a.cpf ?? null,
        a.rg ?? null,
        a.turmaId,
        a.bilingue ? 1 : 0,
        a.matricula,
        a.dataMatricula,
        a.status,
        a.observacoes ?? null,
        a.foto ?? null,
        JSON.stringify(a.responsaveis),
      ],
    });
  }

  // Eventos
  for (const e of eventos) {
    await db.execute({
      sql: `INSERT INTO eventos (id, titulo, data, hora_inicio, hora_fim, tipo, local, responsavel, descricao, turmas_json) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [
        e.id,
        e.titulo,
        e.data,
        e.horaInicio ?? null,
        e.horaFim ?? null,
        e.tipo,
        e.local ?? null,
        e.responsavel ?? null,
        e.descricao ?? null,
        e.turmas ? JSON.stringify(e.turmas) : null,
      ],
    });
  }

  // Mural posts (seed inicial)
  const muralSeed = [
    { id: "p1", autor: "Renata Andrade", cargo: "Direção", tipo: "Importante", fixado: 1, titulo: "Festa Junina 2026 — Confirmem presença!", conteudo: "Famílias, nossa Festa Junina será dia 22/06 (sábado) das 10h às 16h. Teremos quadrilha das crianças, barracas de comidas típicas e muitas brincadeiras. Confirmem presença pelo WhatsApp.", data: "2026-06-08 14:30", likes: 47, comentarios: 12 },
    { id: "p2", autor: "Cláudio Vasconcelos", cargo: "Coordenação", tipo: "Pedagógico", fixado: 0, titulo: "Encerramento do 2º bimestre — boletins disponíveis em 30/06", conteudo: "Pais e mães, os boletins do 2º bimestre estarão disponíveis no Portal dos Pais a partir do dia 30/06. As reuniões individuais serão agendadas via WhatsApp pelas professoras.", data: "2026-06-07 10:15", likes: 28, comentarios: 5 },
    { id: "p3", autor: "Mariana Costa", cargo: "Profa. Jardim II - A", tipo: "Atividade", fixado: 0, titulo: "Projeto 'Animais da Fazenda' começa semana que vem", conteudo: "Famílias do Jardim II - A, vamos iniciar nosso projeto sobre animais da fazenda. Por favor, enviem fotos das crianças com animais (se tiverem) para o nosso painel coletivo.", data: "2026-06-07 18:45", likes: 19, comentarios: 8 },
  ];
  for (const p of muralSeed) {
    await db.execute({
      sql: `INSERT INTO mural_posts (id, autor, cargo, tipo, titulo, conteudo, data, likes, comentarios, fixado) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [p.id, p.autor, p.cargo, p.tipo, p.titulo, p.conteudo, p.data, p.likes, p.comentarios, p.fixado],
    });
  }

  // Vendas
  for (const v of vendas) {
    await db.execute({
      sql: `INSERT INTO vendas (id, data, item_nome, tipo, quantidade, preco_unitario, total, cliente, aluno_id, forma_pagamento, nota_fiscal) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      args: [v.id, v.data, v.itemNome, v.tipo, v.quantidade, v.precoUnitario, v.total, v.cliente, v.alunoId ?? null, v.formaPagamento, v.notaFiscal ?? null],
    });
  }

  // Despesas
  for (const d of despesas) {
    await db.execute({
      sql: `INSERT INTO despesas (id, data, descricao, categoria, valor, status, fornecedor, forma_pagamento) VALUES (?,?,?,?,?,?,?,?)`,
      args: [d.id, d.data, d.descricao, d.categoria, d.valor, d.status, d.fornecedor, d.formaPagamento ?? null],
    });
  }

  // Funcionários
  for (const f of funcionarios) {
    await db.execute({
      sql: `INSERT INTO funcionarios (id, nome, cargo, cpf, email, telefone, admissao, salario_bruto, vinculo, status, turmas_atuacao_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      args: [f.id, f.nome, f.cargo, f.cpf, f.email, f.telefone, f.admissao, f.salarioBruto, f.vinculo, f.status, f.turmasAtuacao ? JSON.stringify(f.turmasAtuacao) : null],
    });
  }

  // Estoque
  for (const i of itensEstoque) {
    await db.execute({
      sql: `INSERT INTO estoque (id, nome, categoria, subcategoria, quantidade, unidade, ponto_reposicao, custo_unitario, preco_venda, fornecedor, validade, tamanho) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [i.id, i.nome, i.categoria, i.subcategoria, i.quantidade, i.unidade, i.pontoReposicao, i.custoUnitario, i.precoVenda ?? null, i.fornecedor ?? null, i.validade ?? null, i.tamanho ?? null],
    });
  }
}
