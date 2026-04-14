import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import type { SQL } from "@drizzle-orm";
import {
  DRIZZLE_INTERNALS,
  drizzleAdapter,
  shouldApplyNotNullConstraint,
} from "@/db/drizzle.ts";
import type { DrizzleExecutor } from "@/db/drizzle/types.ts";
import { Entity } from "@/db/entity.ts";
import { field, resolveFieldDefinition } from "@/db/field.ts";
import { Model } from "@/db/model.ts";
import type { ResolvedTableDefinition } from "@/db/types.ts";
import { UuidPrimaryKey } from "@/db/variant.ts";

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey],
  fields: {
    email: field.string().required().unique(),
    age: field.integer().nullable(),
    profile: field.json<Record<string, unknown> | null>().nullable(),
    createdAt: field.datetime().required(),
    isActive: field.boolean().default(true),
  },
});

const UserEntity = Entity.from(UserModel);

const USER_DEFINITION: ResolvedTableDefinition = {
  key: "User",
  model: UserModel,
  entity: UserEntity,
  primaryKey: "id",
  relations: {},
};

const AccountModel = new Model({
  name: "Account",
  table: "accounts",
  fields: {
    id: field.id(),
    publicKey: field.string().column("public_key").required(),
  },
});

const ACCOUNT_DEFINITION: ResolvedTableDefinition = {
  key: "Account",
  model: AccountModel,
  entity: Entity.from(AccountModel),
  primaryKey: "id",
  relations: {},
};

const normalizeSqlText = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const flattenSql = (
  statement: SQL,
): {
  text: string;
  params: unknown[];
} => {
  let text = "";
  const params: unknown[] = [];

  const visit = (chunk: unknown): void => {
    if (
      chunk &&
      typeof chunk === "object" &&
      "queryChunks" in chunk &&
      Array.isArray((chunk as { queryChunks: unknown[] }).queryChunks)
    ) {
      for (
        const nestedChunk of (chunk as { queryChunks: unknown[] }).queryChunks
      ) {
        visit(nestedChunk);
      }

      return;
    }

    if (
      chunk &&
      typeof chunk === "object" &&
      "value" in chunk &&
      Array.isArray((chunk as { value: string[] }).value)
    ) {
      text += (chunk as { value: string[] }).value.join("");
      return;
    }

    params.push(chunk);
    text += "?";
  };

  visit(statement);

  return {
    text: normalizeSqlText(text),
    params,
  };
};

const createFakeExecutor = () => {
  const results: unknown[] = [];
  const transactionResults: unknown[] = [];
  const executed: SQL[] = [];
  const transactionExecuted: SQL[] = [];

  const transactionExecutor: DrizzleExecutor = {
    execute(statement: SQL): Promise<unknown> {
      transactionExecuted.push(statement);
      return Promise.resolve(transactionResults.shift() ?? []);
    },
    transaction<T>(
      operation: (transaction: DrizzleExecutor) => Promise<T>,
    ): Promise<T> {
      return operation(transactionExecutor);
    },
  };

  const executor: DrizzleExecutor = {
    execute(statement: SQL): Promise<unknown> {
      executed.push(statement);
      return Promise.resolve(results.shift() ?? []);
    },
    transaction<T>(
      operation: (transaction: DrizzleExecutor) => Promise<T>,
    ): Promise<T> {
      return operation(transactionExecutor);
    },
  };

  return {
    executor,
    results,
    transactionResults,
    executed,
    transactionExecuted,
  };
};

Deno.test("nullable fields with default(null) do not become NOT NULL", () => {
  const nullableAuditField = resolveFieldDefinition(
    field.uuid().nullable().default(null),
    "actorUserId",
  );

  assertEquals(shouldApplyNotNullConstraint(nullableAuditField), false);
});

Deno.test("required fields still become NOT NULL", () => {
  const requiredField = resolveFieldDefinition(
    field.string().required(),
    "email",
  );

  assertEquals(shouldApplyNotNullConstraint(requiredField), true);
});

Deno.test("Drizzle internals serialize and deserialize datetime and json field values", () => {
  const createdAtField = USER_DEFINITION.model.fields.createdAt;
  const profileField = USER_DEFINITION.model.fields.profile;
  const createdAt = new Date("2026-03-25T12:34:56.000Z");
  const profile = { team: "core", nested: { enabled: true } };

  assertEquals(
    DRIZZLE_INTERNALS.serializeFieldValue(createdAtField, createdAt),
    createdAt.toISOString(),
  );
  assertEquals(
    DRIZZLE_INTERNALS.serializeFieldValue(profileField, profile),
    JSON.stringify(profile),
  );

  const deserializedDate = DRIZZLE_INTERNALS.deserializeFieldValue(
    createdAtField,
    createdAt.toISOString(),
  );
  assert(deserializedDate instanceof Date);
  assertEquals(deserializedDate.toISOString(), createdAt.toISOString());
  assertEquals(
    DRIZZLE_INTERNALS.deserializeFieldValue(
      profileField,
      JSON.stringify(profile),
    ),
    profile,
  );
  assertEquals(
    DRIZZLE_INTERNALS.serializeFieldValue(createdAtField, undefined),
    undefined,
  );
  assertEquals(DRIZZLE_INTERNALS.deserializeFieldValue(createdAtField, null), null);
  assertEquals(
    DRIZZLE_INTERNALS.deserializeFieldValue(undefined, "value"),
    "value",
  );
});

Deno.test("Drizzle internals generate the expected create table statement", () => {
  const statement = DRIZZLE_INTERNALS.createTableStatement(USER_DEFINITION);
  const addColumnStatement = DRIZZLE_INTERNALS.createAddColumnStatement(
    USER_DEFINITION,
    "email",
  );
  const { text } = flattenSql(statement);
  const { text: addColumnText } = flattenSql(addColumnStatement);

  assertStringIncludes(text, 'create table if not exists "users"');
  assertStringIncludes(text, '"id" uuid primary key not null');
  assertStringIncludes(text, '"email" text unique not null');
  assertStringIncludes(text, '"profile" jsonb');
  assertStringIncludes(text, '"createdAt" timestamptz not null');
  assertStringIncludes(
    addColumnText,
    'alter table if exists "users" add column if not exists "email" text unique',
  );
  assertEquals(DRIZZLE_INTERNALS.fieldSqlType(field.id().definition), "uuid");
  assertEquals(DRIZZLE_INTERNALS.fieldSqlType(USER_DEFINITION.model.fields.id), "uuid");
  assertEquals(DRIZZLE_INTERNALS.fieldSqlType(USER_DEFINITION.model.fields.age), "integer");
  assertEquals(DRIZZLE_INTERNALS.fieldSqlType(field.number().definition), "double precision");
  assertEquals(DRIZZLE_INTERNALS.asRows("no-rows"), []);

  const customColumnPredicate = DRIZZLE_INTERNALS.buildFieldPredicate(
    ACCOUNT_DEFINITION,
    "publicKey",
    { eq: "GABC" },
  );
  assert(customColumnPredicate);
  assertStringIncludes(
    flattenSql(customColumnPredicate).text,
    '"public_key" = ?',
  );
});

Deno.test("Drizzle internals build predicates and where/order clauses for supported operators", () => {
  const createdAt = new Date("2026-03-25T12:34:56.000Z");
  const predicate = DRIZZLE_INTERNALS.buildFieldPredicate(
    USER_DEFINITION,
    "email",
    {
      eq: "ada@example.com",
      ne: "other@example.com",
      in: ["ada@example.com", "other@example.com"],
      notIn: ["blocked@example.com"],
      contains: "ada",
      startsWith: "ada",
      endsWith: ".com",
    },
  );
  const emptySetPredicate = DRIZZLE_INTERNALS.buildFieldPredicate(
    USER_DEFINITION,
    "email",
    {
      in: [],
      notIn: [],
    },
  );
  const where = DRIZZLE_INTERNALS.buildWhereClause(USER_DEFINITION, {
    email: {
      eq: "ada@example.com",
      contains: "ada",
    },
    age: {
      gt: 18,
      gte: 21,
      lt: 80,
      lte: 65,
    },
    createdAt,
    isActive: true,
    AND: [{ id: { eq: "user-1" } }],
    OR: [{ email: { eq: "root@example.com" } }],
    NOT: [{ email: { eq: "blocked@example.com" } }],
  });
  const orderBy = DRIZZLE_INTERNALS.buildOrderByClause(USER_DEFINITION, [
    { email: "desc" },
    { createdAt: "asc" },
  ]);

  assert(predicate);
  const predicateSql = flattenSql(predicate);
  assertStringIncludes(predicateSql.text, '"email" = ?');
  assertStringIncludes(predicateSql.text, '"email" <> ?');
  assertStringIncludes(predicateSql.text, '"email" in (?, ?)');
  assertStringIncludes(predicateSql.text, '"email" not in (?)');
  assertStringIncludes(predicateSql.text, '"email" like ?');

  assert(emptySetPredicate);
  const emptySetSql = flattenSql(emptySetPredicate);
  assertStringIncludes(emptySetSql.text, "1 = 0");
  assertStringIncludes(emptySetSql.text, "1 = 1");

  assert(where);
  const whereSql = flattenSql(where);
  assertStringIncludes(whereSql.text, '"age" > ?');
  assertStringIncludes(whereSql.text, '"age" >= ?');
  assertStringIncludes(whereSql.text, '"age" < ?');
  assertStringIncludes(whereSql.text, '"age" <= ?');
  assertStringIncludes(whereSql.text, "not (");
  assert(whereSql.params.includes(createdAt.toISOString()));

  assert(orderBy);
  const orderBySql = flattenSql(orderBy);
  assertStringIncludes(orderBySql.text, '"email" desc');
  assertStringIncludes(orderBySql.text, '"createdAt" asc');

  assertEquals(
    DRIZZLE_INTERNALS.buildFieldPredicate(USER_DEFINITION, "email", {}),
    null,
  );
  const isNullFalse = DRIZZLE_INTERNALS.buildFieldPredicate(
    USER_DEFINITION,
    "email",
    { isNull: false },
  );
  assert(isNullFalse);
  assertStringIncludes(flattenSql(isNullFalse).text, '"email" is not null');
  assertEquals(DRIZZLE_INTERNALS.buildWhereClause(USER_DEFINITION), null);
  assertEquals(DRIZZLE_INTERNALS.buildWhereClause(USER_DEFINITION, {}), null);
  assertEquals(DRIZZLE_INTERNALS.buildOrderByClause(USER_DEFINITION), null);
  assertEquals(
    DRIZZLE_INTERNALS.buildOrderByClause(USER_DEFINITION, [{}]),
    null,
  );
  const isNullTrue = DRIZZLE_INTERNALS.buildFieldPredicate(
    USER_DEFINITION,
    "email",
    { isNull: true },
  );
  assert(isNullTrue);
  assertStringIncludes(flattenSql(isNullTrue).text, '"email" is null');
  const coercedStartsWith = DRIZZLE_INTERNALS.buildFieldPredicate(
    USER_DEFINITION,
    "email",
    { startsWith: 12 as never },
  );
  assert(coercedStartsWith);
  assertStringIncludes(flattenSql(coercedStartsWith).text, '"email" like ?');
  const coercedEndsWith = DRIZZLE_INTERNALS.buildFieldPredicate(
    USER_DEFINITION,
    "email",
    { endsWith: 12 as never },
  );
  assert(coercedEndsWith);
  assertStringIncludes(flattenSql(coercedEndsWith).text, '"email" like ?');
  const coercedContains = DRIZZLE_INTERNALS.buildFieldPredicate(
    USER_DEFINITION,
    "email",
    { contains: 12 as never },
  );
  assert(coercedContains);
  assertStringIncludes(flattenSql(coercedContains).text, '"email" like ?');
});

Deno.test("Drizzle runtime executes CRUD statements, normalizes rows, and reuses the transaction scope", async () => {
  const {
    executor,
    results,
    transactionResults,
    executed,
    transactionExecuted,
  } = createFakeExecutor();
  let prepareCalls = 0;
  const runtime = DRIZZLE_INTERNALS.createRuntime(
    executor,
    [USER_DEFINITION],
    () => {
      prepareCalls += 1;
      return Promise.resolve();
    },
  );
  const createdAt = "2026-03-25T12:34:56.000Z";

  results.push([
    {
      id: "user-1",
      email: "ada@example.com",
      age: 42,
      profile: JSON.stringify({ team: "core" }),
      createdAt,
      isActive: true,
    },
  ]);
  const foundById = await runtime.findById("User", { id: "user-1" });
  assert(foundById);
  assert(foundById.createdAt instanceof Date);
  assertEquals(foundById.profile, { team: "core" });

  const findByIdSql = flattenSql(executed[0]!);
  assertStringIncludes(findByIdSql.text, 'select * from "users"');
  assertStringIncludes(findByIdSql.text, 'where "id" = ?');

  results.push([]);
  assertEquals(await runtime.findById("User", { id: "missing-user" }), null);

  results.push([
    {
      id: "user-find-one",
      email: "findone@example.com",
      age: 27,
      profile: JSON.stringify({ team: "find" }),
      createdAt,
      isActive: true,
    },
  ]);
  assertEquals(
    (
      await runtime.findOne("User", {
        where: { email: { eq: "findone@example.com" } },
      })
    )?.email,
    "findone@example.com",
  );

  results.push([]);
  assertEquals(
    await runtime.findOne("User", {
      where: { email: { eq: "missing@example.com" } },
    }),
    null,
  );
  results.push([]);
  assertEquals(await runtime.findMany("User"), []);

  results.push({
    rows: [
      {
        id: "user-2",
        email: "root@example.com",
        age: null,
        profile: JSON.stringify({ team: "ops" }),
        createdAt,
        isActive: false,
      },
    ],
  });
  const listed = await runtime.findMany("User", {
    where: {
      email: {
        startsWith: "root",
      },
    },
    orderBy: [{ email: "desc" }],
    limit: 5,
    offset: 10,
  });
  assertEquals(listed.length, 1);
  assertEquals(listed[0]?.profile, { team: "ops" });

  const findManySql = flattenSql(executed[5]!);
  assertStringIncludes(findManySql.text, 'order by "email" desc');
  assertStringIncludes(findManySql.text, "limit ?");
  assertStringIncludes(findManySql.text, "offset ?");

  const createDate = new Date("2026-03-26T00:00:00.000Z");
  results.push([
    {
      id: "user-3",
      email: "new@example.com",
      age: 30,
      profile: JSON.stringify({ team: "new" }),
      createdAt: createDate.toISOString(),
      isActive: true,
    },
  ]);
  const created = await runtime.create("User", {
    id: "user-3",
    email: "new@example.com",
    age: 30,
    profile: { team: "new" },
    createdAt: createDate,
    isActive: true,
  });
  assertEquals(created.profile, { team: "new" });
  assert(created.createdAt instanceof Date);

  const createSql = flattenSql(executed[6]!);
  assertStringIncludes(createSql.text, 'insert into "users"');
  assert(createSql.params.includes(createDate.toISOString()));
  assert(createSql.params.includes(JSON.stringify({ team: "new" })));

  results.push([
    {
      id: "user-3",
      email: "updated@example.com",
      age: 31,
      profile: JSON.stringify({ team: "updated" }),
      createdAt,
      isActive: true,
    },
  ]);
  const updated = await runtime.updateById("User", "user-3", {
    email: "updated@example.com",
    age: 31,
    profile: { team: "updated" },
  });
  assert(updated);
  assertEquals(updated.profile, { team: "updated" });

  const updateSql = flattenSql(executed[7]!);
  assertStringIncludes(updateSql.text, 'update "users"');
  assertStringIncludes(updateSql.text, 'where "id" = ?');

  results.push([
    {
      id: "user-4",
      email: "fallback@example.com",
      age: null,
      profile: null,
      createdAt,
      isActive: true,
    },
  ]);
  const fallback = await runtime.updateById("User", "user-4", {});
  assertEquals(fallback?.email, "fallback@example.com");
  const fallbackSql = flattenSql(executed[8]!);
  assertStringIncludes(fallbackSql.text, 'select * from "users"');

  results.push([
    {
      id: "user-3",
      email: "updated@example.com",
      age: 31,
      profile: JSON.stringify({ team: "updated" }),
      createdAt,
      isActive: true,
    },
  ]);
  const deleted = await runtime.deleteById("User", "user-3");
  assertEquals(deleted?.email, "updated@example.com");
  const deleteSql = flattenSql(executed[9]!);
  assertStringIncludes(deleteSql.text, 'delete from "users"');

  results.push([]);
  assertEquals(await runtime.updateById("User", "missing", {
    email: "missing@example.com",
  }), null);

  results.push([]);
  assertEquals(await runtime.deleteById("User", "missing"), null);

  results.push([]);
  await assertRejects(
    () =>
      runtime.create("User", {
        id: "user-empty",
        email: "empty@example.com",
        createdAt: createDate,
      }),
    Error,
    "Insert into User returned no rows.",
  );

  transactionResults.push([
    {
      id: "user-tx",
      email: "tx@example.com",
      age: 50,
      profile: JSON.stringify({ team: "tx" }),
      createdAt,
      isActive: true,
    },
  ]);
  const transactionResult = await runtime.transaction(async (transaction) => {
    return await transaction.create("User", {
      id: "user-tx",
      email: "tx@example.com",
      age: 50,
      profile: { team: "tx" },
      createdAt: new Date(createdAt),
      isActive: true,
    });
  });
  assertEquals(transactionResult.profile, { team: "tx" });
  assertEquals(transactionExecuted.length, 1);
  assert(prepareCalls >= 6);
});

Deno.test("Drizzle prepare helpers create tables once and reuse prepared runtimes", async () => {
  const { executor, executed } = createFakeExecutor();

  const prepare = DRIZZLE_INTERNALS.createPrepare(executor, [USER_DEFINITION]);
  await Promise.all([prepare(), prepare()]);
  await prepare();

  assertEquals(
    executed.length,
    1 + Object.keys(USER_DEFINITION.model.fields).length - 1,
  );

  const runtime = DRIZZLE_INTERNALS.createPreparedRuntime(executor, [
    USER_DEFINITION,
  ]);
  await runtime.prepare();
  await runtime.prepare();

  assertEquals(
    executed.length,
    2 * (1 + Object.keys(USER_DEFINITION.model.fields).length - 1),
  );
});

Deno.test("Drizzle lazy executors instantiate the executor once and delegate execute and transaction calls", async () => {
  const calls: string[] = [];
  let factoryCalls = 0;
  const transactionExecutor: DrizzleExecutor = {
    execute: () => {
      calls.push("tx-execute");
      return Promise.resolve([]);
    },
    transaction: async <T>(
      operation: (transaction: DrizzleExecutor) => Promise<T>,
    ) => await operation(transactionExecutor),
  };

  const lazy = DRIZZLE_INTERNALS.createLazyExecutor(() => {
    factoryCalls += 1;

    return {
      execute: () => {
        calls.push("execute");
        return Promise.resolve([]);
      },
      transaction: async <T>(
        operation: (transaction: DrizzleExecutor) => Promise<T>,
      ) => {
        calls.push("transaction");
        return await operation(transactionExecutor);
      },
    };
  });

  await lazy.execute({} as SQL);
  await lazy.transaction(async (executor) => {
    await executor.execute({} as SQL);
    return "ok";
  });

  assertEquals(factoryCalls, 1);
  assertEquals(calls, ["execute", "transaction", "tx-execute"]);
});

Deno.test("Drizzle runtime throws for unknown table registrations and unsupported dialects", async () => {
  const { executor } = createFakeExecutor();
  const runtime = DRIZZLE_INTERNALS.createRuntime(
    executor,
    [USER_DEFINITION],
    () => Promise.resolve(),
  );

  await assertRejects(
    async () => {
      await runtime.findMany("Unknown");
    },
    TypeError,
    'Unknown Drizzle table registration "Unknown".',
  );

  const adapter = drizzleAdapter({
    dialect: "sqlite" as never,
    client: null as never,
  });

  assertThrows(
    () => adapter.bind([USER_DEFINITION]),
    TypeError,
    'Unsupported Drizzle dialect "sqlite".',
  );

  const postgresRuntime = drizzleAdapter({
    dialect: "postgres",
    client: {} as never,
  }).bind([USER_DEFINITION]);
  assertEquals(typeof postgresRuntime.prepare, "function");
});


Deno.test("Drizzle internals falls back to object fieldName if column is undefined", () => {
  const ModelWithoutColumn = new Model({
    name: "MissingCol",
    table: "missing_col",
    uses: [UuidPrimaryKey],
    fields: {
      weirdField: field.string(),
    },
  });
  
  const hackedField = { ...ModelWithoutColumn.fields.weirdField };
  delete (hackedField as any).column;
  
  const def = {
    key: "MissingCol",
    model: {
      ...ModelWithoutColumn,
      fields: {
        weirdField: hackedField,
      }
    },
    entity: Entity.from(ModelWithoutColumn),
    primaryKey: "id",
    relations: {},
  } as any;

  const predicate = DRIZZLE_INTERNALS.buildFieldPredicate(def, "weirdField", { eq: "value" });
  assert(predicate);
  const sql = flattenSql(predicate);
  assertStringIncludes(sql.text, '"weirdField" = ?');
});

Deno.test("Drizzle internals falls back to the requested field name when the field is missing", () => {
  const definition = {
    ...USER_DEFINITION,
    model: {
      ...USER_DEFINITION.model,
      fields: {
        id: USER_DEFINITION.model.fields.id,
      },
    },
  } as any;

  const predicate = DRIZZLE_INTERNALS.buildFieldPredicate(
    definition,
    "nonExistentField",
    { eq: "value" },
  );
  assert(predicate);
  assertStringIncludes(flattenSql(predicate).text, '"nonExistentField" = ?');
});
