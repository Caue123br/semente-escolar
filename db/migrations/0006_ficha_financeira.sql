-- 0006_ficha_financeira.sql
-- Ficha financeira do aluno.
-- Aditivo e seguro: adiciona colunas ANULÁVEIS de plano de pagamento em
-- app.alunos e cria a tabela app.cobrancas (parcelas de matrícula + mensalidades
-- geradas do plano). Não altera app.mensalidades nem o fluxo de matrícula atual;
-- alunos já cadastrados permanecem válidos (todas as colunas novas são NULL).

-- 1. Plano de pagamento no aluno (tudo anulável)
ALTER TABLE app.alunos
  ADD COLUMN IF NOT EXISTS matricula_taxa            NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS matricula_forma           TEXT,
  ADD COLUMN IF NOT EXISTS matricula_modalidade      TEXT,  -- 'avista' | 'parcelado'
  ADD COLUMN IF NOT EXISTS matricula_parcelas        INTEGER,
  ADD COLUMN IF NOT EXISTS mensalidade_valor         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS mensalidade_periodicidade TEXT,  -- 'mensal' | 'anual'
  ADD COLUMN IF NOT EXISTS dia_vencimento            INTEGER;

ALTER TABLE app.alunos DROP CONSTRAINT IF EXISTS alunos_matricula_modalidade_valida;
ALTER TABLE app.alunos DROP CONSTRAINT IF EXISTS alunos_mensalidade_periodicidade_valida;
ALTER TABLE app.alunos DROP CONSTRAINT IF EXISTS alunos_dia_vencimento_valido;
ALTER TABLE app.alunos DROP CONSTRAINT IF EXISTS alunos_matricula_parcelas_valida;
ALTER TABLE app.alunos DROP CONSTRAINT IF EXISTS alunos_matricula_taxa_nao_negativa;
ALTER TABLE app.alunos DROP CONSTRAINT IF EXISTS alunos_mensalidade_valor_nao_negativa;

ALTER TABLE app.alunos
  ADD CONSTRAINT alunos_matricula_modalidade_valida
    CHECK (matricula_modalidade IS NULL OR matricula_modalidade IN ('avista','parcelado')),
  ADD CONSTRAINT alunos_mensalidade_periodicidade_valida
    CHECK (mensalidade_periodicidade IS NULL OR mensalidade_periodicidade IN ('mensal','anual')),
  ADD CONSTRAINT alunos_dia_vencimento_valido
    CHECK (dia_vencimento IS NULL OR (dia_vencimento BETWEEN 1 AND 28)),
  ADD CONSTRAINT alunos_matricula_parcelas_valida
    CHECK (matricula_parcelas IS NULL OR (matricula_parcelas BETWEEN 1 AND 48)),
  ADD CONSTRAINT alunos_matricula_taxa_nao_negativa
    CHECK (matricula_taxa IS NULL OR matricula_taxa >= 0),
  ADD CONSTRAINT alunos_mensalidade_valor_nao_negativa
    CHECK (mensalidade_valor IS NULL OR mensalidade_valor >= 0);

-- 2. Cobranças: cada parcela de matrícula ou mensalidade gerada do plano
CREATE TABLE IF NOT EXISTS app.cobrancas (
  escola_id       TEXT NOT NULL,
  id              TEXT NOT NULL,
  aluno_id        TEXT NOT NULL,
  tipo            TEXT NOT NULL,                         -- 'matricula' | 'mensalidade'
  descricao       TEXT NOT NULL,
  valor           NUMERIC(12,2) NOT NULL,
  vencimento      DATE NOT NULL,
  valor_pago      NUMERIC(12,2),
  data_pagamento  DATE,
  status          TEXT NOT NULL DEFAULT 'Pendente',      -- 'Pendente' | 'Pago' | 'Atrasada'
  forma_pagamento TEXT,
  parcela_num     INTEGER,
  parcela_total   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT cobrancas_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT cobrancas_aluno_fk
    FOREIGN KEY (escola_id, aluno_id) REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT cobrancas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT cobrancas_tipo_valido CHECK (tipo IN ('matricula','mensalidade')),
  CONSTRAINT cobrancas_status_valido CHECK (status IN ('Pendente','Pago','Atrasada')),
  CONSTRAINT cobrancas_valor_positivo CHECK (valor > 0),
  CONSTRAINT cobrancas_valor_pago_nao_negativo CHECK (valor_pago IS NULL OR valor_pago >= 0),
  CONSTRAINT cobrancas_pagamento_coerente CHECK (data_pagamento IS NULL OR valor_pago IS NOT NULL),
  CONSTRAINT cobrancas_pago_integral CHECK (
    status <> 'Pago'
    OR (valor_pago IS NOT NULL AND data_pagamento IS NOT NULL
        AND NULLIF(btrim(forma_pagamento), '') IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS cobrancas_aluno_idx  ON app.cobrancas (escola_id, aluno_id, vencimento);
CREATE INDEX IF NOT EXISTS cobrancas_status_idx ON app.cobrancas (escola_id, status, vencimento);

DROP TRIGGER IF EXISTS definir_updated_at ON app.cobrancas;
CREATE TRIGGER definir_updated_at BEFORE UPDATE ON app.cobrancas
  FOR EACH ROW EXECUTE FUNCTION app.definir_updated_at();

-- 3. Grants (default privileges do owner já cobrem; explícito por segurança).
--    Guardado para funcionar tanto em produção (com semente_app) quanto no
--    ambiente local de dev (role único, sem semente_app).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.cobrancas TO semente_app;
  END IF;
END
$$;
