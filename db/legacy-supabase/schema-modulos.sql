-- =====================================================
-- SUPER ADMIN: controle de módulos ON/OFF
-- =====================================================
CREATE TABLE IF NOT EXISTS modulos_config (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INT DEFAULT 0,
  grupo TEXT,
  descricao TEXT,
  perfis_permitidos JSONB DEFAULT '["diretor","coordenador"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modulos_ativo ON modulos_config(ativo);

ALTER TABLE modulos_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON modulos_config;
CREATE POLICY "anon_all" ON modulos_config FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO modulos_config (id, nome, grupo, ordem, ativo) VALUES
  ('cockpit', 'Cockpit', 'Principal', 1, true),
  ('financeiro', 'Financeiro', 'Financeiro', 10, true),
  ('vendas', 'Vendas / PDV', 'Financeiro', 11, true),
  ('nota-fiscal', 'Nota Fiscal', 'Financeiro', 12, true),
  ('pedagogico', 'Pedagógico', 'Pedagógico', 20, true),
  ('alunos', 'Alunos', 'Pedagógico', 21, true),
  ('kanban', 'Kanban', 'Pedagógico', 22, true),
  ('biblioteca', 'Biblioteca', 'Pedagógico', 23, true),
  ('bercario', 'Berçário', 'Pedagógico', 24, true),
  ('saude', 'Saúde', 'Pedagógico', 25, true),
  ('recados', 'Recados', 'Pedagógico', 26, true),
  ('calendario', 'Calendário', 'Operacional', 30, true),
  ('cardapio', 'Cardápio', 'Operacional', 31, true),
  ('transporte', 'Transporte', 'Operacional', 32, true),
  ('estoque', 'Estoque', 'Operacional', 33, true),
  ('reservas', 'Reservas', 'Operacional', 34, true),
  ('patrimonio', 'Patrimônio', 'Operacional', 35, true),
  ('whatsapp', 'Atendimento', 'Comunicação', 40, true),
  ('mural', 'Mural', 'Comunicação', 41, true),
  ('pais', 'Portal dos Pais', 'Comunicação', 42, true),
  ('rh', 'RH & Equipe', 'Gestão', 50, true),
  ('crm', 'CRM Captação', 'Gestão', 51, true),
  ('relatorios', 'Relatórios', 'Gestão', 52, true),
  ('frequencia', 'Frequência', 'Gestão', 53, true),
  ('configuracoes', 'Configurações', 'Sistema', 90, true),
  ('lgpd', 'LGPD & Auditoria', 'Sistema', 91, true)
ON CONFLICT (id) DO NOTHING;

SELECT 'OK — módulos configurados' AS resultado;
