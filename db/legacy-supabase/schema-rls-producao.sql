-- =====================================================
-- RLS DE PRODUÇÃO (substituir "anon_all" do modo demo)
-- =====================================================
-- App roda 100% via service_role (server-side), portanto
-- bloqueamos COMPLETAMENTE acesso de anon/authenticated direto.
-- Qualquer leitura/escrita PRECISA passar pela API (que valida sessão).
--
-- Pra ativar:
--   1. Faça backup primeiro (vá em /api/exportar)
--   2. Rode esse SQL
--   3. Teste que a app continua funcionando (deve, porque usa service_role)
--   4. Tente abrir a tabela como anon — deve falhar (segurança comprovada)
-- =====================================================

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'escolas','turmas','alunos','mensalidades','despesas','vendas','estoque',
        'avaliacoes','eventos','funcionarios','mural_posts','frequencia',
        'notas_fiscais','kanban_cards','biblioteca_livros','biblioteca_emprestimos',
        'bercario_bebes','bercario_registros','cardapio_semana','reservas',
        'transporte_rotas','patrimonio','crm_leads',
        'usuarios','audit_logs','lgpd_solicitacoes',
        'conversas','mensagens','intercorrencias','recados','modulos_config'
      )
  LOOP
    -- 1. Ativar RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
    -- 2. Remover policies "anon_all" / "auth_all"
    EXECUTE format('DROP POLICY IF EXISTS "anon_all" ON %I', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all" ON %I', t.tablename);
    -- 3. Nenhuma policy criada — service_role bypassa RLS sempre
    --    (anon/authenticated não conseguem mais nada direto)
  END LOOP;
END $$;

SELECT 'RLS fechado em produção. Service_role continua acessando tudo via API.' AS resultado;
