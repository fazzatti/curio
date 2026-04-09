# Drizzle

`@curio/core/drizzle` exposes the SQL-backed adapter used when Curio repositories
should persist through Drizzle and Postgres.

## Public API

- `drizzleAdapter(...)`
- `DrizzleAdapterConfig`
- `DrizzleAdapterDialect`
- `DrizzleAdapterPostgresConfig`

## Example

```ts
import { Database, valibotSchemaAdapter } from "@curio/core";
import { drizzleAdapter } from "@curio/core/drizzle";
import postgres from "@postgres";

const client = postgres(DATABASE_URL);

export const db = Database.create({
  adapter: drizzleAdapter({
    dialect: "postgres",
    client,
  }),
  schemaAdapter: valibotSchemaAdapter,
  tables: databaseTables,
});
```

## Why Drizzle Lives In Its Own Entrypoint

The root core entrypoint should not always pull in the SQL driver and Drizzle
dependency graph.

Keeping Drizzle separate:

- keeps the root surface smaller
- avoids forcing SQL-backed dependencies into every consumer
- makes the happy path explicit for projects that want Postgres

## Generated Template

The default template uses `drizzleAdapter(...)` with Postgres. That reflects the
intended starter path, not a hard requirement for every Curio backend.
