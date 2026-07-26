-- =====================================================
-- SCHEMA SEMENTE v2 — Reset completo + tabelas novas
-- =====================================================
-- Substitui o schema anterior. Como as tabelas atuais
-- estão vazias (deploy novo), é seguro fazer DROP + CREATE.
-- =====================================================

-- ============= 1. DROP TUDO =============
DROP TABLE IF EXISTS
  responsaveis, mural_posts, eventos, avaliacoes, estoque, vendas,
  despesas, mensalidades, alunos, turmas, funcionarios, escolas,
  frequencia, notas_fiscais, kanban_cards, biblioteca_livros,
  biblioteca_emprestimos, bercario_registros, bercario_bebes,
  cardapio_semana, reservas, transporte_rotas, patrimonio,
  crm_leads, lgpd_logs
CASCADE;

-- ============= 2. TABELAS BASE =============

CREATE TABLE escolas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  logo_texto TEXT DEFAULT 'EM',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE turmas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  turno TEXT NOT NULL,
  professor_id TEXT,
  professor_nome TEXT,
  total_alunos INT DEFAULT 0,
  capacidade INT DEFAULT 25,
  cor TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alunos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf TEXT,
  rg TEXT,
  turma_id TEXT NOT NULL,
  bilingue BOOLEAN DEFAULT FALSE,
  matricula TEXT,
  data_matricula DATE,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  foto TEXT,
  responsaveis_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mensalidades (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  aluno_nome TEXT,
  turma_nome TEXT,
  competencia TEXT NOT NULL,
  vencimento DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2),
  data_pagamento DATE,
  status TEXT DEFAULT 'A Vencer',
  dias_atraso INT DEFAULT 0,
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE despesas (
  id TEXT PRIMARY KEY,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'A Pagar',
  fornecedor TEXT,
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendas (
  id TEXT PRIMARY KEY,
  data DATE NOT NULL,
  item_nome TEXT NOT NULL,
  tipo TEXT,
  quantidade INT DEFAULT 1,
  preco_unitario DECIMAL(10,2),
  total DECIMAL(10,2),
  cliente TEXT,
  aluno_id TEXT,
  forma_pagamento TEXT,
  nota_fiscal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE estoque (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  quantidade DECIMAL(10,2) DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  ponto_reposicao DECIMAL(10,2),
  custo_unitario DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  fornecedor TEXT,
  validade DATE,
  tamanho TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE avaliacoes (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  bimestre INT NOT NULL CHECK (bimestre BETWEEN 1 AND 4),
  ano INT NOT NULL,
  leitura_nivel TEXT,
  leitura INT CHECK (leitura BETWEEN 1 AND 4),
  escrita INT CHECK (escrita BETWEEN 1 AND 4),
  logica_matematica INT CHECK (logica_matematica BETWEEN 1 AND 4),
  oralidade INT CHECK (oralidade BETWEEN 1 AND 4),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aluno_id, bimestre, ano)
);

CREATE TABLE eventos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  tipo TEXT,
  local TEXT,
  responsavel TEXT,
  descricao TEXT,
  turmas_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE funcionarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  admissao DATE,
  salario_bruto DECIMAL(10,2),
  vinculo TEXT DEFAULT 'CLT',
  status TEXT DEFAULT 'Ativo',
  turmas_atuacao_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mural_posts (
  id TEXT PRIMARY KEY,
  autor TEXT NOT NULL,
  cargo TEXT,
  tipo TEXT,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  data TEXT,
  fixado BOOLEAN DEFAULT FALSE,
  likes INT DEFAULT 0,
  comentarios INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= 3. TABELAS NOVAS (módulos sem backend) =============

CREATE TABLE frequencia (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  data DATE NOT NULL,
  presente BOOLEAN DEFAULT TRUE,
  justificativa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notas_fiscais (
  id TEXT PRIMARY KEY,
  numero TEXT,
  data DATE NOT NULL,
  cliente TEXT NOT NULL,
  cpf_cnpj TEXT,
  valor DECIMAL(10,2) NOT NULL,
  servico TEXT,
  status TEXT DEFAULT 'Pendente',
  venda_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kanban_cards (
  id TEXT PRIMARY KEY,
  coluna_id TEXT NOT NULL,
  turma_id TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  prazo DATE,
  responsavel TEXT,
  cor TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE biblioteca_livros (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  autor TEXT,
  isbn TEXT,
  categoria TEXT,
  faixa_etaria TEXT,
  exemplares INT DEFAULT 1,
  disponiveis INT DEFAULT 1,
  emprestados INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE biblioteca_emprestimos (
  id TEXT PRIMARY KEY,
  livro_id TEXT NOT NULL,
  aluno_nome TEXT NOT NULL,
  turma TEXT,
  data_emprestimo DATE NOT NULL,
  data_devolucao_prevista DATE,
  status TEXT DEFAULT 'Em andamento',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bercario_bebes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  idade_meses INT,
  responsavel TEXT,
  professora TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bercario_registros (
  id TEXT PRIMARY KEY,
  bebe_id TEXT NOT NULL,
  data DATE NOT NULL,
  hora TIME,
  tipo TEXT NOT NULL,
  detalhes TEXT,
  registrado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cardapio_semana (
  id TEXT PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  dia_semana TEXT,
  refeicoes_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reservas (
  id TEXT PRIMARY KEY,
  espaco TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  responsavel TEXT,
  motivo TEXT,
  status TEXT DEFAULT 'Confirmada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transporte_rotas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  motorista TEXT,
  monitora TEXT,
  veiculo TEXT,
  placa TEXT,
  capacidade INT DEFAULT 0,
  alunos_atuais INT DEFAULT 0,
  bairros_json JSONB,
  horario_saida TEXT,
  horario_retorno TEXT,
  alunos_ids_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patrimonio (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  categoria TEXT,
  local TEXT,
  valor DECIMAL(10,2),
  data_compra DATE,
  estado TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crm_leads (
  id TEXT PRIMARY KEY,
  nome_responsavel TEXT NOT NULL,
  nome_crianca TEXT,
  idade_crianca INT,
  serie_interesse TEXT,
  telefone TEXT,
  email TEXT,
  origem TEXT,
  estagio TEXT DEFAULT 'Lead',
  data_primeiro_contato DATE,
  proxima_acao TEXT,
  proxima_data TEXT,
  responsavel_comercial TEXT,
  valor_potencial DECIMAL(10,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lgpd_logs (
  id TEXT PRIMARY KEY,
  usuario TEXT,
  acao TEXT NOT NULL,
  entidade TEXT,
  registro_id TEXT,
  detalhes JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= 4. RLS aberto pra modo demo =============
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'escolas','turmas','alunos','mensalidades','despesas','vendas',
    'estoque','avaliacoes','eventos','funcionarios','mural_posts',
    'frequencia','notas_fiscais','kanban_cards','biblioteca_livros',
    'biblioteca_emprestimos','bercario_bebes','bercario_registros',
    'cardapio_semana','reservas','transporte_rotas','patrimonio',
    'crm_leads','lgpd_logs'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_all" ON %I;', t);
    EXECUTE format('CREATE POLICY "anon_all" ON %I FOR ALL TO anon USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all" ON %I;', t);
    EXECUTE format('CREATE POLICY "auth_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- ============= 5. Índices =============
CREATE INDEX idx_alunos_turma ON alunos(turma_id);
CREATE INDEX idx_mensalidades_aluno ON mensalidades(aluno_id);
CREATE INDEX idx_mensalidades_status ON mensalidades(status);
CREATE INDEX idx_avaliacoes_aluno ON avaliacoes(aluno_id);
CREATE INDEX idx_eventos_data ON eventos(data);
CREATE INDEX idx_frequencia_aluno ON frequencia(aluno_id);
CREATE INDEX idx_frequencia_data ON frequencia(data);
CREATE INDEX idx_kanban_coluna ON kanban_cards(coluna_id);
CREATE INDEX idx_emprestimos_status ON biblioteca_emprestimos(status);
CREATE INDEX idx_bercario_data ON bercario_registros(data, bebe_id);
CREATE INDEX idx_reservas_data ON reservas(data);
CREATE INDEX idx_crm_estagio ON crm_leads(estagio);

-- Pronto. 24 tabelas, RLS aberto pra modo demo.
