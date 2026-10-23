-- Período individual da criança; fichas antigas permanecem sem período definido.
-- O runner controla a transação desta migration.
ALTER TABLE app.alunos
  ADD COLUMN periodo TEXT;

ALTER TABLE app.alunos
  ADD CONSTRAINT alunos_periodo_valido CHECK (
    periodo IS NULL OR periodo IN (
      'parcial_manha',
      'parcial_tarde',
      'semi_manha',
      'semi_tarde',
      'intermediario_manha',
      'intermediario_tarde',
      'integral'
    )
  );
