import {
  DatabaseClient,
  getDatabase,
  getPostgresPool,
  type DatabaseTable,
} from "./postgres";
import type { PoolClient } from "pg";
import { alunos as alunosSeed } from "@/lib/mock-data/alunos";
import { eventos as eventosSeed } from "@/lib/mock-data/calendario";
import { vendas as vendasSeed } from "@/lib/mock-data/vendas";
import { despesas as despesasSeed } from "@/lib/mock-data/despesas";
import { funcionarios as funcionariosSeed } from "@/lib/mock-data/rh";
import { itensEstoque as estoqueSeed } from "@/lib/mock-data/estoque";
import { turmas as turmasSeed } from "@/lib/mock-data/turmas";
import { mensalidadesJunho as mensalidadesSeed } from "@/lib/mock-data/financeiro";
import { cardsKanban as kanbanSeed } from "@/lib/mock-data/kanban";
import { livros as livrosSeed, emprestimosAtivos as emprestimosSeed } from "@/lib/mock-data/biblioteca";
import { bebesBercario as bebesSeed, registrosBercarioHoje as registrosBercarioSeed } from "@/lib/mock-data/bercario";
import { cardapioSemana as cardapioSeed } from "@/lib/mock-data/cardapio";
import { rotasTransporte as rotasSeed, alunosTransportePorRota } from "@/lib/mock-data/transporte";
import { leads as leadsSeed } from "@/lib/mock-data/crm";
import { notasFiscais as notasSeed } from "@/lib/mock-data/notas-fiscais";

// Dados fictícios automáticos existem apenas em desenvolvimento. Em produção,
// só podem ser carregados pela ação administrativa explícita e allowlisted.
const _seededTables = new Set<string>();

interface SeedOptions {
  explicitAdminAction?: boolean;
  database?: DatabaseClient;
  counts?: Record<string, number>;
}

const DEMO_TABLES = [
  "funcionarios",
  "turmas",
  "alunos",
  "mensalidades",
  "despesas",
  "vendas",
  "estoque",
  "eventos",
  "mural_posts",
  "kanban_cards",
  "biblioteca_livros",
  "biblioteca_emprestimos",
  "bercario_bebes",
  "bercario_registros",
  "cardapio_semana",
  "reservas",
  "transporte_rotas",
  "patrimonio",
  "crm_leads",
  "notas_fiscais",
] as const satisfies readonly DatabaseTable[];

function demoSeedEnabled(options: SeedOptions): boolean {
  if (options.explicitAdminAction) {
    return process.env.ENABLE_ADMIN_DEMO_SEED === "true";
  }
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_SEED === "true";
}

function dataNoMesAtual(value: string | undefined, options: SeedOptions): string | undefined {
  if (!value || !options.explicitAdminAction || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value;
  }
  const now = new Date();
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const month = String(monthIndex + 1).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = String(Math.min(Number(value.slice(8, 10)), lastDay)).padStart(2, "0");
  return `${year}-${month}-${day}${value.slice(10)}`;
}

function competenciaAtual(value: string, options: SeedOptions): string {
  if (!options.explicitAdminAction) return value;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function demoId(value: unknown): unknown {
  if (typeof value !== "string" || !value) return value;
  return value.startsWith("demo-") ? value : `demo-${value}`;
}

function prepararRowsDemo(
  tabela: DatabaseTable,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  const referenciasSimples: Partial<Record<DatabaseTable, string[]>> = {
    alunos: ["turma_id"],
    mensalidades: ["aluno_id"],
    vendas: ["aluno_id"],
    notas_fiscais: ["venda_id"],
    kanban_cards: ["turma_id"],
    biblioteca_emprestimos: ["livro_id"],
    bercario_registros: ["bebe_id"],
  };
  const referenciasArray: Partial<Record<DatabaseTable, string[]>> = {
    funcionarios: ["turmas_atuacao_json"],
    eventos: ["turmas_json"],
    transporte_rotas: ["alunos_ids_json"],
  };

  return rows.map((row) => {
    const prepared: Record<string, unknown> = { ...row, id: demoId(row.id) };
    for (const column of referenciasSimples[tabela] ?? []) {
      if (prepared[column] !== null && prepared[column] !== undefined) {
        prepared[column] = demoId(prepared[column]);
      }
    }
    for (const column of referenciasArray[tabela] ?? []) {
      if (Array.isArray(prepared[column])) {
        prepared[column] = prepared[column].map(demoId);
      }
    }
    return prepared;
  });
}

async function isEmpty(tabela: DatabaseTable, options: SeedOptions): Promise<boolean> {
  const sb = options.database ?? getDatabase();
  const { count, error } = await sb.from(tabela).select("*", { count: "exact", head: true });
  if (error) {
    if (options.explicitAdminAction) throw new Error(`Não foi possível verificar ${tabela}`);
    return false;
  }
  return (count ?? 0) === 0;
}

async function seedSeOuVazio(
  tabela: DatabaseTable,
  rows: Record<string, unknown>[],
  options: SeedOptions = {}
) {
  if (!demoSeedEnabled(options)) return;
  const trackInMemory = !options.explicitAdminAction;
  if (trackInMemory && _seededTables.has(tabela)) return;
  if (rows.length === 0) {
    if (trackInMemory) _seededTables.add(tabela);
    return;
  }
  if (await isEmpty(tabela, options)) {
    const sb = options.database ?? getDatabase();
    const rowsToWrite = options.explicitAdminAction
      ? prepararRowsDemo(tabela, rows)
      : rows;
    const query = options.explicitAdminAction
      ? sb.from(tabela).insert(rowsToWrite)
      : sb.from(tabela).upsert(rowsToWrite, { onConflict: "id" });
    const { error } = await query;
    if (error) {
      if (options.explicitAdminAction) throw new Error(`Não foi possível carregar ${tabela}`);
      console.error(`[seed] ${tabela}:`, error.message);
      return;
    }
    if (options.explicitAdminAction && options.counts) {
      options.counts[tabela] = rowsToWrite.length;
    }
  }
  if (trackInMemory) _seededTables.add(tabela);
}

export async function seedAlunos(options: SeedOptions = {}) {
  // Aluno possui FK obrigatória para turma. Garantir a dependência aqui torna
  // o seed seguro mesmo quando /api/alunos e /api/turmas carregam em paralelo.
  await seedTurmas(options);
  await seedSeOuVazio(
    "alunos",
    alunosSeed.map((a) => ({
      id: a.id,
      nome: a.nome,
      data_nascimento: a.dataNascimento,
      cpf: a.cpf || null,
      rg: a.rg || null,
      turma_id: a.turmaId,
      bilingue: a.bilingue,
      matricula: a.matricula,
      data_matricula: a.dataMatricula,
      status: a.status,
      observacoes: a.observacoes || null,
      foto: a.foto || null,
      responsaveis_json: a.responsaveis,
    })),
    options
  );
}

export async function seedTurmas(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "turmas",
    turmasSeed.map((t) => ({
      id: t.id,
      nome: t.nome,
      serie: t.serie,
      turno: t.turno,
      professor_id: t.professorId,
      professor_nome: t.professorNome,
      total_alunos: t.totalAlunos,
      capacidade: t.capacidade,
      cor: t.cor,
    })),
    options
  );
}

export async function seedEventos(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "eventos",
    eventosSeed.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data: dataNoMesAtual(e.data, options),
      hora_inicio: e.horaInicio || null,
      hora_fim: e.horaFim || null,
      tipo: e.tipo,
      local: e.local || null,
      responsavel: e.responsavel || null,
      descricao: e.descricao || null,
      turmas_json: e.turmas || null,
    })),
    options
  );
}

export async function seedVendas(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "vendas",
    vendasSeed.map((v) => ({
      id: v.id,
      data: dataNoMesAtual(v.data, options),
      item_nome: v.itemNome,
      tipo: v.tipo,
      quantidade: v.quantidade,
      preco_unitario: v.precoUnitario,
      total: v.total,
      cliente: v.cliente,
      aluno_id: v.alunoId || null,
      forma_pagamento: v.formaPagamento,
      nota_fiscal: v.notaFiscal || null,
    })),
    options
  );
}

export async function seedDespesas(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "despesas",
    despesasSeed.map((d) => ({
      id: d.id,
      data: dataNoMesAtual(d.data, options),
      descricao: d.descricao,
      categoria: d.categoria,
      valor: d.valor,
      status: d.status,
      fornecedor: d.fornecedor,
      forma_pagamento: d.formaPagamento || null,
    })),
    options
  );
}

export async function seedFuncionarios(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "funcionarios",
    funcionariosSeed.map((f) => ({
      id: f.id,
      nome: f.nome,
      cargo: f.cargo,
      cpf: f.cpf,
      email: f.email,
      telefone: f.telefone,
      admissao: f.admissao,
      salario_bruto: f.salarioBruto,
      vinculo: f.vinculo,
      status: f.status,
      turmas_atuacao_json: f.turmasAtuacao || null,
    })),
    options
  );
}

export async function seedEstoque(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "estoque",
    estoqueSeed.map((i) => ({
      id: i.id,
      nome: i.nome,
      categoria: i.categoria,
      subcategoria: i.subcategoria,
      quantidade: i.quantidade,
      unidade: i.unidade,
      ponto_reposicao: i.pontoReposicao,
      custo_unitario: i.custoUnitario,
      preco_venda: i.precoVenda ?? null,
      fornecedor: i.fornecedor ?? null,
      validade: dataNoMesAtual(i.validade, options) ?? null,
      tamanho: i.tamanho ?? null,
    })),
    options
  );
}

export async function seedMensalidades(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "mensalidades",
    mensalidadesSeed.map((m) => ({
      id: m.id,
      aluno_id: m.alunoId,
      aluno_nome: m.alunoNome,
      turma_nome: m.turmaNome,
      competencia: competenciaAtual(m.competencia, options),
      vencimento: dataNoMesAtual(m.vencimento, options),
      valor: m.valor,
      valor_pago: m.valorPago ?? null,
      data_pagamento: dataNoMesAtual(m.dataPagamento, options) ?? null,
      status: m.status,
      dias_atraso: m.diasAtraso,
      forma_pagamento: m.formaPagamento ?? null,
    })),
    options
  );
}

export async function seedMuralPosts(options: SeedOptions = {}) {
  const posts = [
    {
      id: "p1", autor: "Renata Andrade", cargo: "Direção", tipo: "Importante",
      titulo: "Festa Junina 2026 — Confirmem presença!",
      conteudo: "Famílias, nossa Festa Junina será dia 22/06 (sábado) das 10h às 16h. Teremos quadrilha das crianças, barracas de comidas típicas e muitas brincadeiras. Confirmem presença pelo WhatsApp.",
      data: "2026-06-08 14:30", fixado: true, likes: 47, comentarios: 12,
    },
    {
      id: "p2", autor: "Cláudio Vasconcelos", cargo: "Coordenação", tipo: "Pedagógico",
      titulo: "Encerramento do 2º bimestre — boletins disponíveis em 30/06",
      conteudo: "Pais e mães, os boletins do 2º bimestre estarão disponíveis no Portal dos Pais a partir do dia 30/06. As reuniões individuais serão agendadas via WhatsApp pelas professoras.",
      data: "2026-06-07 10:15", fixado: false, likes: 28, comentarios: 5,
    },
    {
      id: "p3", autor: "Mariana Costa", cargo: "Profa. Jardim II - A", tipo: "Atividade",
      titulo: "Projeto 'Animais da Fazenda' começa semana que vem",
      conteudo: "Famílias do Jardim II - A, vamos iniciar nosso projeto sobre animais da fazenda. Por favor, enviem fotos das crianças com animais (se tiverem) para o nosso painel coletivo.",
      data: "2026-06-07 18:45", fixado: false, likes: 19, comentarios: 8,
    },
  ];
  await seedSeOuVazio(
    "mural_posts",
    posts.map((post) => ({ ...post, data: dataNoMesAtual(post.data, options) })),
    options
  );
}

export async function seedKanban(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "kanban_cards",
    kanbanSeed.map((c, i) => ({
      id: c.id,
      coluna_id: c.colunaId,
      turma_id: c.turmaId,
      titulo: c.titulo,
      descricao: c.descricao ?? null,
      tipo: c.tipo,
      prazo: dataNoMesAtual(c.prazo, options) ?? null,
      responsavel: c.responsavel ?? null,
      cor: c.cor ?? null,
      ordem: i,
    })),
    options
  );
}

export async function seedBiblioteca(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "biblioteca_livros",
    livrosSeed.map((l) => ({
      id: l.id,
      titulo: l.titulo,
      autor: l.autor,
      isbn: l.isbn,
      categoria: l.categoria,
      faixa_etaria: l.faixaEtaria,
      exemplares: l.exemplares,
      disponiveis: l.disponiveis,
      emprestados: l.emprestados,
    })),
    options
  );
  await seedSeOuVazio(
    "biblioteca_emprestimos",
    emprestimosSeed.map((e) => ({
      id: e.id,
      livro_id: e.livroId,
      aluno_nome: e.alunoNome,
      turma: e.turma,
      data_emprestimo: dataNoMesAtual(e.dataEmprestimo, options),
      data_devolucao_prevista: dataNoMesAtual(e.dataDevolucaoPrevista, options),
      status: e.status,
    })),
    options
  );
}

export async function seedBercario(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "bercario_bebes",
    bebesSeed.map((b) => ({
      id: b.id,
      nome: b.nome,
      idade_meses: b.idadeMeses,
      responsavel: b.responsavel,
      professora: b.professora,
    })),
    options
  );
  await seedSeOuVazio(
    "bercario_registros",
    registrosBercarioSeed.map((r) => ({
      id: r.id,
      bebe_id: r.bebeId,
      data: dataNoMesAtual(r.data, options),
      hora: r.hora,
      tipo: r.tipo,
      detalhes: r.detalhes,
      registrado_por: r.registradoPor,
    })),
    options
  );
}

export async function seedCardapio(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "cardapio_semana",
    cardapioSeed.map((d) => {
      const data = dataNoMesAtual(d.data, options) ?? d.data;
      return {
        id: `card-${data}`,
        data,
        dia_semana: d.diaSemana,
        refeicoes_json: d.refeicoes,
      };
    }),
    options
  );
}

export async function seedReservas(options: SeedOptions = {}) {
  const reservas = [
    { id: "rsv1", espaco: "Quadra Esportiva", data: "2026-06-15", hora_inicio: "14:00", hora_fim: "16:00", responsavel: "Prof. Carlos Educação Física", motivo: "Treino futebol", status: "Confirmada" },
    { id: "rsv2", espaco: "Sala Multimídia", data: "2026-06-16", hora_inicio: "10:00", hora_fim: "11:30", responsavel: "Profa. Mariana", motivo: "Apresentação de projeto", status: "Confirmada" },
    { id: "rsv3", espaco: "Pátio", data: "2026-06-20", hora_inicio: "09:00", hora_fim: "12:00", responsavel: "Coordenação", motivo: "Ensaio Festa Junina", status: "Confirmada" },
    { id: "rsv4", espaco: "Refeitório", data: "2026-06-22", hora_inicio: "10:00", hora_fim: "16:00", responsavel: "Direção", motivo: "Festa Junina", status: "Confirmada" },
  ];
  await seedSeOuVazio(
    "reservas",
    reservas.map((reserva) => ({
      ...reserva,
      data: dataNoMesAtual(reserva.data, options),
    })),
    options
  );
}

export async function seedTransporte(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "transporte_rotas",
    rotasSeed.map((r) => {
      const alunosIds = alunosTransportePorRota[r.id] ?? [];
      return {
        id: r.id,
        nome: r.nome,
        motorista: r.motorista,
        monitora: r.monitora,
        veiculo: r.veiculo,
        placa: r.placa,
        capacidade: r.capacidade,
        alunos_atuais: alunosIds.length,
        bairros_json: r.bairros,
        horario_saida: r.horarioSaida,
        horario_retorno: r.horarioRetorno,
        alunos_ids_json: alunosIds,
      };
    }),
    options
  );
}

export async function seedPatrimonio(options: SeedOptions = {}) {
  const itens = [
    { id: "pt1", item: "Projetor Epson PowerLite", categoria: "Equipamento", local: "Sala Multimídia", valor: 4200, data_compra: "2024-03-15", estado: "Ótimo", responsavel: "TI" },
    { id: "pt2", item: "Mesas escolares (20 un)", categoria: "Mobiliário", local: "Jardim II - A", valor: 6000, data_compra: "2023-08-10", estado: "Bom", responsavel: "Patrimônio" },
    { id: "pt3", item: "Notebook Dell Inspiron", categoria: "Equipamento", local: "Secretaria", valor: 3800, data_compra: "2024-01-20", estado: "Ótimo", responsavel: "Secretaria" },
    { id: "pt4", item: "Brinquedos parque externo", categoria: "Lúdico", local: "Pátio externo", valor: 12500, data_compra: "2022-11-05", estado: "Regular", responsavel: "Manutenção" },
    { id: "pt5", item: "Geladeira Brastemp Frost Free", categoria: "Eletrodoméstico", local: "Cozinha", valor: 3500, data_compra: "2023-05-22", estado: "Bom", responsavel: "Cozinha" },
    { id: "pt6", item: "Ar-condicionado split 12000 BTU (3 un)", categoria: "Climatização", local: "Salas Jardim", valor: 8400, data_compra: "2024-04-10", estado: "Ótimo", responsavel: "Manutenção" },
  ];
  await seedSeOuVazio("patrimonio", itens, options);
}

export async function seedCRM(options: SeedOptions = {}) {
  await seedSeOuVazio(
    "crm_leads",
    leadsSeed.map((l) => ({
      id: l.id,
      nome_responsavel: l.nomeResponsavel,
      nome_crianca: l.nomeCrianca,
      idade_crianca: l.idadeCrianca,
      serie_interesse: l.serieInteresse,
      telefone: l.telefone,
      email: l.email,
      origem: l.origem,
      estagio: l.estagio,
      data_primeiro_contato: dataNoMesAtual(l.dataPrimeiroContato, options),
      proxima_acao: l.proximaAcao,
      proxima_data: dataNoMesAtual(l.proximaData, options),
      responsavel_comercial: l.responsavelComercial,
      valor_potencial: l.valorPotencial,
      observacoes: l.observacoes || null,
    })),
    options
  );
}

export async function seedNotasFiscais(options: SeedOptions = {}) {
  // Notas de venda possuem FK para app.vendas e podem ser a primeira rota
  // solicitada em uma instalação vazia.
  await seedVendas(options);
  await seedSeOuVazio(
    "notas_fiscais",
    notasSeed.map((n) => ({
      id: n.id,
      numero: n.numero,
      data: dataNoMesAtual(n.data, options),
      cliente: n.cliente,
      cpf_cnpj: n.cpfCnpj,
      valor: n.valor,
      servico: n.servico,
      status: n.status,
      venda_id: n.vendaId ?? null,
    })),
    options
  );
}

export async function seedFrequencia() {
  // Frequência começa vazia (vai sendo registrada conforme uso)
  _seededTables.add("frequencia");
}

export async function seedLgpd() {
  // LGPD logs começam vazios
  _seededTables.add("lgpd_logs");
}

const DEMO_MARKER_ID = "demo-seed-inicial-v1";

export interface DemoSeedStatus {
  carregado: boolean;
  podeCarregar: boolean;
  tabelasComDados: string[];
}

export interface DemoSeedActor {
  id: string;
  nome: string;
  email: string;
}

export type DemoSeedResult =
  | { status: "carregado"; competencia: string; counts: Record<string, number> }
  | { status: "ja_carregado"; competencia: string | null }
  | { status: "dados_existentes"; tabelasComDados: string[] };

function currentSchoolId(): string {
  return process.env.SCHOOL_ID ?? "default";
}

async function markerDemo(client: PoolClient): Promise<{ competencia: string | null } | null> {
  const result = await client.query<{ detalhes: { competencia?: unknown } | null }>(
    `SELECT detalhes
       FROM audit.audit_logs
      WHERE escola_id = $1 AND id = $2
      LIMIT 1`,
    [currentSchoolId(), DEMO_MARKER_ID]
  );
  const row = result.rows[0];
  if (!row) return null;
  const competencia = row.detalhes?.competencia;
  return { competencia: typeof competencia === "string" ? competencia : null };
}

async function tabelasComDados(client: PoolClient): Promise<string[]> {
  const checks = DEMO_TABLES.map(
    (table) =>
      `SELECT '${table}'::text AS tabela
         WHERE EXISTS (
           SELECT 1 FROM app."${table}" WHERE escola_id = $1
         )`
  ).join(" UNION ALL ");
  const result = await client.query<{ tabela: string }>(checks, [currentSchoolId()]);
  return result.rows.map((row) => row.tabela);
}

export async function getDemoSeedStatus(): Promise<DemoSeedStatus> {
  const client = await getPostgresPool().connect();
  try {
    const marker = await markerDemo(client);
    const preenchidas = await tabelasComDados(client);
    return {
      carregado: Boolean(marker),
      podeCarregar: !marker && preenchidas.length === 0,
      tabelasComDados: preenchidas,
    };
  } finally {
    client.release();
  }
}

export async function carregarDadosTesteAdministrador(
  actor: DemoSeedActor
): Promise<DemoSeedResult> {
  if (process.env.ENABLE_ADMIN_DEMO_SEED !== "true") {
    throw new Error("Carga administrativa de demonstração desativada");
  }

  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `semente-demo-seed:${currentSchoolId()}:v1`,
    ]);

    const marker = await markerDemo(client);
    if (marker) {
      await client.query("COMMIT");
      return { status: "ja_carregado", competencia: marker.competencia };
    }

    const preenchidas = await tabelasComDados(client);
    if (preenchidas.length > 0) {
      await client.query("COMMIT");
      return { status: "dados_existentes", tabelasComDados: preenchidas };
    }

    const database = new DatabaseClient(client);
    const counts: Record<string, number> = {};
    const options: SeedOptions = {
      explicitAdminAction: true,
      database,
      counts,
    };

    // Ordem explícita para respeitar todas as chaves estrangeiras.
    await seedFuncionarios(options);
    await seedTurmas(options);
    await seedAlunos(options);
    await seedMensalidades(options);
    await seedVendas(options);
    await seedNotasFiscais(options);
    await seedDespesas(options);
    await seedEstoque(options);
    await seedEventos(options);
    await seedMuralPosts(options);
    await seedKanban(options);
    await seedBiblioteca(options);
    await seedBercario(options);
    await seedCardapio(options);
    await seedReservas(options);
    await seedTransporte(options);
    await seedPatrimonio(options);
    await seedCRM(options);

    const competencia = competenciaAtual("2026-06", options);
    const { error: markerError } = await database.from("audit_logs").insert({
      id: DEMO_MARKER_ID,
      usuario_id: actor.id,
      usuario_nome: actor.nome,
      usuario_email: actor.email,
      acao: "criar",
      entidade: "dados_teste",
      registro_id: "v1",
      detalhes: {
        dados_ficticios: true,
        competencia,
        counts,
      },
    });
    if (markerError) throw new Error("Não foi possível registrar a carga de demonstração");

    await client.query("COMMIT");
    return { status: "carregado", competencia, counts };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
