-- Public demo requests are product-sales contacts, not school-enrollment CRM
-- leads. Keep them isolated so admission data is not polluted.

CREATE TABLE app.solicitacoes_demo (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  escola TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  faixa_alunos TEXT NOT NULL,
  data_preferida DATE NOT NULL,
  hora_preferida TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'recebida',
  origem TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT solicitacoes_demo_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT solicitacoes_demo_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT solicitacoes_demo_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT solicitacoes_demo_email_nao_vazio CHECK (btrim(email) <> ''),
  CONSTRAINT solicitacoes_demo_status_valido
    CHECK (status IN ('recebida', 'em_contato', 'concluida', 'cancelada'))
);

CREATE INDEX solicitacoes_demo_status_data_idx
  ON app.solicitacoes_demo (escola_id, status, created_at DESC);

CREATE TRIGGER definir_updated_at
BEFORE UPDATE ON app.solicitacoes_demo
FOR EACH ROW EXECUTE FUNCTION app.definir_updated_at();

REVOKE ALL ON app.solicitacoes_demo FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.solicitacoes_demo TO semente_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_readonly') THEN
    GRANT SELECT ON app.solicitacoes_demo TO semente_readonly;
  END IF;
END;
$$;
