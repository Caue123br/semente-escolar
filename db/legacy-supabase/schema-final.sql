-- =====================================================
-- SCHEMA FINAL CONSOLIDADO — Escola Modelo
-- Rode esse SQL UMA VEZ no SQL Editor do Supabase.
-- Tudo é idempotente (pode rodar de novo sem quebrar).
-- =====================================================

-- ============= 1. AJUSTES NA TABELA ESCOLAS =============
-- Garante coluna pra logo (caso não tenha rodado)
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============= 2. ATENDIMENTO (CONVERSAS + MENSAGENS) =============

CREATE TABLE IF NOT EXISTS conversas (
  id TEXT PRIMARY KEY,
  responsavel_nome TEXT NOT NULL,
  responsavel_telefone TEXT NOT NULL,
  responsavel_email TEXT,
  aluno_id TEXT,
  aluno_nome TEXT,
  atendente_id TEXT,
  atendente_nome TEXT,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'resolvida', 'arquivada')),
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  tags JSONB DEFAULT '[]'::jsonb,
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMPTZ,
  ultima_mensagem_direcao TEXT CHECK (ultima_mensagem_direcao IN ('entrada', 'saida') OR ultima_mensagem_direcao IS NULL),
  nao_lidas_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversas_atendente ON conversas(atendente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_status ON conversas(status);
CREATE INDEX IF NOT EXISTS idx_conversas_telefone ON conversas(responsavel_telefone);
CREATE INDEX IF NOT EXISTS idx_conversas_ultima_msg ON conversas(ultima_mensagem_em DESC);

CREATE TABLE IF NOT EXISTS mensagens (
  id TEXT PRIMARY KEY,
  conversa_id TEXT NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  texto TEXT NOT NULL,
  atendente_id TEXT,
  atendente_nome TEXT,
  status TEXT DEFAULT 'enviada' CHECK (status IN ('rascunho', 'enviada', 'entregue', 'lida', 'falha')),
  midia_url TEXT,
  midia_tipo TEXT,
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens(conversa_id, created_at DESC);

-- ============= 3. RLS pras tabelas novas (modo demo aberto) =============
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON conversas;
CREATE POLICY "anon_all" ON conversas FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON conversas;
CREATE POLICY "auth_all" ON conversas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all" ON mensagens;
CREATE POLICY "anon_all" ON mensagens FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON mensagens;
CREATE POLICY "auth_all" ON mensagens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============= 4. Verificação =============
SELECT
  'conversas' AS tabela,
  (SELECT COUNT(*) FROM conversas) AS total_registros
UNION ALL
SELECT 'mensagens', (SELECT COUNT(*) FROM mensagens)
UNION ALL
SELECT 'logo_url', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'escolas' AND column_name = 'logo_url');

-- ============= PRONTO! =============
-- Se viu "Success. No rows returned" ou uma tabela de verificação, deu certo.
-- Conversas: 0, Mensagens: 0, logo_url: 1 → tudo OK!
