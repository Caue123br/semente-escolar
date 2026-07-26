import "server-only";

import {
  Pool,
  types,
  type PoolClient,
  type PoolConfig,
  type QueryResultRow,
} from "pg";

// Preserve the string representation expected by the existing mappers.
// node-postgres otherwise converts timestamps to Date objects.
types.setTypeParser(1082, (value) => value); // date
types.setTypeParser(1083, (value) => value); // time
types.setTypeParser(1114, (value) => new Date(`${value}Z`).toISOString());
types.setTypeParser(1184, (value) => new Date(value).toISOString());

type DatabaseError = {
  message: string;
  code?: string;
};

export type DatabaseRow = Record<string, any>;

export type DatabaseResult<T = DatabaseRow[]> = {
  data: T | null;
  error: DatabaseError | null;
  count: number | null;
};

type Operation = "select" | "insert" | "upsert" | "update" | "delete";
type Cardinality = "many" | "single" | "maybeSingle";

type Filter =
  | { kind: "comparison"; column: string; operator: "=" | ">=" | "<="; value: unknown }
  | { kind: "is"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] }
  | { kind: "eqOrNull"; column: string; value: unknown };

type Order = {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
};

const TABLES = {
  escolas: { schema: "app", tenant: false },
  turmas: { schema: "app", tenant: true },
  alunos: { schema: "app", tenant: true },
  responsaveis: { schema: "app", tenant: true },
  mensalidades: { schema: "app", tenant: true },
  despesas: { schema: "app", tenant: true },
  vendas: { schema: "app", tenant: true },
  estoque: { schema: "app", tenant: true },
  avaliacoes: { schema: "app", tenant: true },
  eventos: { schema: "app", tenant: true },
  funcionarios: { schema: "app", tenant: true },
  mural_posts: { schema: "app", tenant: true },
  frequencia: { schema: "app", tenant: true },
  notas_fiscais: { schema: "app", tenant: true },
  kanban_cards: { schema: "app", tenant: true },
  biblioteca_livros: { schema: "app", tenant: true },
  biblioteca_emprestimos: { schema: "app", tenant: true },
  bercario_bebes: { schema: "app", tenant: true },
  bercario_registros: { schema: "app", tenant: true },
  cardapio_semana: { schema: "app", tenant: true },
  reservas: { schema: "app", tenant: true },
  transporte_rotas: { schema: "app", tenant: true },
  patrimonio: { schema: "app", tenant: true },
  crm_leads: { schema: "app", tenant: true },
  solicitacoes_demo: { schema: "app", tenant: true },
  conversas: { schema: "app", tenant: true },
  mensagens: { schema: "app", tenant: true },
  intercorrencias: { schema: "app", tenant: true },
  recados: { schema: "app", tenant: true },
  lgpd_solicitacoes: { schema: "app", tenant: true },
  modulos_config: { schema: "app", tenant: true },
  usuarios: { schema: "iam", tenant: true },
  audit_logs: { schema: "audit", tenant: true },
} as const;

const SOFT_DELETE_TABLES = new Set<DatabaseTable>(["alunos", "funcionarios"]);

export type DatabaseTable = keyof typeof TABLES;

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;

function quoteIdentifier(value: string): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Identificador SQL inválido: ${value}`);
  }
  return `"${value}"`;
}

function tableSql(table: DatabaseTable): string {
  const definition = TABLES[table];
  return `${quoteIdentifier(definition.schema)}.${quoteIdentifier(table)}`;
}

function selectedColumns(value: string): string {
  const columns = value.trim();
  if (columns === "*") return "*";
  return columns
    .split(",")
    .map((column) => quoteIdentifier(column.trim()))
    .join(", ");
}

function databaseError(error: unknown): DatabaseError {
  if (error instanceof Error) {
    const withCode = error as Error & { code?: string };
    // Erros do PostgreSQL podem trazer valores pessoais em `detail` (CPF,
    // e-mail etc.). Registre somente metadados seguros para diagnóstico.
    console.error("[database] operação falhou", {
      name: withCode.name,
      message: withCode.message,
      code: withCode.code,
    });
    return { message: "Falha na operação de banco de dados", code: withCode.code };
  }
  console.error("[database] operação falhou sem detalhes estruturados");
  return { message: "Falha inesperada no banco de dados" };
}

function parameterValue(value: unknown): unknown {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function cleanRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

function positiveIntegerEnv(name: string, fallback: number, maximum: number): number {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function poolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada");
  }

  return {
    connectionString,
    max: positiveIntegerEnv("DATABASE_POOL_MAX", 5, 20),
    idleTimeoutMillis: positiveIntegerEnv("DATABASE_IDLE_TIMEOUT_MS", 30_000, 300_000),
    connectionTimeoutMillis: positiveIntegerEnv("DATABASE_CONNECT_TIMEOUT_MS", 5_000, 30_000),
    statement_timeout: positiveIntegerEnv("DATABASE_STATEMENT_TIMEOUT_MS", 30_000, 120_000),
    application_name: process.env.DATABASE_APPLICATION_NAME ?? "semente-web",
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
  };
}

const globalDatabase = globalThis as typeof globalThis & {
  __sementePostgresPool?: Pool;
};

export function getPostgresPool(): Pool {
  if (!globalDatabase.__sementePostgresPool) {
    const pool = new Pool(poolConfig());
    pool.on("error", (error) => {
      console.error("[database] conexão ociosa falhou", error);
    });
    globalDatabase.__sementePostgresPool = pool;
  }
  return globalDatabase.__sementePostgresPool;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function checkDatabaseConnection(): Promise<void> {
  const { rows } = await getPostgresPool().query(`
    SELECT
      to_regclass('app.alunos') IS NOT NULL
        AND to_regclass('app.turmas') IS NOT NULL
        AND to_regclass('iam.usuarios') IS NOT NULL
        AND to_regclass('iam.sessoes') IS NOT NULL
        AND to_regclass('audit.audit_logs') IS NOT NULL AS schema_ready,
      has_schema_privilege(current_user, 'app', 'USAGE')
        AND has_schema_privilege(current_user, 'iam', 'USAGE')
        AND has_schema_privilege(current_user, 'audit', 'USAGE')
        AND has_table_privilege(current_user, 'app.alunos', 'SELECT,INSERT,UPDATE')
        AND has_table_privilege(current_user, 'app.turmas', 'SELECT,INSERT,UPDATE')
        AND has_table_privilege(current_user, 'iam.usuarios', 'SELECT,INSERT,UPDATE')
        AND has_table_privilege(current_user, 'iam.sessoes', 'SELECT,INSERT,UPDATE,DELETE')
        AND has_table_privilege(current_user, 'audit.audit_logs', 'SELECT,INSERT') AS privileges_ready
  `);
  if (!rows[0]?.schema_ready || !rows[0]?.privileges_ready) {
    throw new Error("Schema ou privilégios do banco incompletos");
  }
}

class QueryBuilder<TData = DatabaseRow[]> implements PromiseLike<DatabaseResult<TData>> {
  private operation: Operation = "select";
  private selection = "*";
  private returning: string | null = null;
  private payload: Record<string, unknown>[] = [];
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private rowLimit: number | null = null;
  private cardinality: Cardinality = "many";
  private conflictColumns: string[] = ["id"];
  private countRequested = false;
  private headOnly = false;
  private execution: Promise<DatabaseResult<TData>> | null = null;

  constructor(
    private readonly table: DatabaseTable,
    private readonly client?: PoolClient
  ) {}

  select(columns = "*", options?: { count?: "exact"; head?: boolean }): this {
    if (this.operation === "select") this.selection = columns;
    else this.returning = columns;
    this.countRequested = options?.count === "exact";
    this.headOnly = options?.head === true;
    return this;
  }

  insert(value: Record<string, unknown> | Record<string, unknown>[]): this {
    this.operation = "insert";
    this.payload = (Array.isArray(value) ? value : [value]).map(cleanRecord);
    return this;
  }

  upsert(
    value: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string }
  ): this {
    this.operation = "upsert";
    this.payload = (Array.isArray(value) ? value : [value]).map(cleanRecord);
    if (options?.onConflict) {
      this.conflictColumns = options.onConflict.split(",").map((column) => column.trim());
    }
    return this;
  }

  update(value: Record<string, unknown>): this {
    this.operation = "update";
    this.payload = [cleanRecord(value)];
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ kind: "comparison", column, operator: "=", value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ kind: "comparison", column, operator: ">=", value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ kind: "comparison", column, operator: "<=", value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push({ kind: "is", column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ kind: "in", column, values });
    return this;
  }

  eqOrNull(column: string, value: unknown): this {
    this.filters.push({ kind: "eqOrNull", column, value });
    return this;
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean }
  ): this {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
      nullsFirst: options?.nullsFirst,
    });
    return this;
  }

  limit(value: number): this {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("LIMIT inválido");
    this.rowLimit = value;
    return this;
  }

  single(): QueryBuilder<DatabaseRow> {
    this.cardinality = "single";
    this.rowLimit = this.rowLimit === null ? 2 : Math.min(this.rowLimit, 2);
    return this as unknown as QueryBuilder<DatabaseRow>;
  }

  maybeSingle(): QueryBuilder<DatabaseRow> {
    this.cardinality = "maybeSingle";
    this.rowLimit = this.rowLimit === null ? 2 : Math.min(this.rowLimit, 2);
    return this as unknown as QueryBuilder<DatabaseRow>;
  }

  then<TResult1 = DatabaseResult<TData>, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResult<TData>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private tenantId(): string {
    return process.env.SCHOOL_ID ?? "default";
  }

  private withTenant(record: Record<string, unknown>): Record<string, unknown> {
    if (!TABLES[this.table].tenant) return record;
    return { ...record, escola_id: this.tenantId() };
  }

  private where(values: unknown[]): string {
    const fragments: string[] = [];
    if (TABLES[this.table].tenant) {
      values.push(this.tenantId());
      fragments.push(`${quoteIdentifier("escola_id")} = $${values.length}`);
    }
    if (SOFT_DELETE_TABLES.has(this.table)) {
      fragments.push(`${quoteIdentifier("deleted_at")} IS NULL`);
    }

    for (const filter of this.filters) {
      if (filter.kind === "comparison") {
        values.push(parameterValue(filter.value));
        fragments.push(
          `${quoteIdentifier(filter.column)} ${filter.operator} $${values.length}`
        );
      } else if (filter.kind === "is") {
        if (filter.value === null) {
          fragments.push(`${quoteIdentifier(filter.column)} IS NULL`);
        } else {
          values.push(parameterValue(filter.value));
          fragments.push(
            `${quoteIdentifier(filter.column)} IS NOT DISTINCT FROM $${values.length}`
          );
        }
      } else if (filter.kind === "in") {
        if (filter.values.length === 0) {
          fragments.push("FALSE");
        } else {
          const placeholders = filter.values.map((value) => {
            values.push(parameterValue(value));
            return `$${values.length}`;
          });
          fragments.push(
            `${quoteIdentifier(filter.column)} IN (${placeholders.join(", ")})`
          );
        }
      } else {
        values.push(parameterValue(filter.value));
        fragments.push(
          `(${quoteIdentifier(filter.column)} = $${values.length} OR ${quoteIdentifier(filter.column)} IS NULL)`
        );
      }
    }

    return fragments.length > 0 ? ` WHERE ${fragments.join(" AND ")}` : "";
  }

  private async execute(): Promise<DatabaseResult<TData>> {
    if (!this.execution) this.execution = this.run();
    return this.execution;
  }

  private async run(): Promise<DatabaseResult<TData>> {
    try {
      const result = await (this.client ?? getPostgresPool()).query(this.sql());
      const rows = result.rows as QueryResultRow[];
      const count = this.headOnly && this.countRequested
        ? Number(rows[0]?.__count ?? 0)
        : this.countRequested
          ? result.rowCount ?? rows.length
          : null;

      if (this.headOnly) return { data: null, error: null, count };

      if (this.cardinality === "single") {
        if (rows.length !== 1) {
          return {
            data: null,
            error: { message: `Esperado um registro, encontrados ${rows.length}` },
            count,
          };
        }
        return { data: rows[0] as TData, error: null, count };
      }

      if (this.cardinality === "maybeSingle") {
        if (rows.length > 1) {
          return {
            data: null,
            error: { message: `Esperado no máximo um registro, encontrados ${rows.length}` },
            count,
          };
        }
        return { data: (rows[0] as TData | undefined) ?? null, error: null, count };
      }

      const returnsRows = this.operation === "select" || this.returning !== null;
      return { data: returnsRows ? (rows as TData) : null, error: null, count };
    } catch (error) {
      return { data: null, error: databaseError(error), count: null };
    }
  }

  private sql(): { text: string; values: unknown[] } {
    if (this.operation === "select") return this.selectSql();
    if (this.operation === "insert" || this.operation === "upsert") {
      return this.insertSql();
    }
    if (this.operation === "update") return this.updateSql();
    return this.deleteSql();
  }

  private selectSql(): { text: string; values: unknown[] } {
    const values: unknown[] = [];
    const projection = this.headOnly && this.countRequested
      ? `COUNT(*)::integer AS ${quoteIdentifier("__count")}`
      : selectedColumns(this.selection);
    let text = `SELECT ${projection} FROM ${tableSql(this.table)}`;
    text += this.where(values);
    if (this.headOnly) return { text, values };
    if (this.orders.length > 0) {
      text += ` ORDER BY ${this.orders
        .map((order) => {
          const direction = order.ascending ? "ASC" : "DESC";
          const nulls =
            order.nullsFirst === undefined
              ? ""
              : order.nullsFirst
                ? " NULLS FIRST"
                : " NULLS LAST";
          return `${quoteIdentifier(order.column)} ${direction}${nulls}`;
        })
        .join(", ")}`;
    }
    if (this.rowLimit !== null) text += ` LIMIT ${this.rowLimit}`;
    return { text, values };
  }

  private insertSql(): { text: string; values: unknown[] } {
    if (this.payload.length === 0) throw new Error("INSERT sem registros");
    const rows = this.payload.map((record) => this.withTenant(record));
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    if (columns.length === 0) throw new Error("INSERT sem colunas");
    columns.forEach(quoteIdentifier);

    const values: unknown[] = [];
    const tuples = rows.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(parameterValue(row[column] ?? null));
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    let text = `INSERT INTO ${tableSql(this.table)} (${columns
      .map(quoteIdentifier)
      .join(", ")}) VALUES ${tuples.join(", ")}`;

    if (this.operation === "upsert") {
      const conflictColumns = TABLES[this.table].tenant
        ? ["escola_id", ...this.conflictColumns.filter((column) => column !== "escola_id")]
        : this.conflictColumns;
      conflictColumns.forEach(quoteIdentifier);
      const updates = columns.filter(
        (column) =>
          !conflictColumns.includes(column) &&
          column !== "id" &&
          column !== "created_at" &&
          column !== "escola_id"
      );
      text += ` ON CONFLICT (${conflictColumns
        .map(quoteIdentifier)
        .join(", ")}) `;
      text +=
        updates.length === 0
          ? "DO NOTHING"
          : `DO UPDATE SET ${updates
              .map(
                (column) =>
                  `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`
              )
              .join(", ")}`;
    }

    if (this.returning) text += ` RETURNING ${selectedColumns(this.returning)}`;
    return { text, values };
  }

  private updateSql(): { text: string; values: unknown[] } {
    if (this.filters.length === 0) throw new Error("UPDATE sem filtro recusado");
    const record = this.payload[0] ?? {};
    const columns = Object.keys(record);
    if (columns.length === 0) throw new Error("UPDATE sem campos");

    const values: unknown[] = [];
    const assignments = columns.map((column) => {
      values.push(parameterValue(record[column]));
      return `${quoteIdentifier(column)} = $${values.length}`;
    });
    let text = `UPDATE ${tableSql(this.table)} SET ${assignments.join(", ")}`;
    text += this.where(values);
    if (this.returning) text += ` RETURNING ${selectedColumns(this.returning)}`;
    return { text, values };
  }

  private deleteSql(): { text: string; values: unknown[] } {
    if (this.filters.length === 0) throw new Error("DELETE sem filtro recusado");
    const values: unknown[] = [];
    let text = `DELETE FROM ${tableSql(this.table)}`;
    text += this.where(values);
    if (this.returning) text += ` RETURNING ${selectedColumns(this.returning)}`;
    return { text, values };
  }
}

export class DatabaseClient {
  constructor(private readonly client?: PoolClient) {}

  from(table: string): QueryBuilder {
    if (!(table in TABLES)) throw new Error(`Tabela não permitida: ${table}`);
    return new QueryBuilder(table as DatabaseTable, this.client);
  }

  async transaction<T>(callback: (database: DatabaseClient) => Promise<T>): Promise<T> {
    if (this.client) return callback(this);

    const client = await getPostgresPool().connect();
    try {
      await client.query("BEGIN");
      const result = await callback(new DatabaseClient(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

const database = new DatabaseClient();

export function getDatabase(): DatabaseClient {
  return database;
}
