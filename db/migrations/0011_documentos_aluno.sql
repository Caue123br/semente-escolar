-- 0011_documentos_aluno.sql
-- Arquivo digital de documentos por aluno (certidão, RG, laudos, contratos).
-- Aditiva e segura: cria apenas a tabela nova; nada existente muda.

CREATE TABLE IF NOT EXISTS app.alunos_documentos (
  escola_id        TEXT NOT NULL,
  id               TEXT NOT NULL,
  aluno_id         TEXT NOT NULL,
  categoria        TEXT NOT NULL,
  descricao        TEXT,
  arquivo_url      TEXT NOT NULL,
  mime             TEXT NOT NULL,
  tamanho_bytes    INTEGER NOT NULL,
  enviado_por      TEXT,
  enviado_por_nome TEXT NOT NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT alunos_documentos_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  -- RESTRICT de propósito: aluno com documentos arquivados não pode sumir do
  -- banco sem decisão explícita (a exclusão de aluno no app é reversível).
  CONSTRAINT alunos_documentos_aluno_fk
    FOREIGN KEY (escola_id, aluno_id) REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT alunos_documentos_enviado_por_fk
    FOREIGN KEY (escola_id, enviado_por) REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (enviado_por),
  CONSTRAINT alunos_documentos_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT alunos_documentos_categoria_nao_vazia CHECK (btrim(categoria) <> ''),
  CONSTRAINT alunos_documentos_mime_valido CHECK (
    mime IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  CONSTRAINT alunos_documentos_tamanho_valido CHECK (tamanho_bytes > 0)
);

CREATE INDEX IF NOT EXISTS alunos_documentos_aluno_idx
  ON app.alunos_documentos (escola_id, aluno_id, criado_em DESC);

-- Grants (default privileges do owner já cobrem; explícito por segurança).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.alunos_documentos TO semente_app;
  END IF;
END
$$;
