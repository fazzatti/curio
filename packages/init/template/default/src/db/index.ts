import { Database, valibotSchemaAdapter } from "@curio/core";
import { seedDefaultAdminData } from "@curio/core/admin/modules/rbac";
import { drizzleAdapter } from "@curio/core/drizzle";
import postgres from "@postgres";
import { CONFIG } from "@/config/index.ts";
import { databaseTables } from "@/db/tables/index.ts";
import { LOG } from "@/tools/logger/index.ts";

const databaseClient = postgres(CONFIG.database.url, {
  onnotice: () => {},
});

export const db = Database.create({
  adapter: drizzleAdapter({
    dialect: "postgres",
    client: databaseClient,
  }),
  schemaAdapter: valibotSchemaAdapter,
  tables: databaseTables,
});

export const prepareDatabase = async (): Promise<void> => {
  LOG.debug("Preparing Curio database schema", "prepareDatabase");
  await db.prepare();
  LOG.debug("Database schema prepared", "prepareDatabase");
  LOG.debug(
    "Seeding built-in admin roles and permissions",
    "prepareDatabase",
  );
  await seedDefaultAdminData(db);
  LOG.debug(
    "Built-in admin roles and permissions ready",
    "prepareDatabase",
  );
};

export const closeDatabase = async (): Promise<void> => {
  LOG.debug("Ending Postgres client", "closeDatabase");
  await databaseClient.end({ timeout: 5 });
};
