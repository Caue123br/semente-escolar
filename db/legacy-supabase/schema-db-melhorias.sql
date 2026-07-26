-- =====================================================
-- MELHORIAS DB: FKs, soft delete, triggers, índices
-- =====================================================

-- ============= 1. FOREIGN KEYS =============

-- alunos.turma_id → turmas
DO $$ BEGIN
  ALTER TABLE alunos ADD CONSTRAINT alunos_turma_fk
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR invalid_foreign_key THEN NULL; END $$;

-- mensalidades.aluno_id → alunos
DO $$ BEGIN
  ALTER TABLE mensalidades ADD CONSTRAINT mens_aluno_fk
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR invalid_foreign_key THEN NULL; END $$;

-- frequencia.aluno_id → alunos
DO $$ BEGIN
  ALTER TABLE frequencia ADD CONSTRAINT freq_aluno_fk
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR invalid_foreign_key THEN NULL; END $$;

-- ============= 2. SOFT DELETE =============

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS deleted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_alunos_deleted ON alunos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_deleted ON funcionarios(deleted_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW alunos_ativos AS SELECT * FROM alunos WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW funcionarios_ativos AS SELECT * FROM funcionarios WHERE deleted_at IS NULL;

-- ============= 3. updated_at TRIGGER (global) =============

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adiciona coluna updated_at em tabelas críticas
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN CREATE TRIGGER set_updated_at_alunos BEFORE UPDATE ON alunos FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_mensalidades BEFORE UPDATE ON mensalidades FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_estoque BEFORE UPDATE ON estoque FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_despesas BEFORE UPDATE ON despesas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_funcionarios BEFORE UPDATE ON funcionarios FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_vendas BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= 4. ÍNDICES COMPOSTOS =============

CREATE INDEX IF NOT EXISTS idx_mens_aluno_status ON mensalidades(aluno_id, status);
CREATE INDEX IF NOT EXISTS idx_freq_turma_data ON frequencia(turma_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_freq_aluno_data ON frequencia(aluno_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_mural_fixado ON mural_posts(fixado DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recados_pinado ON recados(pinado DESC, enviado_em DESC);

SELECT 'OK — FKs + soft delete + updated_at + índices aplicados' AS resultado;
