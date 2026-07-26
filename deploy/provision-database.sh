#!/usr/bin/env bash
set -Eeuo pipefail
set +x

if [[ ${EUID} -ne 0 ]]; then
  echo "Execute como root." >&2
  exit 1
fi

cluster_version=16
cluster_name=semente
cluster_port=5433
database_name=semente_prod
secrets_file=/etc/semente/db-secrets.env
runtime_env=/etc/semente/app.env
migration_env=/etc/semente/migration.env

if ! id -u semente >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /srv/semente --shell /usr/sbin/nologin semente
fi

install -d -o root -g root -m 0755 /srv/semente /srv/semente/releases
install -d -o root -g semente -m 0750 /srv/semente/shared
install -d -o semente -g semente -m 0700 \
  /srv/semente/shared/uploads \
  /srv/semente/shared/cache
install -d -o root -g root -m 0755 /etc/semente

if [[ ! -s ${secrets_file} ]]; then
  umask 077
  runtime_password=$(openssl rand -hex 32)
  migrator_password=$(openssl rand -hex 32)
  parent_secret=$(openssl rand -hex 48)
  webhook_secret=$(openssl rand -hex 48)
  printf '%s\n' \
    "RUNTIME_DB_PASSWORD=${runtime_password}" \
    "MIGRATOR_DB_PASSWORD=${migrator_password}" \
    "PAIS_SESSION_SECRET_VALUE=${parent_secret}" \
    "WHATSAPP_WEBHOOK_SECRET_VALUE=${webhook_secret}" \
    > "${secrets_file}"
  chmod 0600 "${secrets_file}"
fi

# shellcheck disable=SC1090
source "${secrets_file}"

sudo -u postgres psql -p "${cluster_port}" -d postgres \
  --set=ON_ERROR_STOP=1 <<SQL
SELECT 'CREATE ROLE semente_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS'
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_owner') \gexec

SELECT 'CREATE ROLE semente_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS'
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') \gexec

SELECT 'CREATE ROLE semente_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS'
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_migrator') \gexec

SELECT 'CREATE ROLE semente_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS'
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_runtime') \gexec

ALTER ROLE semente_migrator PASSWORD '${MIGRATOR_DB_PASSWORD}';
ALTER ROLE semente_runtime PASSWORD '${RUNTIME_DB_PASSWORD}';
GRANT semente_owner TO semente_migrator;
GRANT semente_app TO semente_runtime;

SELECT 'CREATE DATABASE ${database_name} OWNER semente_owner TEMPLATE template0 ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_database WHERE datname = '${database_name}') \gexec

REVOKE CONNECT ON DATABASE ${database_name} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${database_name} TO semente_migrator, semente_runtime;

ALTER ROLE semente_runtime IN DATABASE ${database_name} SET statement_timeout = '30s';
ALTER ROLE semente_runtime IN DATABASE ${database_name} SET lock_timeout = '5s';
ALTER ROLE semente_runtime IN DATABASE ${database_name} SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE semente_runtime IN DATABASE ${database_name} SET temp_file_limit = '512MB';
ALTER ROLE semente_runtime IN DATABASE ${database_name} SET search_path = pg_catalog, app, iam, audit;
SQL

umask 077
printf '%s\n' \
  "DATABASE_URL=postgresql://semente_runtime:${RUNTIME_DB_PASSWORD}@127.0.0.1:${cluster_port}/${database_name}" \
  'DATABASE_POOL_MAX=5' \
  'DATABASE_CONNECT_TIMEOUT_MS=5000' \
  'DATABASE_IDLE_TIMEOUT_MS=30000' \
  'DATABASE_STATEMENT_TIMEOUT_MS=30000' \
  'DATABASE_APPLICATION_NAME=semente-web' \
  'DATABASE_SSL=false' \
  'SCHOOL_ID=default' \
  'SESSION_TTL_HOURS=12' \
  'UPLOADS_DIR=/srv/semente/shared/uploads' \
  "PAIS_SESSION_SECRET=${PAIS_SESSION_SECRET_VALUE}" \
  "WHATSAPP_WEBHOOK_SECRET=${WHATSAPP_WEBHOOK_SECRET_VALUE}" \
  'ENABLE_PARENT_PORTAL=false' \
  'ENABLE_DEMO_SEED=false' \
  'NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3002' \
  > "${runtime_env}"
chown root:semente "${runtime_env}"
chmod 0640 "${runtime_env}"

printf '%s\n' \
  "DATABASE_MIGRATION_URL=postgresql://semente_migrator:${MIGRATOR_DB_PASSWORD}@127.0.0.1:${cluster_port}/${database_name}" \
  'DATABASE_MIGRATION_ROLE=semente_owner' \
  'DATABASE_SSL=false' \
  'SCHOOL_ID=default' \
  > "${migration_env}"
chown root:root "${migration_env}"
chmod 0600 "${migration_env}"

unset RUNTIME_DB_PASSWORD MIGRATOR_DB_PASSWORD PAIS_SESSION_SECRET_VALUE WHATSAPP_WEBHOOK_SECRET_VALUE

echo "Banco, roles e arquivos de ambiente do Semente provisionados sem expor credenciais."
