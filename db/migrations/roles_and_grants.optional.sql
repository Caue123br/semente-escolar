-- OPTIONAL reporting-role bootstrap kept for operators that need
-- `semente_readonly`. The mandatory `semente_app` runtime grants are applied by
-- the numbered 0002 migration and must not depend on this file.
-- No LOGIN role and no password are created here. This filename intentionally
-- has no numeric prefix, so scripts/migrate.mjs ignores it.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') THEN
    CREATE ROLE semente_app
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_readonly') THEN
    CREATE ROLE semente_readonly
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END;
$$;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO semente_app, semente_readonly',
    current_database()
  );
END;
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app, iam, audit FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app, iam, audit FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app, iam, audit FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app, iam, audit FROM PUBLIC;

GRANT USAGE ON SCHEMA app, iam, audit TO semente_app;
GRANT USAGE ON SCHEMA app TO semente_readonly;
REVOKE ALL ON SCHEMA iam, audit FROM semente_readonly;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA app
  TO semente_app;

-- School deletion cascades through the tenant and is intentionally reserved
-- for an operator/migration role, never the runtime application role.
REVOKE DELETE ON app.escolas FROM semente_app;

GRANT SELECT, INSERT, UPDATE
  ON iam.usuarios
  TO semente_app;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON iam.sessoes
  TO semente_app;

GRANT SELECT
  ON iam.papeis, iam.permissoes, iam.papel_permissoes
  TO semente_app;

GRANT SELECT, INSERT
  ON audit.audit_logs, audit.lgpd_logs
  TO semente_app;

-- The reporting role intentionally has no IAM or audit access. In particular,
-- it cannot read password hashes, session metadata, IPs or LGPD audit details.
REVOKE ALL ON ALL TABLES IN SCHEMA iam, audit FROM semente_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO semente_readonly;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA app, iam, audit
  TO semente_app;

GRANT SELECT
  ON ALL SEQUENCES IN SCHEMA app
  TO semente_readonly;

-- Trigger functions must remain executable by the role performing DML.
GRANT EXECUTE ON FUNCTION app.definir_updated_at() TO semente_app;
GRANT EXECUTE ON FUNCTION app.provisionar_modulos_padrao() TO semente_app;

-- Keep equivalent privileges for objects created by future migrations run by
-- the same migration owner. IAM and audit defaults deliberately remain tighter.
ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA iam
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA audit
  REVOKE ALL ON TABLES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO semente_app;
ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA iam
  REVOKE SELECT, INSERT, UPDATE ON TABLES FROM semente_app;
ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA audit
  GRANT SELECT, INSERT ON TABLES TO semente_app;

ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA iam, audit
  REVOKE SELECT ON TABLES FROM semente_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app
  GRANT SELECT ON TABLES TO semente_readonly;

ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app, iam, audit
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE semente_owner IN SCHEMA app
  GRANT EXECUTE ON FUNCTIONS TO semente_app;

COMMENT ON ROLE semente_app IS
  'Group role for the Semente application; attach a separately managed LOGIN role';
COMMENT ON ROLE semente_readonly IS
  'Group role for read-only reporting; attach a separately managed LOGIN role';
