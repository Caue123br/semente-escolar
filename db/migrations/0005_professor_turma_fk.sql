-- Vínculo explícito para novas atribuições de professor. A coluna legada
-- professor_id é preservada porque fixtures antigas usam outro namespace.
ALTER TABLE app.turmas
  ADD COLUMN professor_usuario_id TEXT;

-- Aproveita vínculos que já usam o ID real do usuário.
UPDATE app.turmas AS turma
SET professor_usuario_id = turma.professor_id
WHERE turma.professor_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM iam.usuarios AS usuario
    WHERE usuario.escola_id = turma.escola_id
      AND usuario.id = turma.professor_id
      AND usuario.perfil = 'professor'
  );

-- Backfill nominal somente quando existe exatamente um professor ativo com o
-- mesmo nome normalizado dentro da escola. Ambiguidade permanece sem vínculo.
UPDATE app.turmas AS turma
SET professor_usuario_id = (
  SELECT usuario.id
  FROM iam.usuarios AS usuario
  WHERE usuario.escola_id = turma.escola_id
    AND usuario.perfil = 'professor'
    AND usuario.ativo = TRUE
    AND lower(regexp_replace(btrim(usuario.nome), '\s+', ' ', 'g')) =
        lower(regexp_replace(btrim(turma.professor_nome), '\s+', ' ', 'g'))
  LIMIT 1
)
WHERE turma.professor_usuario_id IS NULL
  AND NULLIF(btrim(turma.professor_nome), '') IS NOT NULL
  AND 1 = (
    SELECT count(*)
    FROM iam.usuarios AS usuario
    WHERE usuario.escola_id = turma.escola_id
      AND usuario.perfil = 'professor'
      AND usuario.ativo = TRUE
      AND lower(regexp_replace(btrim(usuario.nome), '\s+', ' ', 'g')) =
          lower(regexp_replace(btrim(turma.professor_nome), '\s+', ' ', 'g'))
  );

ALTER TABLE app.turmas
  ADD CONSTRAINT turmas_professor_usuario_fk
  FOREIGN KEY (escola_id, professor_usuario_id)
  REFERENCES iam.usuarios (escola_id, id)
  ON UPDATE CASCADE ON DELETE SET NULL (professor_usuario_id);

CREATE INDEX turmas_professor_usuario_idx
  ON app.turmas (escola_id, professor_usuario_id)
  WHERE professor_usuario_id IS NOT NULL;

COMMENT ON COLUMN app.turmas.professor_usuario_id IS
  'Vínculo IAM canônico. professor_id permanece apenas para compatibilidade legada.';
