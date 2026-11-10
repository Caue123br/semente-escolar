-- ============================================================================
-- Semente · limpeza dos dados de demonstração antes da primeira matrícula real
-- ============================================================================
-- Roda em UMA transação: ou apaga tudo, ou não apaga nada.
--
-- PRESERVA de propósito:
--   app.escolas          — o cadastro da escola (nome, CNPJ, endereço)
--   app.modulos_config   — quais módulos estão ligados
--   iam.usuarios         — os logins reais (e iam.papeis/permissoes/sessoes)
--   audit.audit_logs     — a trilha de auditoria INTEIRA. Crítico: a linha
--                          'demo-seed-inicial-v1' é o que mantém o botão de
--                          carga fictícia desarmado para sempre. Apagar essa
--                          linha rearma o botão. Não apague.
--   app.solicitacoes_demo — leads reais vindos do site público.
--
-- A ordem abaixo segue o grafo de chaves estrangeiras real do banco.
-- As dependências RESTRICT no caminho são alunos -> turmas,
-- alunos_documentos -> alunos e biblioteca_emprestimos -> biblioteca_livros;
-- todas estão respeitadas.
-- ============================================================================

\set ON_ERROR_STOP on
\timing on

BEGIN;

-- Trava o schema para ninguém escrever durante a limpeza.
-- Falha rápido em vez de pendurar o app se houver operação em curso.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

\echo ''
\echo '=== ANTES DA LIMPEZA ==='
SELECT 'alunos' AS tabela, count(*) FROM app.alunos
UNION ALL SELECT 'turmas',       count(*) FROM app.turmas
UNION ALL SELECT 'funcionarios', count(*) FROM app.funcionarios
UNION ALL SELECT 'mensalidades', count(*) FROM app.mensalidades
UNION ALL SELECT 'cobrancas',    count(*) FROM app.cobrancas
UNION ALL SELECT 'despesas',     count(*) FROM app.despesas
UNION ALL SELECT 'crm_leads',    count(*) FROM app.crm_leads
UNION ALL SELECT '— preservado: usuarios', count(*) FROM iam.usuarios
UNION ALL SELECT '— preservado: audit_logs', count(*) FROM audit.audit_logs
ORDER BY 1;

-- ---------------------------------------------------------------------------
-- Nível 1 — netos: dependem de tabelas que também vão sair
-- ---------------------------------------------------------------------------
DELETE FROM app.bercario_registros;
DELETE FROM app.mensagens;
DELETE FROM app.notas_fiscais;
DELETE FROM app.biblioteca_emprestimos;

-- ---------------------------------------------------------------------------
-- Nível 2 — filhos de aluno / turma
-- ---------------------------------------------------------------------------
DELETE FROM app.avaliacoes;
DELETE FROM app.cobrancas;
DELETE FROM app.mensalidades;
DELETE FROM app.frequencia;
DELETE FROM app.intercorrencias;
DELETE FROM app.responsaveis;
DELETE FROM app.recados;
DELETE FROM app.vendas;
DELETE FROM app.conversas;
DELETE FROM app.bercario_bebes;
DELETE FROM app.biblioteca_livros;
DELETE FROM app.kanban_cards;

-- ---------------------------------------------------------------------------
-- Nível 3 — alunos (RESTRICT em turmas: tem de sair antes das turmas)
-- ---------------------------------------------------------------------------
DELETE FROM app.alunos_documentos;
DELETE FROM app.alunos;

-- ---------------------------------------------------------------------------
-- Nível 4 — turmas
-- ---------------------------------------------------------------------------
DELETE FROM app.turmas;

-- ---------------------------------------------------------------------------
-- Nível 5 — tabelas que só dependem da escola
-- ---------------------------------------------------------------------------
DELETE FROM app.funcionarios;
DELETE FROM app.despesas;
DELETE FROM app.estoque;
DELETE FROM app.eventos;
DELETE FROM app.mural_posts;
DELETE FROM app.patrimonio;
DELETE FROM app.reservas;
DELETE FROM app.transporte_rotas;
DELETE FROM app.cardapio_semana;
DELETE FROM app.crm_leads;
DELETE FROM app.lgpd_solicitacoes;

\echo ''
\echo '=== DEPOIS DA LIMPEZA (tudo zero, menos os preservados) ==='
SELECT 'alunos' AS tabela, count(*) FROM app.alunos
UNION ALL SELECT 'turmas',       count(*) FROM app.turmas
UNION ALL SELECT 'funcionarios', count(*) FROM app.funcionarios
UNION ALL SELECT 'mensalidades', count(*) FROM app.mensalidades
UNION ALL SELECT 'cobrancas',    count(*) FROM app.cobrancas
UNION ALL SELECT 'despesas',     count(*) FROM app.despesas
UNION ALL SELECT 'crm_leads',    count(*) FROM app.crm_leads
UNION ALL SELECT '— preservado: escolas',   count(*) FROM app.escolas
UNION ALL SELECT '— preservado: usuarios',  count(*) FROM iam.usuarios
UNION ALL SELECT '— preservado: modulos',   count(*) FROM app.modulos_config
UNION ALL SELECT '— preservado: audit_logs', count(*) FROM audit.audit_logs
ORDER BY 1;

\echo ''
\echo '=== O marcador que mantém o botão de dados fictícios desarmado ==='
SELECT id, created_at FROM audit.audit_logs WHERE id = 'demo-seed-inicial-v1';

-- ============================================================================
-- Revise os números acima. Se estiver correto, troque a linha final para COMMIT.
-- Enquanto estiver ROLLBACK, este script é um ENSAIO: não altera nada.
-- ============================================================================
ROLLBACK;
