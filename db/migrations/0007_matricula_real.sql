-- 0007_matricula_real.sql
-- Preparação do banco para as matrículas reais.
--   1. Unicidade de matrícula, RA e CPF de aluno e de CPF de funcionário passa a
--      valer somente entre registros não excluídos: uma exclusão por engano não
--      pode impedir a rematrícula da mesma criança com o mesmo CPF, nem a
--      recontratação do mesmo funcionário.
--   2. A quitação de mensalidade deixa de exigir valor pago exatamente igual ao
--      previsto — libera bolsa, desconto de pontualidade, multa e arredondamento
--      sem abrir mão de data e forma de pagamento.
-- O runner de migrations é o dono da transação; não adicione BEGIN/COMMIT aqui.

-- 1. Índices únicos parciais ignorando registros excluídos.
--    Os novos índices cobrem um subconjunto das linhas dos antigos, então a
--    recriação não pode falhar por duplicidade que já não existisse antes.
DROP INDEX IF EXISTS app.alunos_matricula_unique;
CREATE UNIQUE INDEX alunos_matricula_unique
  ON app.alunos (escola_id, matricula)
  WHERE matricula IS NOT NULL
    AND btrim(matricula) <> ''
    AND deleted_at IS NULL;

DROP INDEX IF EXISTS app.alunos_ra_unique;
CREATE UNIQUE INDEX alunos_ra_unique
  ON app.alunos (escola_id, ra)
  WHERE ra IS NOT NULL
    AND btrim(ra) <> ''
    AND deleted_at IS NULL;

DROP INDEX IF EXISTS app.alunos_cpf_unique;
CREATE UNIQUE INDEX alunos_cpf_unique
  ON app.alunos (escola_id, cpf)
  WHERE cpf IS NOT NULL
    AND btrim(cpf) <> ''
    AND deleted_at IS NULL;

--    app.funcionarios também é tabela de soft delete (a exclusão só grava
--    deleted_at), então o mesmo CPF ficava bloqueado depois de um desligamento.
DROP INDEX IF EXISTS app.funcionarios_cpf_unique;
CREATE UNIQUE INDEX funcionarios_cpf_unique
  ON app.funcionarios (escola_id, cpf)
  WHERE cpf IS NOT NULL
    AND btrim(cpf) <> ''
    AND deleted_at IS NULL;

-- 2. Quitação de mensalidade: o valor recebido pode divergir do previsto.
--    NOT VALID como na 0004: a regra vale para toda inclusão e alteração
--    futura, sem travar a migration em registro legado inconsistente. A regra
--    nova é mais permissiva que a antiga, portanto nenhuma linha que já passava
--    deixa de passar.
ALTER TABLE app.mensalidades
  DROP CONSTRAINT IF EXISTS mensalidades_quitacao_integral;

ALTER TABLE app.mensalidades
  ADD CONSTRAINT mensalidades_pagamento_registrado CHECK (
    status <> 'Paga'
    OR (
      valor_pago IS NOT NULL
      AND valor_pago > 0
      AND data_pagamento IS NOT NULL
      AND NULLIF(btrim(forma_pagamento), '') IS NOT NULL
    )
  ) NOT VALID;

COMMENT ON CONSTRAINT mensalidades_pagamento_registrado ON app.mensalidades IS
  'Mensalidade Paga exige valor recebido positivo, data e forma de pagamento. O valor pode divergir do previsto (bolsa, desconto, multa, arredondamento).';
