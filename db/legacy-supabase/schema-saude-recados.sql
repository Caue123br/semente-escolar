-- =====================================================
-- SAÚDE (intercorrências) + RECADOS (lições/comunicados)
-- =====================================================

-- ============= INTERCORRENCIAS DE SAÚDE =============
CREATE TABLE IF NOT EXISTS intercorrencias (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  aluno_nome TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME DEFAULT CURRENT_TIME,
  tipo TEXT NOT NULL CHECK (tipo IN ('febre', 'queda', 'medicamento', 'mal_estar', 'alergia', 'higiene', 'comportamento', 'outros')),
  descricao TEXT NOT NULL,
  -- Pra febre/medicamento
  temperatura DECIMAL(4,1),
  medicamento_nome TEXT,
  medicamento_dose TEXT,
  -- Quem registrou
  registrado_por_id TEXT,
  registrado_por_nome TEXT,
  -- Comunicação com pais
  notificou_pais BOOLEAN DEFAULT FALSE,
  notificado_em TIMESTAMPTZ,
  pais_visualizaram BOOLEAN DEFAULT FALSE,
  pais_visualizaram_em TIMESTAMPTZ,
  observacoes_pais TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intercorrencias_aluno ON intercorrencias(aluno_id);
CREATE INDEX IF NOT EXISTS idx_intercorrencias_data ON intercorrencias(data DESC);

-- ============= RECADOS / COMUNICADOS / LIÇÕES =============
CREATE TABLE IF NOT EXISTS recados (
  id TEXT PRIMARY KEY,
  -- Origem
  autor_id TEXT,
  autor_nome TEXT NOT NULL,
  autor_cargo TEXT,
  -- Destino: turma_id pra turma toda, aluno_id pra individual, nulo pra TODOS
  turma_id TEXT,
  aluno_id TEXT,
  -- Conteúdo
  tipo TEXT NOT NULL CHECK (tipo IN ('recado', 'licao_de_casa', 'comunicado', 'evento', 'lembrete')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  -- Pra lição de casa
  data_limite DATE,
  -- Anexos opcionais (URL)
  anexo_url TEXT,
  anexo_tipo TEXT,
  -- Sinalização
  urgente BOOLEAN DEFAULT FALSE,
  pinado BOOLEAN DEFAULT FALSE,
  -- Leitura
  pais_que_leram JSONB DEFAULT '[]'::jsonb,
  total_destinatarios INT DEFAULT 0,
  -- Timestamps
  enviado_em TIMESTAMPTZ DEFAULT NOW(),
  expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recados_turma ON recados(turma_id);
CREATE INDEX IF NOT EXISTS idx_recados_aluno ON recados(aluno_id);
CREATE INDEX IF NOT EXISTS idx_recados_data ON recados(enviado_em DESC);
CREATE INDEX IF NOT EXISTS idx_recados_tipo ON recados(tipo);

-- ============= RLS =============
ALTER TABLE intercorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE recados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON intercorrencias;
CREATE POLICY "anon_all" ON intercorrencias FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON intercorrencias;
CREATE POLICY "auth_all" ON intercorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all" ON recados;
CREATE POLICY "anon_all" ON recados FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON recados;
CREATE POLICY "auth_all" ON recados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============= Verificação =============
SELECT
  'intercorrencias' AS tabela,
  (SELECT COUNT(*) FROM intercorrencias) AS total
UNION ALL
SELECT 'recados', (SELECT COUNT(*) FROM recados);
