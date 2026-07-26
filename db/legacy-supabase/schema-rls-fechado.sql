-- =====================================================
-- FECHAR RLS — Bloquear acesso direto via anon key
-- =====================================================
-- IMPORTANTE: só rode esse SQL DEPOIS de configurar
-- SUPABASE_SERVICE_ROLE_KEY no Vercel. Senão o sistema
-- para de funcionar (a anon key perde acesso).
-- =====================================================

-- Remove todas as policies "anon_all" (acesso público às tabelas)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'escolas','turmas','alunos','mensalidades','despesas','vendas',
    'estoque','avaliacoes','eventos','funcionarios','mural_posts',
    'frequencia','notas_fiscais','kanban_cards','biblioteca_livros',
    'biblioteca_emprestimos','bercario_bebes','bercario_registros',
    'cardapio_semana','reservas','transporte_rotas','patrimonio',
    'crm_leads','lgpd_logs','usuarios','audit_logs','lgpd_solicitacoes'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all" ON %I;', t);
  END LOOP;
END $$;

-- RLS continua habilitado, MAS sem policies = ninguém com anon/auth pode mexer.
-- service_role bypassa RLS automaticamente, então as APIs continuam funcionando.

-- Verificação útil:
SELECT
  tablename,
  rowsecurity AS rls_habilitado,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = pt.tablename) AS num_policies
FROM pg_tables pt
WHERE schemaname = 'public'
ORDER BY tablename;
