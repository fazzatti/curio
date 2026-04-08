import type { SQL } from "@drizzle-orm";
import type postgres from "@postgres";

export type DrizzleExecutor = {
  execute(statement: SQL): Promise<unknown>;
  transaction<T>(
    operation: (transaction: DrizzleExecutor) => Promise<T>,
  ): Promise<T>;
};

/** Currently supported Drizzle adapter dialects. */
export type DrizzleAdapterDialect = "postgres";

/** Postgres-backed Drizzle adapter configuration. */
export type DrizzleAdapterPostgresConfig = {
  dialect: "postgres";
  client: postgres.Sql<Record<string, never>>;
};

/** Public configuration accepted by `drizzleAdapter(...)`. */
export type DrizzleAdapterConfig = DrizzleAdapterPostgresConfig;
