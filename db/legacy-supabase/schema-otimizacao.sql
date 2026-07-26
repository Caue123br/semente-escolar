-- =====================================================
-- OTIMIZAÇÃO DO BANCO — índices + constraints
-- Rode UMA VEZ. Idempotente (pode rodar de novo).
-- =====================================================

-- ============= ÍNDICES nas colunas mais filtradas =============

-- vendas (PDV): filtros por data, cliente, tipo
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_tipo ON vendas(tipo);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente);
CREATE INDEX IF NOT EXISTS idx_vendas_aluno ON vendas(aluno_id);

-- mensalidades: status + vencimento (régua de inadimplência)
CREATE INDEX IF NOT EXISTS idx_mensalidades_status ON mensalidades(status);
CREATE INDEX IF NOT EXISTS idx_mensalidades_vencimento ON mensalidades(vencimento DESC);
CREATE INDEX IF NOT EXISTS idx_mensalidades_competencia ON mensalidades(competencia);
CREATE INDEX IF NOT EXISTS idx_mensalidades_aluno ON mensalidades(aluno_id);

-- despesas
CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(data DESC);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria);

-- estoque: PDV filtra por categoria + subcategoria
CREATE INDEX IF NOT EXISTS idx_estoque_categoria ON estoque(categoria, subcategoria);
CREATE INDEX IF NOT EXISTS idx_estoque_validade ON estoque(validade) WHERE validade IS NOT NULL;

-- alunos: busca por nome (autocomplete PDV)
CREATE INDEX IF NOT EXISTS idx_alunos_nome ON alunos(LOWER(nome));
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_alunos_status ON alunos(status);

-- frequência (consultado por aluno + data)
CREATE INDEX IF NOT EXISTS idx_frequencia_aluno_data ON frequencia(aluno_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_frequencia_turma_data ON frequencia(turma_id, data DESC);

-- audit log (consultado por entidade)
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_logs(entidade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs(usuario_id, created_at DESC);

-- ============= CONSTRAINTS de integridade =============

-- vendas: quantidade e preço positivos
DO $$ BEGIN
  ALTER TABLE vendas ADD CONSTRAINT vendas_quantidade_positiva CHECK (quantidade > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE vendas ADD CONSTRAINT vendas_preco_positivo CHECK (preco_unitario >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE vendas ADD CONSTRAINT vendas_total_positivo CHECK (total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- mensalidades: valor positivo
DO $$ BEGIN
  ALTER TABLE mensalidades ADD CONSTRAINT mens_valor_positivo CHECK (valor > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- despesas: valor positivo
DO $$ BEGIN
  ALTER TABLE despesas ADD CONSTRAINT desp_valor_positivo CHECK (valor > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- estoque: quantidade >= 0
DO $$ BEGIN
  ALTER TABLE estoque ADD CONSTRAINT estoque_qtd_nao_negativa CHECK (quantidade >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= updated_at automático em quem tem essa coluna =============
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_conversas
    BEFORE UPDATE ON conversas
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= Verificação =============
SELECT 'OK — índices e constraints aplicados.' AS resultado;
