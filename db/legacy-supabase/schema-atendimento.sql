-- =====================================================
-- ATENDIMENTO INTERNO (WhatsApp-style)
-- Conversas com responsáveis + mensagens
-- =====================================================

CREATE TABLE IF NOT EXISTS conversas (
  id TEXT PRIMARY KEY,
  responsavel_nome TEXT NOT NULL,
  responsavel_telefone TEXT NOT NULL,
  responsavel_email TEXT,
  aluno_id TEXT,
  aluno_nome TEXT,
  -- Atendente responsável atual
  atendente_id TEXT,
  atendente_nome TEXT,
  -- Status do atendimento
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'resolvida', 'arquivada')),
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  -- Tags (financeiro, pedagogico, logistica, outros)
  tags JSONB DEFAULT '[]'::jsonb,
  -- Última mensagem (denormalizada pra ordenação rápida)
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMPTZ,
  ultima_mensagem_direcao TEXT CHECK (ultima_mensagem_direcao IN ('entrada', 'saida') OR ultima_mensagem_direcao IS NULL),
  -- Contador não lidas (atendente que ainda não viu)
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
  -- Direção: entrada (responsável → escola) ou saida (escola → responsável)
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  texto TEXT NOT NULL,
  -- Para mensagens de saída (resposta da escola)
  atendente_id TEXT,
  atendente_nome TEXT,
  -- Status de envio
  status TEXT DEFAULT 'enviada' CHECK (status IN ('rascunho', 'enviada', 'entregue', 'lida', 'falha')),
  -- Anexos opcionais
  midia_url TEXT,
  midia_tipo TEXT,
  -- Quando o destinatário leu (mensagens de entrada → atendente; saída → responsável)
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens(conversa_id, created_at DESC);

-- RLS aberto (depende de service_role das APIs)
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
