-- Campo opcional separado; endereços existentes permanecem intactos.
-- O runner controla a transação desta migration.
ALTER TABLE app.alunos
  ADD COLUMN numero_residencia TEXT NULL;

ALTER TABLE app.alunos
  ADD CONSTRAINT alunos_numero_residencia_tamanho CHECK (
    numero_residencia IS NULL OR char_length(numero_residencia) <= 30
  );
