-- =====================================================
-- SCHEMA SEMENTE — Usuários, perfis e audit log
-- =====================================================
-- Roda essa migration UMA VEZ no SQL Editor do Supabase
-- =====================================================

-- ============= 1. USUÁRIOS DO SISTEMA =============

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'professor' CHECK (perfil IN ('diretor', 'coordenador', 'professor', 'financeiro')),
  senha_hash TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);

-- ============= 2. AUDIT LOG =============

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  usuario_nome TEXT,
  usuario_email TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  registro_id TEXT,
  detalhes JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_data ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_logs(entidade);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs(usuario_id);

-- ============= 3. SOLICITAÇÕES LGPD =============

CREATE TABLE IF NOT EXISTS lgpd_solicitacoes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('acesso', 'exclusao', 'correcao', 'portabilidade')),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  detalhes TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'concluida', 'rejeitada')),
  resposta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  respondida_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lgpd_status ON lgpd_solicitacoes(status);

-- ============= 4. RLS aberto pra modo demo =============
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON usuarios;
CREATE POLICY "anon_all" ON usuarios FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON usuarios;
CREATE POLICY "auth_all" ON usuarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all" ON audit_logs;
CREATE POLICY "anon_all" ON audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON audit_logs;
CREATE POLICY "auth_all" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all" ON lgpd_solicitacoes;
CREATE POLICY "anon_all" ON lgpd_solicitacoes FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON lgpd_solicitacoes;
CREATE POLICY "auth_all" ON lgpd_solicitacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============= 5. USUÁRIO ADMIN PADRÃO (você) =============
-- IMPORTANTE: troque essa senha depois! Hash do bcrypt da senha "modelo2026"
INSERT INTO usuarios (id, email, nome, perfil, senha_hash, ativo)
VALUES (
  'admin-default',
  'admin@escolamodelo.com',
  'Administrador',
  'diretor',
  '$2b$10$8Kigg8RWeY1bsOvcY3Mf8On/zITxK.mUo4N9w95xu3Vk4TCOyuw2C',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Pronto! Tabelas: usuarios, audit_logs, lgpd_solicitacoes.
-- Login inicial: admin@escolamodelo.com / modelo2026
-- TROQUE essa senha no primeiro acesso!
