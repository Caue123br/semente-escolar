-- =====================================================
-- FICHA DE MATRÍCULA COMPLETA (modelo Escola Modelo Taubaté)
-- =====================================================

-- Campos adicionais na tabela alunos
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS ra TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS raca TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('M', 'F') OR sexo IS NULL);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS natural_de TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS telefone_aluno TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS religiao TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS escola_anterior_nome TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS escola_anterior_tempo TEXT;

-- Pessoas autorizadas a sair com o aluno (JSON array)
-- Formato: [{ nome: string, parentesco: string }]
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS pessoas_autorizadas_json JSONB DEFAULT '[]'::jsonb;

-- Ficha de saúde completa (JSON object)
-- Formato: {
--   doencas: { bronquite: bool, catapora: bool, ... },
--   doencas_outras: string,
--   desmaio_sim: bool, desmaio_motivo: string,
--   internado_sim: bool, internado_motivo: string,
--   alergias: string,
--   tratamento_medico_sim: bool, tratamento_motivo: string,
--   trauma_fobia: string,
--   medicamento_febre_sim: bool, medicamento_febre_qual: string,
--   medico_nome: string, medico_telefone: string,
--   convenio_sim: bool, convenio_qual: string,
--   informacoes_complementares: string,
-- }
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS ficha_saude_json JSONB;
