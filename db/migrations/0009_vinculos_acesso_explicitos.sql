-- Autorização passa a depender de IDs explícitos. O runner controla a transação.
-- Não altera usuários, nomes, históricos ou atribuições IAM já preenchidas.
-- Esta normalização é usada somente nesta conversão de legado, nunca em runtime.
CREATE FUNCTION pg_temp.normalizar_nome_vinculo(valor TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower(regexp_replace(
    regexp_replace(
      regexp_replace(normalize(valor, NFD), U&'[\0300-\036f]', '', 'g'),
      '^\s+|\s+$', '', 'g'
    ), '\s+', ' ', 'g'
  ));
$$;

-- Recupera primeiro um ID legado real ativo, sem sobrescrever atribuição explícita.
UPDATE app.turmas AS turma
SET professor_usuario_id = usuario.id
FROM iam.usuarios AS usuario
WHERE turma.professor_usuario_id IS NULL
  AND usuario.escola_id = turma.escola_id
  AND usuario.id = turma.professor_id
  AND usuario.ativo = TRUE
  AND usuario.perfil = 'professor';

-- Converte o antigo fallback nominal apenas com um professor ativo único na
-- mesma escola. Títulos/pontuação continuam significativos; homônimos não casam.
-- Qualquer ID legado real existente fecha o fallback, mesmo se estiver inativo:
-- transferir sua turma a outro usuário homônimo exigiria decisão da gestão.
WITH candidatos AS (
  SELECT turma.escola_id, turma.id, min(usuario.id) AS usuario_id
  FROM app.turmas AS turma
  JOIN iam.usuarios AS usuario
    ON usuario.escola_id = turma.escola_id
    AND usuario.perfil = 'professor'
    AND usuario.ativo = TRUE
    AND pg_temp.normalizar_nome_vinculo(usuario.nome) =
        pg_temp.normalizar_nome_vinculo(turma.professor_nome)
  WHERE turma.professor_usuario_id IS NULL
    AND pg_temp.normalizar_nome_vinculo(turma.professor_nome) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM iam.usuarios AS usuario_legado
      WHERE usuario_legado.escola_id = turma.escola_id
        AND usuario_legado.id = turma.professor_id
    )
  GROUP BY turma.escola_id, turma.id
  HAVING count(*) = 1
)
UPDATE app.turmas AS turma
SET professor_usuario_id = candidato.usuario_id
FROM candidatos AS candidato
WHERE turma.escola_id = candidato.escola_id AND turma.id = candidato.id;

ALTER TABLE app.bercario_bebes ADD COLUMN turma_id TEXT;

ALTER TABLE app.bercario_bebes
  ADD CONSTRAINT bercario_bebes_turma_fk
  FOREIGN KEY (escola_id, turma_id)
  REFERENCES app.turmas (escola_id, id)
  ON UPDATE CASCADE ON DELETE SET NULL (turma_id);

CREATE INDEX bercario_bebes_turma_idx
  ON app.bercario_bebes (escola_id, turma_id)
  WHERE turma_id IS NOT NULL;

-- Só herda turma de cadastro de aluno quando nome da criança E responsável
-- são exatos após normalização, com correspondência única em ambos os lados.
-- Crianças sem responsável, homônimas, inativas/excluídas ou de outra escola
-- continuam sem vínculo para atribuição explícita pela gestão. O rótulo de
-- professora do bebê nunca é usado para conceder acesso.
WITH correspondencias AS (
  SELECT bebe.escola_id, bebe.id AS bebe_id, aluno.id AS aluno_id, aluno.turma_id,
    count(*) OVER (PARTITION BY bebe.escola_id, bebe.id) AS candidatos_aluno,
    count(*) OVER (PARTITION BY aluno.escola_id, aluno.id) AS candidatos_bebe
  FROM app.bercario_bebes AS bebe
  JOIN app.alunos AS aluno
    ON aluno.escola_id = bebe.escola_id
    AND aluno.status = 'Ativo'
    AND aluno.deleted_at IS NULL
    AND pg_temp.normalizar_nome_vinculo(aluno.nome) =
        pg_temp.normalizar_nome_vinculo(bebe.nome)
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(aluno.responsaveis_json) AS entrada_responsavel(dados)
      WHERE pg_temp.normalizar_nome_vinculo(entrada_responsavel.dados->>'nome') =
            pg_temp.normalizar_nome_vinculo(bebe.responsavel)
    )
  WHERE bebe.turma_id IS NULL
    AND pg_temp.normalizar_nome_vinculo(bebe.responsavel) <> ''
)
UPDATE app.bercario_bebes AS bebe
SET turma_id = correspondencia.turma_id
FROM correspondencias AS correspondencia
WHERE bebe.escola_id = correspondencia.escola_id
  AND bebe.id = correspondencia.bebe_id
  AND correspondencia.candidatos_aluno = 1
  AND correspondencia.candidatos_bebe = 1;

COMMENT ON COLUMN app.bercario_bebes.turma_id IS
  'Turma explícita que autoriza professores. Nulo: pendente de atribuição pela direção/coordenação.';

DROP FUNCTION pg_temp.normalizar_nome_vinculo(TEXT);
