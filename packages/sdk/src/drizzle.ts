/**
 * Drizzle/Postgres integration entrypoint.
 *
 * @remarks
 * Import from `@curio/sdk/drizzle` when you want the SQL-backed adapter without
 * pulling the Drizzle/Postgres dependency graph into the root SDK surface.
 */
export { drizzleAdapter } from "@/db/drizzle.ts";
export type {
  DrizzleAdapterConfig,
  DrizzleAdapterDialect,
  DrizzleAdapterPostgresConfig,
} from "@/db/drizzle.ts";
