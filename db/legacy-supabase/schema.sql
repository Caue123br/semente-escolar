-- =====================================================
-- SCHEMA SEMENTE — Sistema de Gestão Escolar
-- =====================================================
-- Cole este arquivo inteiro no SQL Editor do Supabase
-- (Project → SQL Editor → New query → cola tudo → Run)
-- =====================================================

-- Tabela: escolas (1 por tenant)
CREATE TABLE IF NOT EXISTS escolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  logo_texto TEXT DEFAULT 'SF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turmas
CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  turno TEXT NOT NULL,
  professor_nome TEXT,
  capacidade INT DEFAULT 25,
  cor TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alunos
CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf TEXT,
  rg TEXT,
  matricula TEXT UNIQUE,
  data_matricula DATE DEFAULT NOW(),
  bilingue BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Trancado')),
  observacoes TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responsáveis (cada aluno pode ter vários)
CREATE TABLE IF NOT EXISTS responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parentesco TEXT,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensalidades
CREATE TABLE IF NOT EXISTS mensalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  vencimento DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2),
  data_pagamento DATE,
  status TEXT DEFAULT 'A Vencer' CHECK (status IN ('Paga', 'A Vencer', 'Vence Hoje', 'Atrasada', 'Renegociada')),
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Despesas
CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'A Pagar',
  fornecedor TEXT,
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  item_nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INT DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  cliente TEXT NOT NULL,
  forma_pagamento TEXT,
  nota_fiscal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estoque
CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
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

-- Avaliações pedagógicas
CREATE TABLE IF NOT EXISTS avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
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

-- Eventos do calendário
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  tipo TEXT,
  local TEXT,
  responsavel TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  admissao DATE,
  salario_bruto DECIMAL(10,2),
  vinculo TEXT DEFAULT 'CLT',
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts do mural
CREATE TABLE IF NOT EXISTS mural_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  cargo TEXT,
  tipo TEXT,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  fixado BOOLEAN DEFAULT FALSE,
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= Row Level Security =============
ALTER TABLE escolas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensalidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque       ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mural_posts   ENABLE ROW LEVEL SECURITY;

-- Policy permissiva para usuários autenticados (ajuste em produção)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'escolas','turmas','alunos','responsaveis','mensalidades',
    'despesas','vendas','estoque','avaliacoes','eventos',
    'funcionarios','mural_posts'
  ])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "auth_all" ON %I;
      CREATE POLICY "auth_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END $$;

-- ============= Índices úteis =============
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_responsaveis_aluno ON responsaveis(aluno_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_aluno ON mensalidades(aluno_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_status ON mensalidades(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aluno ON avaliacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data);

-- Pronto! O sistema agora pode persistir dados de verdade.
