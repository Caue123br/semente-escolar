-- PostgreSQL 16 baseline for Semente Escolar.
-- The migration runner owns the transaction; do not add BEGIN/COMMIT here.

CREATE SCHEMA app;
CREATE SCHEMA iam;
CREATE SCHEMA audit;

-- ---------------------------------------------------------------------------
-- Tenant root
-- ---------------------------------------------------------------------------

CREATE TABLE app.escolas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  logo_texto TEXT NOT NULL DEFAULT 'EM',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT escolas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT escolas_nome_nao_vazio CHECK (btrim(nome) <> '')
);

CREATE UNIQUE INDEX escolas_cnpj_unique
  ON app.escolas (cnpj)
  WHERE cnpj IS NOT NULL AND btrim(cnpj) <> '';

-- ---------------------------------------------------------------------------
-- Identity, access and revocable sessions
-- ---------------------------------------------------------------------------

CREATE TABLE iam.papeis (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT papeis_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT papeis_nome_nao_vazio CHECK (btrim(nome) <> '')
);

CREATE TABLE iam.permissoes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT permissoes_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT permissoes_nome_nao_vazio CHECK (btrim(nome) <> '')
);

CREATE TABLE iam.papel_permissoes (
  papel_id TEXT NOT NULL,
  permissao_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (papel_id, permissao_id),
  CONSTRAINT papel_permissoes_papel_fk
    FOREIGN KEY (papel_id) REFERENCES iam.papeis (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT papel_permissoes_permissao_fk
    FOREIGN KEY (permissao_id) REFERENCES iam.permissoes (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- Roles and permissions are metadata only. No login or password is seeded.
INSERT INTO iam.papeis (id, nome, descricao) VALUES
  ('diretor', 'Diretor', 'Administra a escola e seus usuários'),
  ('coordenador', 'Coordenador', 'Coordena rotinas pedagógicas e operacionais'),
  ('professor', 'Professor', 'Opera módulos pedagógicos autorizados'),
  ('financeiro', 'Financeiro', 'Opera módulos financeiros autorizados');

INSERT INTO iam.permissoes (id, nome, descricao)
SELECT
  'modulo:' || modulo_id,
  modulo_nome,
  'Acesso ao módulo ' || modulo_nome
FROM (VALUES
  ('cockpit', 'Cockpit'),
  ('financeiro', 'Financeiro'),
  ('despesas', 'Despesas'),
  ('vendas', 'Vendas / PDV'),
  ('nota-fiscal', 'Nota Fiscal'),
  ('pedagogico', 'Pedagógico'),
  ('alunos', 'Alunos'),
  ('kanban', 'Kanban'),
  ('biblioteca', 'Biblioteca'),
  ('bercario', 'Berçário'),
  ('saude', 'Saúde'),
  ('recados', 'Recados'),
  ('calendario', 'Calendário'),
  ('cardapio', 'Cardápio'),
  ('transporte', 'Transporte'),
  ('estoque', 'Estoque'),
  ('reservas', 'Reservas'),
  ('patrimonio', 'Patrimônio'),
  ('whatsapp', 'Atendimento'),
  ('mural', 'Mural'),
  ('pais', 'Portal dos Pais'),
  ('rh', 'RH & Equipe'),
  ('crm', 'CRM Captação'),
  ('relatorios', 'Relatórios'),
  ('frequencia', 'Frequência'),
  ('configuracoes', 'Configurações'),
  ('lgpd', 'LGPD & Auditoria')
) AS modulos (modulo_id, modulo_nome);

INSERT INTO iam.permissoes (id, nome, descricao) VALUES
  ('*', 'Acesso total', 'Acesso administrativo a todos os módulos');

INSERT INTO iam.papel_permissoes (papel_id, permissao_id) VALUES
  ('diretor', '*');

INSERT INTO iam.papel_permissoes (papel_id, permissao_id)
SELECT 'coordenador', 'modulo:' || modulo_id
FROM unnest(ARRAY[
  'cockpit', 'alunos', 'pedagogico', 'calendario', 'mural', 'frequencia',
  'kanban', 'biblioteca', 'bercario', 'cardapio', 'reservas', 'rh', 'crm',
  'configuracoes', 'relatorios', 'lgpd'
]) AS modulo_id;

INSERT INTO iam.papel_permissoes (papel_id, permissao_id)
SELECT 'professor', 'modulo:' || modulo_id
FROM unnest(ARRAY[
  'cockpit', 'alunos', 'pedagogico', 'frequencia', 'kanban', 'calendario',
  'mural', 'biblioteca', 'bercario', 'cardapio'
]) AS modulo_id;

INSERT INTO iam.papel_permissoes (papel_id, permissao_id)
SELECT 'financeiro', 'modulo:' || modulo_id
FROM unnest(ARRAY[
  'cockpit', 'financeiro', 'vendas', 'nota-fiscal', 'estoque', 'despesas',
  'relatorios'
]) AS modulo_id;

CREATE TABLE iam.usuarios (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'professor',
  senha_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  auth_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT usuarios_escola_email_unique UNIQUE (escola_id, email),
  CONSTRAINT usuarios_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT usuarios_perfil_fk
    FOREIGN KEY (perfil) REFERENCES iam.papeis (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT usuarios_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT usuarios_email_normalizado CHECK (
    email = lower(btrim(email))
    AND btrim(email) <> ''
    AND position('@' IN email) > 1
  ),
  CONSTRAINT usuarios_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT usuarios_senha_hash_nao_vazio CHECK (btrim(senha_hash) <> ''),
  CONSTRAINT usuarios_auth_version_positiva CHECK (auth_version >= 1)
);

CREATE INDEX usuarios_escola_ativo_nome_idx
  ON iam.usuarios (escola_id, ativo, nome);

CREATE TABLE iam.sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  auth_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  ip INET,
  user_agent TEXT,
  CONSTRAINT sessoes_usuario_fk
    FOREIGN KEY (escola_id, usuario_id)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT sessoes_token_hash_valido CHECK (
    token_hash = lower(token_hash) AND token_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT sessoes_auth_version_positiva CHECK (auth_version >= 1),
  CONSTRAINT sessoes_expiracao_valida CHECK (expires_at > created_at),
  CONSTRAINT sessoes_revogacao_valida CHECK (
    revoked_at IS NULL OR revoked_at >= created_at
  )
);

CREATE INDEX sessoes_usuario_ativas_idx
  ON iam.sessoes (escola_id, usuario_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX sessoes_expiradas_idx
  ON iam.sessoes (expires_at)
  WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- School operations
-- Every tenant-owned table has a composite key and a mandatory escola_id.
-- Composite foreign keys prevent relationships from crossing tenants.
-- ---------------------------------------------------------------------------

CREATE TABLE app.funcionarios (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  admissao DATE,
  salario_bruto NUMERIC(12,2),
  vinculo TEXT NOT NULL DEFAULT 'CLT',
  status TEXT NOT NULL DEFAULT 'Ativo',
  turmas_atuacao_json JSONB,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT funcionarios_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT funcionarios_deleted_by_fk
    FOREIGN KEY (escola_id, deleted_by)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (deleted_by),
  CONSTRAINT funcionarios_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT funcionarios_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT funcionarios_cargo_nao_vazio CHECK (btrim(cargo) <> ''),
  CONSTRAINT funcionarios_salario_nao_negativo CHECK (
    salario_bruto IS NULL OR salario_bruto >= 0
  ),
  CONSTRAINT funcionarios_turmas_json_array CHECK (
    turmas_atuacao_json IS NULL OR jsonb_typeof(turmas_atuacao_json) = 'array'
  ),
  CONSTRAINT funcionarios_deleted_at_coerente CHECK (
    deleted_by IS NULL OR deleted_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX funcionarios_cpf_unique
  ON app.funcionarios (escola_id, cpf)
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';

CREATE INDEX funcionarios_ativos_nome_idx
  ON app.funcionarios (escola_id, nome)
  WHERE deleted_at IS NULL;

CREATE TABLE app.turmas (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  turno TEXT NOT NULL,
  professor_id TEXT,
  professor_nome TEXT,
  total_alunos INTEGER NOT NULL DEFAULT 0,
  capacidade INTEGER NOT NULL DEFAULT 25,
  cor TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT turmas_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT turmas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT turmas_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT turmas_serie_nao_vazia CHECK (btrim(serie) <> ''),
  CONSTRAINT turmas_turno_nao_vazio CHECK (btrim(turno) <> ''),
  CONSTRAINT turmas_total_alunos_nao_negativo CHECK (total_alunos >= 0),
  CONSTRAINT turmas_capacidade_nao_negativa CHECK (capacidade >= 0)
);

-- professor_id remains a legacy application identifier. Existing seed data uses
-- a namespace different from funcionarios.id, so it cannot safely be an FK yet.

CREATE INDEX turmas_nome_idx ON app.turmas (escola_id, nome);
CREATE INDEX turmas_professor_idx ON app.turmas (escola_id, professor_id)
  WHERE professor_id IS NOT NULL;

CREATE TABLE app.alunos (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf TEXT,
  rg TEXT,
  turma_id TEXT NOT NULL,
  bilingue BOOLEAN NOT NULL DEFAULT FALSE,
  matricula TEXT,
  data_matricula DATE,
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  foto TEXT,
  foto_url TEXT,
  responsaveis_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ra TEXT,
  raca TEXT,
  sexo TEXT,
  natural_de TEXT,
  estado TEXT,
  cep TEXT,
  endereco TEXT,
  bairro TEXT,
  telefone_aluno TEXT,
  religiao TEXT,
  escola_anterior_nome TEXT,
  escola_anterior_tempo TEXT,
  pessoas_autorizadas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ficha_saude_json JSONB,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT alunos_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT alunos_turma_fk
    FOREIGN KEY (escola_id, turma_id)
    REFERENCES app.turmas (escola_id, id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT alunos_deleted_by_fk
    FOREIGN KEY (escola_id, deleted_by)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (deleted_by),
  CONSTRAINT alunos_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT alunos_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT alunos_status_valido CHECK (status IN ('Ativo', 'Inativo', 'Trancado')),
  CONSTRAINT alunos_sexo_valido CHECK (sexo IS NULL OR sexo IN ('M', 'F')),
  CONSTRAINT alunos_responsaveis_json_array CHECK (
    jsonb_typeof(responsaveis_json) = 'array'
  ),
  CONSTRAINT alunos_pessoas_autorizadas_json_array CHECK (
    jsonb_typeof(pessoas_autorizadas_json) = 'array'
  ),
  CONSTRAINT alunos_ficha_saude_json_object CHECK (
    ficha_saude_json IS NULL OR jsonb_typeof(ficha_saude_json) = 'object'
  ),
  CONSTRAINT alunos_deleted_at_coerente CHECK (
    deleted_by IS NULL OR deleted_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX alunos_matricula_unique
  ON app.alunos (escola_id, matricula)
  WHERE matricula IS NOT NULL AND btrim(matricula) <> '';

CREATE UNIQUE INDEX alunos_ra_unique
  ON app.alunos (escola_id, ra)
  WHERE ra IS NOT NULL AND btrim(ra) <> '';

CREATE UNIQUE INDEX alunos_cpf_unique
  ON app.alunos (escola_id, cpf)
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';

CREATE INDEX alunos_turma_nome_idx ON app.alunos (escola_id, turma_id, nome);
CREATE INDEX alunos_status_idx ON app.alunos (escola_id, status);
CREATE INDEX alunos_nome_lower_idx ON app.alunos (escola_id, lower(nome));
CREATE INDEX alunos_ativos_idx ON app.alunos (escola_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE app.responsaveis (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  aluno_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  parentesco TEXT,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT responsaveis_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT responsaveis_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT responsaveis_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT responsaveis_nome_nao_vazio CHECK (btrim(nome) <> '')
);

CREATE INDEX responsaveis_aluno_idx
  ON app.responsaveis (escola_id, aluno_id);

CREATE UNIQUE INDEX responsaveis_principal_unique
  ON app.responsaveis (escola_id, aluno_id)
  WHERE principal;

CREATE TABLE app.mensalidades (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  aluno_id TEXT NOT NULL,
  aluno_nome TEXT,
  turma_nome TEXT,
  competencia TEXT NOT NULL,
  vencimento DATE NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  valor_pago NUMERIC(12,2),
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'A Vencer',
  dias_atraso INTEGER NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT mensalidades_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT mensalidades_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT mensalidades_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT mensalidades_competencia_nao_vazia CHECK (btrim(competencia) <> ''),
  CONSTRAINT mensalidades_competencia_formato CHECK (
    competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  ),
  CONSTRAINT mensalidades_valor_positivo CHECK (valor > 0),
  CONSTRAINT mensalidades_valor_pago_nao_negativo CHECK (
    valor_pago IS NULL OR valor_pago >= 0
  ),
  CONSTRAINT mensalidades_dias_atraso_nao_negativo CHECK (dias_atraso >= 0),
  CONSTRAINT mensalidades_status_valido CHECK (
    status IN ('Paga', 'A Vencer', 'Vence Hoje', 'Atrasada', 'Renegociada')
  ),
  CONSTRAINT mensalidades_pagamento_coerente CHECK (
    data_pagamento IS NULL OR valor_pago IS NOT NULL
  )
);

CREATE UNIQUE INDEX mensalidades_aluno_competencia_unique
  ON app.mensalidades (escola_id, aluno_id, competencia);
CREATE INDEX mensalidades_status_vencimento_idx
  ON app.mensalidades (escola_id, status, vencimento DESC);
CREATE INDEX mensalidades_competencia_idx
  ON app.mensalidades (escola_id, competencia);

CREATE TABLE app.despesas (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'A Pagar',
  fornecedor TEXT,
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT despesas_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT despesas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT despesas_descricao_nao_vazia CHECK (btrim(descricao) <> ''),
  CONSTRAINT despesas_valor_positivo CHECK (valor > 0),
  CONSTRAINT despesas_status_valido CHECK (status IN ('Paga', 'A Pagar', 'Atrasada'))
);

CREATE INDEX despesas_data_idx ON app.despesas (escola_id, data DESC);
CREATE INDEX despesas_status_idx ON app.despesas (escola_id, status);
CREATE INDEX despesas_categoria_idx ON app.despesas (escola_id, categoria);

CREATE TABLE app.vendas (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  data DATE NOT NULL,
  item_nome TEXT NOT NULL,
  tipo TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2),
  total NUMERIC(12,2),
  cliente TEXT,
  aluno_id TEXT,
  forma_pagamento TEXT,
  nota_fiscal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT vendas_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT vendas_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (aluno_id),
  CONSTRAINT vendas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT vendas_item_nao_vazio CHECK (btrim(item_nome) <> ''),
  CONSTRAINT vendas_quantidade_positiva CHECK (quantidade > 0),
  CONSTRAINT vendas_preco_nao_negativo CHECK (
    preco_unitario IS NULL OR preco_unitario >= 0
  ),
  CONSTRAINT vendas_total_nao_negativo CHECK (total IS NULL OR total >= 0)
);

CREATE INDEX vendas_data_idx ON app.vendas (escola_id, data DESC);
CREATE INDEX vendas_tipo_idx ON app.vendas (escola_id, tipo);
CREATE INDEX vendas_cliente_idx ON app.vendas (escola_id, cliente);
CREATE INDEX vendas_aluno_idx ON app.vendas (escola_id, aluno_id)
  WHERE aluno_id IS NOT NULL;

CREATE TABLE app.estoque (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  quantidade NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'un',
  ponto_reposicao NUMERIC(12,2),
  custo_unitario NUMERIC(12,2),
  preco_venda NUMERIC(12,2),
  fornecedor TEXT,
  validade DATE,
  tamanho TEXT,
  codigo_barras TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT estoque_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT estoque_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT estoque_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT estoque_categoria_nao_vazia CHECK (btrim(categoria) <> ''),
  CONSTRAINT estoque_unidade_nao_vazia CHECK (btrim(unidade) <> ''),
  CONSTRAINT estoque_quantidade_nao_negativa CHECK (quantidade >= 0),
  CONSTRAINT estoque_reposicao_nao_negativa CHECK (
    ponto_reposicao IS NULL OR ponto_reposicao >= 0
  ),
  CONSTRAINT estoque_custo_nao_negativo CHECK (
    custo_unitario IS NULL OR custo_unitario >= 0
  ),
  CONSTRAINT estoque_preco_nao_negativo CHECK (
    preco_venda IS NULL OR preco_venda >= 0
  )
);

CREATE INDEX estoque_categoria_idx
  ON app.estoque (escola_id, categoria, subcategoria);
CREATE INDEX estoque_validade_idx
  ON app.estoque (escola_id, validade)
  WHERE validade IS NOT NULL;
CREATE UNIQUE INDEX estoque_codigo_barras_unique
  ON app.estoque (escola_id, codigo_barras)
  WHERE codigo_barras IS NOT NULL AND btrim(codigo_barras) <> '';

CREATE TABLE app.avaliacoes (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  aluno_id TEXT NOT NULL,
  bimestre INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  leitura_nivel TEXT,
  leitura INTEGER,
  escrita INTEGER,
  logica_matematica INTEGER,
  oralidade INTEGER,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT avaliacoes_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT avaliacoes_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT avaliacoes_aluno_periodo_unique
    UNIQUE (escola_id, aluno_id, bimestre, ano),
  CONSTRAINT avaliacoes_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT avaliacoes_bimestre_valido CHECK (bimestre BETWEEN 1 AND 4),
  CONSTRAINT avaliacoes_ano_valido CHECK (ano BETWEEN 1900 AND 2200),
  CONSTRAINT avaliacoes_leitura_valida CHECK (leitura IS NULL OR leitura BETWEEN 1 AND 4),
  CONSTRAINT avaliacoes_escrita_valida CHECK (escrita IS NULL OR escrita BETWEEN 1 AND 4),
  CONSTRAINT avaliacoes_logica_valida CHECK (
    logica_matematica IS NULL OR logica_matematica BETWEEN 1 AND 4
  ),
  CONSTRAINT avaliacoes_oralidade_valida CHECK (
    oralidade IS NULL OR oralidade BETWEEN 1 AND 4
  )
);

CREATE INDEX avaliacoes_aluno_idx
  ON app.avaliacoes (escola_id, aluno_id, ano DESC, bimestre DESC);

CREATE TABLE app.eventos (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  tipo TEXT,
  local TEXT,
  responsavel TEXT,
  descricao TEXT,
  turmas_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT eventos_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT eventos_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT eventos_titulo_nao_vazio CHECK (btrim(titulo) <> ''),
  CONSTRAINT eventos_horario_valido CHECK (
    hora_inicio IS NULL OR hora_fim IS NULL OR hora_fim > hora_inicio
  ),
  CONSTRAINT eventos_turmas_json_array CHECK (
    turmas_json IS NULL OR jsonb_typeof(turmas_json) = 'array'
  )
);

CREATE INDEX eventos_data_idx ON app.eventos (escola_id, data, hora_inicio);

CREATE TABLE app.mural_posts (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  autor TEXT NOT NULL,
  cargo TEXT,
  tipo TEXT,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  data TEXT,
  fixado BOOLEAN NOT NULL DEFAULT FALSE,
  likes INTEGER NOT NULL DEFAULT 0,
  comentarios INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT mural_posts_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT mural_posts_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT mural_posts_autor_nao_vazio CHECK (btrim(autor) <> ''),
  CONSTRAINT mural_posts_titulo_nao_vazio CHECK (btrim(titulo) <> ''),
  CONSTRAINT mural_posts_conteudo_nao_vazio CHECK (btrim(conteudo) <> ''),
  CONSTRAINT mural_posts_likes_nao_negativo CHECK (likes >= 0),
  CONSTRAINT mural_posts_comentarios_nao_negativo CHECK (comentarios >= 0)
);

CREATE INDEX mural_posts_fixado_idx
  ON app.mural_posts (escola_id, fixado DESC, created_at DESC);

CREATE TABLE app.frequencia (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  aluno_id TEXT NOT NULL,
  turma_id TEXT,
  data DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT TRUE,
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT frequencia_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT frequencia_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT frequencia_turma_fk
    FOREIGN KEY (escola_id, turma_id)
    REFERENCES app.turmas (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (turma_id),
  CONSTRAINT frequencia_aluno_data_unique UNIQUE (escola_id, aluno_id, data),
  CONSTRAINT frequencia_id_nao_vazio CHECK (btrim(id) <> '')
);

CREATE INDEX frequencia_aluno_data_idx
  ON app.frequencia (escola_id, aluno_id, data DESC);
CREATE INDEX frequencia_turma_data_idx
  ON app.frequencia (escola_id, turma_id, data DESC)
  WHERE turma_id IS NOT NULL;

CREATE TABLE app.notas_fiscais (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  numero TEXT,
  data DATE NOT NULL,
  cliente TEXT NOT NULL,
  cpf_cnpj TEXT,
  valor NUMERIC(12,2) NOT NULL,
  servico TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente',
  venda_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT notas_fiscais_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT notas_fiscais_venda_fk
    FOREIGN KEY (escola_id, venda_id)
    REFERENCES app.vendas (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (venda_id),
  CONSTRAINT notas_fiscais_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT notas_fiscais_cliente_nao_vazio CHECK (btrim(cliente) <> ''),
  CONSTRAINT notas_fiscais_valor_nao_negativo CHECK (valor >= 0),
  CONSTRAINT notas_fiscais_status_valido CHECK (
    status IN ('Emitida', 'Cancelada', 'Pendente', 'Rejeitada')
  )
);

CREATE UNIQUE INDEX notas_fiscais_numero_unique
  ON app.notas_fiscais (escola_id, numero)
  WHERE numero IS NOT NULL AND btrim(numero) <> '';
CREATE INDEX notas_fiscais_data_idx
  ON app.notas_fiscais (escola_id, data DESC);

CREATE TABLE app.kanban_cards (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  coluna_id TEXT NOT NULL,
  turma_id TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  prazo DATE,
  responsavel TEXT,
  cor TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT kanban_cards_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT kanban_cards_turma_fk
    FOREIGN KEY (escola_id, turma_id)
    REFERENCES app.turmas (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (turma_id),
  CONSTRAINT kanban_cards_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT kanban_cards_coluna_nao_vazia CHECK (btrim(coluna_id) <> ''),
  CONSTRAINT kanban_cards_titulo_nao_vazio CHECK (btrim(titulo) <> ''),
  CONSTRAINT kanban_cards_ordem_nao_negativa CHECK (ordem >= 0)
);

CREATE INDEX kanban_cards_coluna_ordem_idx
  ON app.kanban_cards (escola_id, coluna_id, ordem);

CREATE TABLE app.biblioteca_livros (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  autor TEXT,
  isbn TEXT,
  categoria TEXT,
  faixa_etaria TEXT,
  exemplares INTEGER NOT NULL DEFAULT 1,
  disponiveis INTEGER NOT NULL DEFAULT 1,
  emprestados INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT biblioteca_livros_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT biblioteca_livros_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT biblioteca_livros_titulo_nao_vazio CHECK (btrim(titulo) <> ''),
  CONSTRAINT biblioteca_livros_exemplares_nao_negativo CHECK (exemplares >= 0),
  CONSTRAINT biblioteca_livros_disponiveis_nao_negativo CHECK (disponiveis >= 0),
  CONSTRAINT biblioteca_livros_emprestados_nao_negativo CHECK (emprestados >= 0),
  CONSTRAINT biblioteca_livros_totais_coerentes CHECK (
    disponiveis + emprestados <= exemplares
  )
);

CREATE UNIQUE INDEX biblioteca_livros_isbn_unique
  ON app.biblioteca_livros (escola_id, isbn)
  WHERE isbn IS NOT NULL AND btrim(isbn) <> '';
CREATE INDEX biblioteca_livros_titulo_idx
  ON app.biblioteca_livros (escola_id, titulo);

CREATE TABLE app.biblioteca_emprestimos (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  livro_id TEXT NOT NULL,
  aluno_nome TEXT NOT NULL,
  turma TEXT,
  data_emprestimo DATE NOT NULL,
  data_devolucao_prevista DATE,
  status TEXT NOT NULL DEFAULT 'Em andamento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT biblioteca_emprestimos_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT biblioteca_emprestimos_livro_fk
    FOREIGN KEY (escola_id, livro_id)
    REFERENCES app.biblioteca_livros (escola_id, id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT biblioteca_emprestimos_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT biblioteca_emprestimos_aluno_nao_vazio CHECK (btrim(aluno_nome) <> ''),
  CONSTRAINT biblioteca_emprestimos_status_valido CHECK (
    status IN ('Em andamento', 'Devolvido', 'Atrasado')
  ),
  CONSTRAINT biblioteca_emprestimos_datas_validas CHECK (
    data_devolucao_prevista IS NULL OR data_devolucao_prevista >= data_emprestimo
  )
);

CREATE INDEX biblioteca_emprestimos_status_idx
  ON app.biblioteca_emprestimos (escola_id, status, data_devolucao_prevista);
CREATE INDEX biblioteca_emprestimos_livro_idx
  ON app.biblioteca_emprestimos (escola_id, livro_id);

CREATE TABLE app.bercario_bebes (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  idade_meses INTEGER,
  responsavel TEXT,
  professora TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT bercario_bebes_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT bercario_bebes_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT bercario_bebes_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT bercario_bebes_idade_valida CHECK (
    idade_meses IS NULL OR idade_meses BETWEEN 0 AND 72
  )
);

CREATE INDEX bercario_bebes_nome_idx
  ON app.bercario_bebes (escola_id, nome);

CREATE TABLE app.bercario_registros (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  bebe_id TEXT NOT NULL,
  data DATE NOT NULL,
  hora TIME,
  tipo TEXT NOT NULL,
  detalhes TEXT,
  registrado_por TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT bercario_registros_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT bercario_registros_bebe_fk
    FOREIGN KEY (escola_id, bebe_id)
    REFERENCES app.bercario_bebes (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT bercario_registros_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT bercario_registros_tipo_nao_vazio CHECK (btrim(tipo) <> '')
);

CREATE INDEX bercario_registros_data_idx
  ON app.bercario_registros (escola_id, data DESC, bebe_id, hora DESC);

CREATE TABLE app.cardapio_semana (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  data DATE NOT NULL,
  dia_semana TEXT,
  refeicoes_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT cardapio_semana_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT cardapio_semana_data_unique UNIQUE (escola_id, data),
  CONSTRAINT cardapio_semana_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT cardapio_semana_refeicoes_array CHECK (
    jsonb_typeof(refeicoes_json) = 'array'
  )
);

CREATE INDEX cardapio_semana_data_idx
  ON app.cardapio_semana (escola_id, data);

CREATE TABLE app.reservas (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  espaco TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  responsavel TEXT,
  motivo TEXT,
  status TEXT NOT NULL DEFAULT 'Confirmada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT reservas_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT reservas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT reservas_espaco_nao_vazio CHECK (btrim(espaco) <> ''),
  CONSTRAINT reservas_horario_valido CHECK (
    hora_inicio IS NULL OR hora_fim IS NULL OR hora_fim > hora_inicio
  )
);

CREATE INDEX reservas_data_espaco_idx
  ON app.reservas (escola_id, data, espaco, hora_inicio);

CREATE TABLE app.transporte_rotas (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  motorista TEXT,
  monitora TEXT,
  veiculo TEXT,
  placa TEXT,
  capacidade INTEGER NOT NULL DEFAULT 0,
  alunos_atuais INTEGER NOT NULL DEFAULT 0,
  bairros_json JSONB,
  horario_saida TEXT,
  horario_retorno TEXT,
  alunos_ids_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT transporte_rotas_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT transporte_rotas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT transporte_rotas_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT transporte_rotas_capacidade_nao_negativa CHECK (capacidade >= 0),
  CONSTRAINT transporte_rotas_alunos_nao_negativo CHECK (alunos_atuais >= 0),
  CONSTRAINT transporte_rotas_lotacao_valida CHECK (alunos_atuais <= capacidade),
  CONSTRAINT transporte_rotas_bairros_array CHECK (
    bairros_json IS NULL OR jsonb_typeof(bairros_json) = 'array'
  ),
  CONSTRAINT transporte_rotas_alunos_array CHECK (
    alunos_ids_json IS NULL OR jsonb_typeof(alunos_ids_json) = 'array'
  )
);

CREATE UNIQUE INDEX transporte_rotas_placa_unique
  ON app.transporte_rotas (escola_id, placa)
  WHERE placa IS NOT NULL AND btrim(placa) <> '';
CREATE INDEX transporte_rotas_nome_idx
  ON app.transporte_rotas (escola_id, nome);

CREATE TABLE app.patrimonio (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  item TEXT NOT NULL,
  categoria TEXT,
  local TEXT,
  valor NUMERIC(12,2),
  data_compra DATE,
  estado TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT patrimonio_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT patrimonio_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT patrimonio_item_nao_vazio CHECK (btrim(item) <> ''),
  CONSTRAINT patrimonio_valor_nao_negativo CHECK (valor IS NULL OR valor >= 0)
);

CREATE INDEX patrimonio_item_idx ON app.patrimonio (escola_id, item);
CREATE INDEX patrimonio_categoria_idx ON app.patrimonio (escola_id, categoria);

CREATE TABLE app.crm_leads (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome_responsavel TEXT NOT NULL,
  nome_crianca TEXT,
  idade_crianca INTEGER,
  serie_interesse TEXT,
  telefone TEXT,
  email TEXT,
  origem TEXT,
  estagio TEXT NOT NULL DEFAULT 'Lead',
  data_primeiro_contato DATE,
  proxima_acao TEXT,
  proxima_data TEXT,
  responsavel_comercial TEXT,
  valor_potencial NUMERIC(12,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT crm_leads_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT crm_leads_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT crm_leads_responsavel_nao_vazio CHECK (btrim(nome_responsavel) <> ''),
  CONSTRAINT crm_leads_idade_valida CHECK (
    idade_crianca IS NULL OR idade_crianca BETWEEN 0 AND 25
  ),
  CONSTRAINT crm_leads_valor_nao_negativo CHECK (
    valor_potencial IS NULL OR valor_potencial >= 0
  )
);

CREATE INDEX crm_leads_estagio_idx
  ON app.crm_leads (escola_id, estagio, data_primeiro_contato DESC);
CREATE INDEX crm_leads_proxima_data_idx
  ON app.crm_leads (escola_id, proxima_data);

CREATE TABLE app.conversas (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  responsavel_nome TEXT NOT NULL,
  responsavel_telefone TEXT NOT NULL,
  responsavel_email TEXT,
  aluno_id TEXT,
  aluno_nome TEXT,
  atendente_id TEXT,
  atendente_nome TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  prioridade TEXT NOT NULL DEFAULT 'normal',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMPTZ,
  ultima_mensagem_direcao TEXT,
  nao_lidas_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT conversas_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT conversas_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (aluno_id),
  CONSTRAINT conversas_atendente_fk
    FOREIGN KEY (escola_id, atendente_id)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (atendente_id),
  CONSTRAINT conversas_telefone_unique UNIQUE (escola_id, responsavel_telefone),
  CONSTRAINT conversas_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT conversas_responsavel_nao_vazio CHECK (btrim(responsavel_nome) <> ''),
  CONSTRAINT conversas_telefone_valido CHECK (
    responsavel_telefone ~ '^[0-9]{8,15}$'
  ),
  CONSTRAINT conversas_status_valido CHECK (
    status IN ('aberta', 'em_andamento', 'resolvida', 'arquivada')
  ),
  CONSTRAINT conversas_prioridade_valida CHECK (
    prioridade IN ('baixa', 'normal', 'alta', 'urgente')
  ),
  CONSTRAINT conversas_direcao_valida CHECK (
    ultima_mensagem_direcao IS NULL
    OR ultima_mensagem_direcao IN ('entrada', 'saida')
  ),
  CONSTRAINT conversas_tags_array CHECK (jsonb_typeof(tags) = 'array'),
  CONSTRAINT conversas_nao_lidas_nao_negativo CHECK (nao_lidas_count >= 0)
);

CREATE INDEX conversas_atendente_status_idx
  ON app.conversas (escola_id, atendente_id, status);
CREATE INDEX conversas_status_idx
  ON app.conversas (escola_id, status);
CREATE INDEX conversas_ultima_mensagem_idx
  ON app.conversas (escola_id, ultima_mensagem_em DESC NULLS LAST);

CREATE TABLE app.mensagens (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  conversa_id TEXT NOT NULL,
  direcao TEXT NOT NULL,
  texto TEXT NOT NULL,
  atendente_id TEXT,
  atendente_nome TEXT,
  status TEXT NOT NULL DEFAULT 'enviada',
  midia_url TEXT,
  midia_tipo TEXT,
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT mensagens_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT mensagens_conversa_fk
    FOREIGN KEY (escola_id, conversa_id)
    REFERENCES app.conversas (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT mensagens_atendente_fk
    FOREIGN KEY (escola_id, atendente_id)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (atendente_id),
  CONSTRAINT mensagens_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT mensagens_direcao_valida CHECK (direcao IN ('entrada', 'saida')),
  CONSTRAINT mensagens_texto_nao_vazio CHECK (btrim(texto) <> ''),
  CONSTRAINT mensagens_status_valido CHECK (
    status IN ('rascunho', 'enviada', 'entregue', 'lida', 'falha')
  )
);

CREATE INDEX mensagens_conversa_data_idx
  ON app.mensagens (escola_id, conversa_id, created_at DESC);
CREATE INDEX mensagens_status_idx
  ON app.mensagens (escola_id, status, created_at DESC);

CREATE TABLE app.intercorrencias (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  aluno_id TEXT NOT NULL,
  aluno_nome TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME DEFAULT LOCALTIME,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  temperatura NUMERIC(4,1),
  medicamento_nome TEXT,
  medicamento_dose TEXT,
  registrado_por_id TEXT,
  registrado_por_nome TEXT,
  notificou_pais BOOLEAN NOT NULL DEFAULT FALSE,
  notificado_em TIMESTAMPTZ,
  pais_visualizaram BOOLEAN NOT NULL DEFAULT FALSE,
  pais_visualizaram_em TIMESTAMPTZ,
  observacoes_pais TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT intercorrencias_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT intercorrencias_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT intercorrencias_registrado_por_fk
    FOREIGN KEY (escola_id, registrado_por_id)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (registrado_por_id),
  CONSTRAINT intercorrencias_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT intercorrencias_aluno_nome_nao_vazio CHECK (btrim(aluno_nome) <> ''),
  CONSTRAINT intercorrencias_tipo_valido CHECK (
    tipo IN (
      'febre', 'queda', 'medicamento', 'mal_estar', 'alergia', 'higiene',
      'comportamento', 'outros'
    )
  ),
  CONSTRAINT intercorrencias_descricao_nao_vazia CHECK (btrim(descricao) <> ''),
  CONSTRAINT intercorrencias_temperatura_valida CHECK (
    temperatura IS NULL OR temperatura BETWEEN 20.0 AND 50.0
  ),
  CONSTRAINT intercorrencias_notificacao_coerente CHECK (
    notificado_em IS NULL OR notificou_pais
  ),
  CONSTRAINT intercorrencias_visualizacao_coerente CHECK (
    pais_visualizaram_em IS NULL OR pais_visualizaram
  )
);

CREATE INDEX intercorrencias_aluno_data_idx
  ON app.intercorrencias (escola_id, aluno_id, data DESC, hora DESC);
CREATE INDEX intercorrencias_data_idx
  ON app.intercorrencias (escola_id, data DESC, hora DESC);

CREATE TABLE app.recados (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  autor_id TEXT,
  autor_nome TEXT NOT NULL,
  autor_cargo TEXT,
  turma_id TEXT,
  aluno_id TEXT,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  data_limite DATE,
  anexo_url TEXT,
  anexo_tipo TEXT,
  urgente BOOLEAN NOT NULL DEFAULT FALSE,
  pinado BOOLEAN NOT NULL DEFAULT FALSE,
  pais_que_leram JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_destinatarios INTEGER NOT NULL DEFAULT 0,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT recados_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT recados_autor_fk
    FOREIGN KEY (escola_id, autor_id)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (autor_id),
  CONSTRAINT recados_turma_fk
    FOREIGN KEY (escola_id, turma_id)
    REFERENCES app.turmas (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (turma_id),
  CONSTRAINT recados_aluno_fk
    FOREIGN KEY (escola_id, aluno_id)
    REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (aluno_id),
  CONSTRAINT recados_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT recados_autor_nome_nao_vazio CHECK (btrim(autor_nome) <> ''),
  CONSTRAINT recados_tipo_valido CHECK (
    tipo IN ('recado', 'licao_de_casa', 'comunicado', 'evento', 'lembrete')
  ),
  CONSTRAINT recados_titulo_nao_vazio CHECK (btrim(titulo) <> ''),
  CONSTRAINT recados_mensagem_nao_vazia CHECK (btrim(mensagem) <> ''),
  CONSTRAINT recados_pais_que_leram_array CHECK (
    jsonb_typeof(pais_que_leram) = 'array'
  ),
  CONSTRAINT recados_destinatarios_nao_negativo CHECK (total_destinatarios >= 0),
  CONSTRAINT recados_expiracao_valida CHECK (
    expira_em IS NULL OR expira_em > enviado_em
  )
);

CREATE INDEX recados_turma_data_idx
  ON app.recados (escola_id, turma_id, enviado_em DESC)
  WHERE turma_id IS NOT NULL;
CREATE INDEX recados_aluno_data_idx
  ON app.recados (escola_id, aluno_id, enviado_em DESC)
  WHERE aluno_id IS NOT NULL;
CREATE INDEX recados_pinado_data_idx
  ON app.recados (escola_id, pinado DESC, enviado_em DESC);
CREATE INDEX recados_tipo_idx ON app.recados (escola_id, tipo);

CREATE TABLE app.lgpd_solicitacoes (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  detalhes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  resposta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  respondida_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT lgpd_solicitacoes_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT lgpd_solicitacoes_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT lgpd_solicitacoes_tipo_valido CHECK (
    tipo IN ('acesso', 'exclusao', 'correcao', 'portabilidade')
  ),
  CONSTRAINT lgpd_solicitacoes_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT lgpd_solicitacoes_email_valido CHECK (
    btrim(email) <> '' AND position('@' IN email) > 1
  ),
  CONSTRAINT lgpd_solicitacoes_status_valido CHECK (
    status IN ('pendente', 'em_analise', 'concluida', 'rejeitada')
  ),
  CONSTRAINT lgpd_solicitacoes_resposta_coerente CHECK (
    respondida_em IS NULL OR resposta IS NOT NULL
  )
);

CREATE INDEX lgpd_solicitacoes_status_idx
  ON app.lgpd_solicitacoes (escola_id, status, created_at DESC);
CREATE INDEX lgpd_solicitacoes_email_idx
  ON app.lgpd_solicitacoes (escola_id, lower(email), created_at DESC);

CREATE TABLE app.modulos_config (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  grupo TEXT,
  descricao TEXT,
  perfis_permitidos JSONB NOT NULL DEFAULT '["diretor","coordenador"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT modulos_config_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT modulos_config_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT modulos_config_nome_nao_vazio CHECK (btrim(nome) <> ''),
  CONSTRAINT modulos_config_ordem_nao_negativa CHECK (ordem >= 0),
  CONSTRAINT modulos_config_perfis_array CHECK (
    jsonb_typeof(perfis_permitidos) = 'array'
  )
);

CREATE INDEX modulos_config_ativo_ordem_idx
  ON app.modulos_config (escola_id, ativo, ordem);

-- A tenant gets the same module catalog the legacy schema used, but no user.
CREATE FUNCTION app.provisionar_modulos_padrao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $$
BEGIN
  INSERT INTO app.modulos_config (escola_id, id, nome, grupo, ordem, ativo)
  VALUES
    (NEW.id, 'cockpit', 'Cockpit', 'Principal', 1, TRUE),
    (NEW.id, 'despesas', 'Despesas', 'Financeiro', 9, TRUE),
    (NEW.id, 'financeiro', 'Financeiro', 'Financeiro', 10, TRUE),
    (NEW.id, 'vendas', 'Vendas / PDV', 'Financeiro', 11, TRUE),
    (NEW.id, 'nota-fiscal', 'Nota Fiscal', 'Financeiro', 12, TRUE),
    (NEW.id, 'pedagogico', 'Pedagógico', 'Pedagógico', 20, TRUE),
    (NEW.id, 'alunos', 'Alunos', 'Pedagógico', 21, TRUE),
    (NEW.id, 'kanban', 'Kanban', 'Pedagógico', 22, TRUE),
    (NEW.id, 'biblioteca', 'Biblioteca', 'Pedagógico', 23, TRUE),
    (NEW.id, 'bercario', 'Berçário', 'Pedagógico', 24, TRUE),
    (NEW.id, 'saude', 'Saúde', 'Pedagógico', 25, TRUE),
    (NEW.id, 'recados', 'Recados', 'Pedagógico', 26, TRUE),
    (NEW.id, 'calendario', 'Calendário', 'Operacional', 30, TRUE),
    (NEW.id, 'cardapio', 'Cardápio', 'Operacional', 31, TRUE),
    (NEW.id, 'transporte', 'Transporte', 'Operacional', 32, TRUE),
    (NEW.id, 'estoque', 'Estoque', 'Operacional', 33, TRUE),
    (NEW.id, 'reservas', 'Reservas', 'Operacional', 34, TRUE),
    (NEW.id, 'patrimonio', 'Patrimônio', 'Operacional', 35, TRUE),
    (NEW.id, 'whatsapp', 'Atendimento', 'Comunicação', 40, TRUE),
    (NEW.id, 'mural', 'Mural', 'Comunicação', 41, TRUE),
    (NEW.id, 'pais', 'Portal dos Pais', 'Comunicação', 42, TRUE),
    (NEW.id, 'rh', 'RH & Equipe', 'Gestão', 50, TRUE),
    (NEW.id, 'crm', 'CRM Captação', 'Gestão', 51, TRUE),
    (NEW.id, 'relatorios', 'Relatórios', 'Gestão', 52, TRUE),
    (NEW.id, 'frequencia', 'Frequência', 'Gestão', 53, TRUE),
    (NEW.id, 'configuracoes', 'Configurações', 'Sistema', 90, TRUE),
    (NEW.id, 'lgpd', 'LGPD & Auditoria', 'Sistema', 91, TRUE)
  ON CONFLICT (escola_id, id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER escolas_provisionar_modulos
AFTER INSERT OR UPDATE ON app.escolas
FOR EACH ROW
EXECUTE FUNCTION app.provisionar_modulos_padrao();

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE audit.audit_logs (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  usuario_id TEXT,
  usuario_nome TEXT,
  usuario_email TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  registro_id TEXT,
  detalhes JSONB,
  ip TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT audit_logs_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT audit_logs_usuario_fk
    FOREIGN KEY (escola_id, usuario_id)
    REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (usuario_id),
  CONSTRAINT audit_logs_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT audit_logs_acao_valida CHECK (
    acao IN ('criar', 'editar', 'excluir', 'login', 'logout', 'exportar', 'outros')
  ),
  CONSTRAINT audit_logs_entidade_nao_vazia CHECK (btrim(entidade) <> '')
);

CREATE INDEX audit_logs_data_idx
  ON audit.audit_logs (escola_id, created_at DESC);
CREATE INDEX audit_logs_entidade_idx
  ON audit.audit_logs (escola_id, entidade, created_at DESC);
CREATE INDEX audit_logs_usuario_idx
  ON audit.audit_logs (escola_id, usuario_id, created_at DESC)
  WHERE usuario_id IS NOT NULL;
CREATE INDEX audit_logs_registro_idx
  ON audit.audit_logs (escola_id, entidade, registro_id)
  WHERE registro_id IS NOT NULL;

-- Compatibility with the legacy LGPD-specific audit table.
CREATE TABLE audit.lgpd_logs (
  escola_id TEXT NOT NULL,
  id TEXT NOT NULL,
  usuario TEXT,
  acao TEXT NOT NULL,
  entidade TEXT,
  registro_id TEXT,
  detalhes JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT lgpd_logs_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT lgpd_logs_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT lgpd_logs_acao_nao_vazia CHECK (btrim(acao) <> '')
);

CREATE INDEX lgpd_logs_data_idx
  ON audit.lgpd_logs (escola_id, created_at DESC);
CREATE INDEX lgpd_logs_entidade_idx
  ON audit.lgpd_logs (escola_id, entidade, created_at DESC);

CREATE FUNCTION audit.rejeitar_mutacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, audit
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Registros de auditoria são imutáveis';
END;
$$;

CREATE TRIGGER audit_logs_imutaveis
BEFORE UPDATE OR DELETE ON audit.audit_logs
FOR EACH ROW
EXECUTE FUNCTION audit.rejeitar_mutacao();

CREATE TRIGGER lgpd_logs_imutaveis
BEFORE UPDATE OR DELETE ON audit.lgpd_logs
FOR EACH ROW
EXECUTE FUNCTION audit.rejeitar_mutacao();

-- ---------------------------------------------------------------------------
-- Automatic updated_at maintenance and active-record views
-- ---------------------------------------------------------------------------

CREATE FUNCTION app.definir_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  alvo RECORD;
BEGIN
  FOR alvo IN
    SELECT schema_name, table_name
    FROM (VALUES
      ('app', 'escolas'),
      ('iam', 'papeis'),
      ('iam', 'permissoes'),
      ('iam', 'usuarios'),
      ('app', 'funcionarios'),
      ('app', 'turmas'),
      ('app', 'alunos'),
      ('app', 'responsaveis'),
      ('app', 'mensalidades'),
      ('app', 'despesas'),
      ('app', 'vendas'),
      ('app', 'estoque'),
      ('app', 'avaliacoes'),
      ('app', 'eventos'),
      ('app', 'mural_posts'),
      ('app', 'frequencia'),
      ('app', 'notas_fiscais'),
      ('app', 'kanban_cards'),
      ('app', 'biblioteca_livros'),
      ('app', 'biblioteca_emprestimos'),
      ('app', 'bercario_bebes'),
      ('app', 'bercario_registros'),
      ('app', 'cardapio_semana'),
      ('app', 'reservas'),
      ('app', 'transporte_rotas'),
      ('app', 'patrimonio'),
      ('app', 'crm_leads'),
      ('app', 'conversas'),
      ('app', 'mensagens'),
      ('app', 'intercorrencias'),
      ('app', 'recados'),
      ('app', 'lgpd_solicitacoes'),
      ('app', 'modulos_config')
    ) AS tabelas (schema_name, table_name)
  LOOP
    EXECUTE format(
      'CREATE TRIGGER definir_updated_at BEFORE UPDATE ON %I.%I '
      'FOR EACH ROW EXECUTE FUNCTION app.definir_updated_at()',
      alvo.schema_name,
      alvo.table_name
    );
  END LOOP;
END;
$$;

CREATE VIEW app.alunos_ativos
WITH (security_invoker = TRUE, security_barrier = TRUE)
AS
SELECT *
FROM app.alunos
WHERE deleted_at IS NULL;

CREATE VIEW app.funcionarios_ativos
WITH (security_invoker = TRUE, security_barrier = TRUE)
AS
SELECT *
FROM app.funcionarios
WHERE deleted_at IS NULL;

COMMENT ON SCHEMA app IS 'Dados operacionais, sempre segregados por escola_id';
COMMENT ON SCHEMA iam IS 'Identidades, RBAC e sessões revogáveis';
COMMENT ON SCHEMA audit IS 'Trilha de auditoria append-only';
COMMENT ON COLUMN iam.sessoes.token_hash IS
  'SHA-256 hexadecimal do token; o token em claro nunca é persistido';
COMMENT ON COLUMN iam.sessoes.auth_version IS
  'Versão copiada do usuário na emissão para invalidar sessões antigas';
COMMENT ON TABLE audit.audit_logs IS
  'Auditoria append-only; UPDATE e DELETE são recusados por trigger';
