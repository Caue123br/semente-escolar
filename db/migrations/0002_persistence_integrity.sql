-- Persistence integrity and mandatory runtime grants.
-- The migration runner owns the transaction; do not add BEGIN/COMMIT here.

-- Keep the denormalized class counters aligned with active student records.
CREATE FUNCTION app.sincronizar_total_alunos_turma()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE app.turmas
    SET total_alunos = (
      SELECT COUNT(*)::integer
      FROM app.alunos
      WHERE escola_id = OLD.escola_id
        AND turma_id = OLD.turma_id
        AND status = 'Ativo'
        AND deleted_at IS NULL
    )
    WHERE escola_id = OLD.escola_id AND id = OLD.turma_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE app.turmas
    SET total_alunos = (
      SELECT COUNT(*)::integer
      FROM app.alunos
      WHERE escola_id = NEW.escola_id
        AND turma_id = NEW.turma_id
        AND status = 'Ativo'
        AND deleted_at IS NULL
    )
    WHERE escola_id = NEW.escola_id AND id = NEW.turma_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sincronizar_total_alunos_turma
AFTER INSERT OR DELETE OR UPDATE OF escola_id, turma_id, status, deleted_at
ON app.alunos
FOR EACH ROW
EXECUTE FUNCTION app.sincronizar_total_alunos_turma();

UPDATE app.turmas AS turma
SET total_alunos = (
  SELECT COUNT(*)::integer
  FROM app.alunos AS aluno
  WHERE aluno.escola_id = turma.escola_id
    AND aluno.turma_id = turma.id
    AND aluno.status = 'Ativo'
    AND aluno.deleted_at IS NULL
);

-- Public must never inherit access to school, identity or audit records.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app, iam, audit FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app, iam, audit FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app, iam, audit FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app, iam, audit FROM PUBLIC;

-- Production provisioning creates the group role before migrations. Local
-- development intentionally has no cluster-wide Semente roles, so it skips
-- this block while retaining owner access.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') THEN
    EXECUTE format(
      'GRANT CONNECT ON DATABASE %I TO semente_app',
      current_database()
    );
    EXECUTE 'GRANT USAGE ON SCHEMA app, iam, audit TO semente_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO semente_app';
    EXECUTE 'REVOKE DELETE ON app.escolas FROM semente_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON iam.usuarios TO semente_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON iam.sessoes TO semente_app';
    EXECUTE 'GRANT SELECT ON iam.papeis, iam.permissoes, iam.papel_permissoes TO semente_app';
    EXECUTE 'GRANT SELECT, INSERT ON audit.audit_logs, audit.lgpd_logs TO semente_app';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app, iam, audit TO semente_app';
    EXECUTE 'GRANT EXECUTE ON FUNCTION app.definir_updated_at() TO semente_app';
    EXECUTE 'GRANT EXECUTE ON FUNCTION app.provisionar_modulos_padrao() TO semente_app';
    EXECUTE 'GRANT EXECUTE ON FUNCTION app.sincronizar_total_alunos_turma() TO semente_app';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_owner')
     AND EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA iam REVOKE ALL ON TABLES FROM PUBLIC';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA audit REVOKE ALL ON TABLES FROM PUBLIC';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO semente_app';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app, iam, audit REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO semente_app';
  END IF;
END;
$$;
