// deno-coverage-ignore-start
import { drizzle } from "@drizzle-orm/postgres-js";
import { type SQL, sql } from "@drizzle-orm";
import type {
  AdapterFindByIdOptions,
  AdapterFindManyOptions,
  AdapterFindOneOptions,
  AdapterRuntime,
  AdapterTransactionScope,
  DatabaseAdapter,
  RawRecord,
  ResolvedTableDefinition,
  WhereClause,
} from "@/db/types.ts";
import type {
  DrizzleAdapterConfig,
  DrizzleExecutor,
} from "@/db/drizzle/types.ts";
// deno-coverage-ignore-stop

export type {
  DrizzleAdapterConfig,
  DrizzleAdapterDialect,
  DrizzleAdapterPostgresConfig,
} from "@/db/drizzle/types.ts";

const quoteIdentifier = (value: string): string =>
  `"${value.replaceAll(`"`, `""`)}"`;

const rawIdentifier = (value: string): SQL => sql.raw(quoteIdentifier(value));

const sqlValueList = (values: unknown[]): SQL =>
  sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );

const serializeFieldValue = (
  field:
    | ResolvedTableDefinition["model"]["fields"][string]
    | undefined,
  value: unknown,
): unknown => {
  if (value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (field?.kind === "json" && value !== null) {
    return JSON.stringify(value);
  }

  return value;
};

const deserializeFieldValue = (
  field:
    | ResolvedTableDefinition["model"]["fields"][string]
    | undefined,
  value: unknown,
): unknown => {
  if (value === null || value === undefined || !field) {
    return value;
  }

  if (field.kind === "datetime" && typeof value === "string") {
    return new Date(value);
  }

  if (field.kind === "json" && typeof value === "string") {
    return JSON.parse(value);
  }

  return value;
};

const fieldSqlType = (
  field: ResolvedTableDefinition["model"]["fields"][string],
): string => {
  switch (field.kind) {
    case "id":
    case "uuid":
      return "uuid";
    case "string":
    case "text":
    case "enum":
      return "text";
    case "boolean":
      return "boolean";
    case "integer":
      return "integer";
    case "number":
      return "double precision";
    case "datetime":
      return "timestamptz";
    case "json":
      return "jsonb";
  }
};

/**
 * Determines whether a generated SQL column should carry a `NOT NULL`
 * constraint.
 *
 * @remarks
 * Nullability is the source of truth here. A field with `.default(null)` must
 * remain nullable in SQL, otherwise inserts that intentionally pass `null`
 * will fail even though the Curio field definition allows it.
 */
export const shouldApplyNotNullConstraint = (
  field: ResolvedTableDefinition["model"]["fields"][string],
): boolean => {
  return field.primaryKey || field.required || !field.nullable;
};

const createTableStatement = (definition: ResolvedTableDefinition): SQL => {
  const columnDefinitions = Object.entries(definition.model.fields).map(
    ([_fieldName, field]) => {
      const parts = [quoteIdentifier(field.column), fieldSqlType(field)];

      if (field.primaryKey) {
        parts.push("primary key");
      }

      if (field.unique && !field.primaryKey) {
        parts.push("unique");
      }

      if (shouldApplyNotNullConstraint(field)) {
        parts.push("not null");
      }

      return parts.join(" ");
    },
  );

  return sql.raw(
    `create table if not exists ${quoteIdentifier(definition.model.table)} (${
      columnDefinitions.join(
        ", ",
      )
    })`,
  );
};

const createAddColumnStatement = (
  definition: ResolvedTableDefinition,
  fieldName: string,
): SQL => {
  const field = definition.model.fields[fieldName];
  const parts = [
    `alter table if exists ${quoteIdentifier(definition.model.table)}`,
    `add column if not exists ${quoteIdentifier(field.column)}`,
    fieldSqlType(field),
  ];

  if (field.unique && !field.primaryKey) {
    parts.push("unique");
  }

  // Additive reconciliation intentionally does not tighten NOT NULL on
  // existing tables. Existing rows may not satisfy the new field yet.
  return sql.raw(parts.join(" "));
};

const asRows = (result: unknown): RawRecord[] => {
  if (Array.isArray(result)) {
    return result as RawRecord[];
  }

  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: RawRecord[] }).rows;
  }

  return [];
};

const columnIdentifier = (
  definition: ResolvedTableDefinition,
  fieldName: string,
): SQL => {
  const field = definition.model.fields[fieldName];
  if (!field) {
    return rawIdentifier(fieldName);
  }
  const columnName = field.column ? field.column : fieldName;

  return rawIdentifier(columnName);
};

const normalizeRow = (
  definition: ResolvedTableDefinition,
  row: RawRecord,
): RawRecord => {
  return Object.fromEntries(
    Object.entries(row).map(([fieldName, value]) => [
      fieldName,
      deserializeFieldValue(definition.model.fields[fieldName], value),
    ]),
  );
};

const buildFieldPredicate = (
  definition: ResolvedTableDefinition,
  fieldName: string,
  operator: unknown,
): SQL | null => {
  const column = columnIdentifier(definition, fieldName);
  const field = definition.model.fields[fieldName];

  if (
    operator === null ||
    typeof operator !== "object" ||
    Array.isArray(operator) ||
    operator instanceof Date
  ) {
    return sql`${column} = ${serializeFieldValue(field, operator)}`;
  }

  const typedOperator = operator as Record<string, unknown>;
  const predicates: SQL[] = [];

  if ("eq" in typedOperator) {
    predicates.push(
      sql`${column} = ${serializeFieldValue(field, typedOperator.eq)}`,
    );
  }

  if ("ne" in typedOperator) {
    predicates.push(
      sql`${column} <> ${serializeFieldValue(field, typedOperator.ne)}`,
    );
  }

  if ("in" in typedOperator && Array.isArray(typedOperator.in)) {
    if (typedOperator.in.length === 0) {
      predicates.push(sql`1 = 0`);
    } else {
      predicates.push(
        sql`${column} in (${
          sqlValueList(
            typedOperator.in.map((value) => serializeFieldValue(field, value)),
          )
        })`,
      );
    }
  }

  if ("notIn" in typedOperator && Array.isArray(typedOperator.notIn)) {
    if (typedOperator.notIn.length === 0) {
      predicates.push(sql`1 = 1`);
    } else {
      predicates.push(
        sql`${column} not in (${
          sqlValueList(
            typedOperator.notIn.map((value) =>
              serializeFieldValue(field, value)
            ),
          )
        })`,
      );
    }
  }

  if ("gt" in typedOperator) {
    predicates.push(
      sql`${column} > ${serializeFieldValue(field, typedOperator.gt)}`,
    );
  }

  if ("gte" in typedOperator) {
    predicates.push(
      sql`${column} >= ${serializeFieldValue(field, typedOperator.gte)}`,
    );
  }

  if ("lt" in typedOperator) {
    predicates.push(
      sql`${column} < ${serializeFieldValue(field, typedOperator.lt)}`,
    );
  }

  if ("lte" in typedOperator) {
    predicates.push(
      sql`${column} <= ${serializeFieldValue(field, typedOperator.lte)}`,
    );
  }

  if ("isNull" in typedOperator) {
    predicates.push(
      typedOperator.isNull
        ? sql`${column} is null`
        : sql`${column} is not null`,
    );
  }

  if ("contains" in typedOperator) {
    predicates.push(
      sql`${column} like ${`%${String(typedOperator.contains)}%`}`,
    );
  }

  if ("startsWith" in typedOperator) {
    predicates.push(
      sql`${column} like ${`${String(typedOperator.startsWith)}%`}`,
    );
  }

  if ("endsWith" in typedOperator) {
    predicates.push(
      sql`${column} like ${`%${String(typedOperator.endsWith)}`}`,
    );
  }

  if (predicates.length === 0) {
    return null;
  }

  return predicates.length === 1
    ? predicates[0]
    : sql`(${sql.join(predicates, sql` and `)})`;
};

const buildWhereClause = (
  definition: ResolvedTableDefinition,
  where?: WhereClause<RawRecord>,
): SQL | null => {
  if (!where) {
    return null;
  }

  const { AND, OR, NOT, ...fieldFilters } = where;
  const predicates: SQL[] = [];

  for (const [fieldName, operator] of Object.entries(fieldFilters)) {
    const predicate = buildFieldPredicate(definition, fieldName, operator);

    if (predicate) {
      predicates.push(predicate);
    }
  }

  if (AND?.length) {
    const andPredicates = AND.map((entry) =>
      buildWhereClause(definition, entry)
    ).filter((entry): entry is SQL => entry !== null);

    if (andPredicates.length) {
      predicates.push(sql`(${sql.join(andPredicates, sql` and `)})`);
    }
  }

  if (OR?.length) {
    const orPredicates = OR.map((entry) => buildWhereClause(definition, entry))
      .filter((entry): entry is SQL => entry !== null);

    if (orPredicates.length) {
      predicates.push(sql`(${sql.join(orPredicates, sql` or `)})`);
    }
  }

  if (NOT?.length) {
    const notPredicates = NOT.map((entry) =>
      buildWhereClause(definition, entry)
    ).filter((entry): entry is SQL => entry !== null);

    if (notPredicates.length) {
      predicates.push(
        ...notPredicates.map((predicate) => sql`not (${predicate})`),
      );
    }
  }

  if (predicates.length === 0) {
    return null;
  }

  return predicates.length === 1
    ? predicates[0]
    : sql`(${sql.join(predicates, sql` and `)})`;
};

const buildOrderByClause = (
  definition: ResolvedTableDefinition,
  orderBy?: AdapterFindOneOptions["orderBy"],
): SQL | null => {
  if (!orderBy?.length) {
    return null;
  }

  const clauses = orderBy.flatMap((entry) =>
    Object.entries(entry).map(
      ([fieldName, direction]) =>
        sql`${columnIdentifier(definition, fieldName)} ${
          sql.raw(
            direction === "desc" ? "desc" : "asc",
          )
        }`,
    )
  );

  if (!clauses.length) {
    return null;
  }

  return sql`${sql.join(clauses, sql`, `)}`;
};

const createRuntime = (
  executor: DrizzleExecutor,
  definitions: ResolvedTableDefinition[],
  prepare: () => Promise<void>,
): AdapterRuntime => {
  const definitionMap = Object.fromEntries(
    definitions.map((definition) => [definition.key, definition]),
  ) as Record<string, ResolvedTableDefinition>;

  const getDefinition = (table: string): ResolvedTableDefinition => {
    const definition = definitionMap[table];

    if (!definition) {
      throw new TypeError(`Unknown Drizzle table registration "${table}".`);
    }

    return definition;
  };

  const buildSelectStatement = (
    definition: ResolvedTableDefinition,
    options: AdapterFindOneOptions | AdapterFindManyOptions | undefined,
  ): SQL => {
    const where = buildWhereClause(definition, options?.where);
    const orderBy = buildOrderByClause(definition, options?.orderBy);
    const manyOptions = options && "limit" in options
      ? options as AdapterFindManyOptions
      : undefined;
    const limit = typeof manyOptions?.limit === "number"
      ? sql` limit ${manyOptions.limit}`
      : sql.empty();
    const offset = typeof manyOptions?.offset === "number"
      ? sql` offset ${manyOptions.offset}`
      : sql.empty();

    return sql`
      select * from ${rawIdentifier(definition.model.table)}
      ${where ? sql`where ${where}` : sql.empty()}
      ${orderBy ? sql`order by ${orderBy}` : sql.empty()}
      ${limit}
      ${offset}
    `;
  };

  const runtimeScope: AdapterTransactionScope = {
    async findById(table: string, options: AdapterFindByIdOptions) {
      await prepare();
      const definition = getDefinition(table);
      const statement = sql`
        select * from ${rawIdentifier(definition.model.table)}
        where ${
        columnIdentifier(
          definition,
          definition.primaryKey,
        )
      } = ${options.id}
        limit 1
      `;
      const rows = asRows(await executor.execute(statement));
      return rows[0] ? normalizeRow(definition, rows[0]) : null;
    },

    async findOne(table: string, options?: AdapterFindOneOptions) {
      await prepare();
      const definition = getDefinition(table);
      const rows = asRows(
        await executor.execute(
          buildSelectStatement(definition, {
            ...options,
            limit: 1,
          }),
        ),
      );
      return rows[0] ? normalizeRow(definition, rows[0]) : null;
    },

    async findMany(table: string, options?: AdapterFindManyOptions) {
      await prepare();
      const definition = getDefinition(table);
      return asRows(
        await executor.execute(buildSelectStatement(definition, options)),
      ).map((row) => normalizeRow(definition, row));
    },

    async create(table: string, input: RawRecord) {
      await prepare();
      const definition = getDefinition(table);
      const entries = Object.entries(input).filter(
        ([, value]) => value !== undefined,
      );

      const statement = sql`
        insert into ${rawIdentifier(definition.model.table)}
        (${
        sql.join(
          entries.map(([fieldName]) => columnIdentifier(definition, fieldName)),
          sql`, `,
        )
      })
        values (${
        sql.join(
          entries.map(([fieldName, value]) =>
            sql`${
              serializeFieldValue(definition.model.fields[fieldName], value)
            }`
          ),
          sql`, `,
        )
      })
        returning *
      `;
      const rows = asRows(await executor.execute(statement));
      const [row] = rows;

      if (!row) {
        throw new Error(
          `Insert into ${definition.model.name} returned no rows.`,
        );
      }

      return normalizeRow(definition, row);
    },

    async updateById(table: string, id: unknown, input: RawRecord) {
      await prepare();
      const definition = getDefinition(table);
      const entries = Object.entries(input).filter(
        ([, value]) => value !== undefined,
      );

      if (entries.length === 0) {
        return await runtimeScope.findById(table, { id });
      }

      const statement = sql`
        update ${rawIdentifier(definition.model.table)}
        set ${
        sql.join(
          entries.map(
            ([fieldName, value]) =>
              sql`${columnIdentifier(definition, fieldName)} = ${
                serializeFieldValue(definition.model.fields[fieldName], value)
              }`,
          ),
          sql`, `,
        )
      }
        where ${columnIdentifier(definition, definition.primaryKey)} = ${id}
        returning *
      `;
      const rows = asRows(await executor.execute(statement));
      return rows[0] ? normalizeRow(definition, rows[0]) : null;
    },

    async deleteById(table: string, id: unknown) {
      await prepare();
      const definition = getDefinition(table);
      const statement = sql`
        delete from ${rawIdentifier(definition.model.table)}
        where ${columnIdentifier(definition, definition.primaryKey)} = ${id}
        returning *
      `;
      const rows = asRows(await executor.execute(statement));
      return rows[0] ? normalizeRow(definition, rows[0]) : null;
    },
  };

  return {
    ...runtimeScope,
    prepare,
    async transaction<T>(
      operation: (transaction: AdapterTransactionScope) => Promise<T>,
    ): Promise<T> {
      await prepare();

      return await executor.transaction(async (transactionExecutor) => {
        const transactionRuntime = createRuntime(
          transactionExecutor,
          definitions,
          async () => {},
        );

        return await operation(transactionRuntime);
      });
    },
  };
};

const createPrepare = (
  executor: DrizzleExecutor,
  definitions: ResolvedTableDefinition[],
): () => Promise<void> => {
  let prepared = false;
  let preparing: Promise<void> | undefined;

  return async (): Promise<void> => {
    if (prepared) {
      return;
    }

    if (preparing) {
      return await preparing;
    }

    preparing = (async () => {
      for (const definition of definitions) {
        await executor.execute(createTableStatement(definition));

        for (
          const [fieldName, field] of Object.entries(definition.model.fields)
        ) {
          if (field.primaryKey) {
            continue;
          }

          await executor.execute(
            createAddColumnStatement(definition, fieldName),
          );
        }
      }

      prepared = true;
    })();

    try {
      await preparing;
    } finally {
      preparing = undefined;
    }
  };
};

const createPreparedRuntime = (
  executor: DrizzleExecutor,
  definitions: ResolvedTableDefinition[],
): AdapterRuntime => {
  return createRuntime(
    executor,
    definitions,
    createPrepare(executor, definitions),
  );
};

const createLazyExecutor = (
  factory: () => DrizzleExecutor,
): DrizzleExecutor => {
  let executor: DrizzleExecutor | undefined;

  const getExecutor = (): DrizzleExecutor => {
    executor ??= factory();
    return executor;
  };

  return {
    execute(statement) {
      return getExecutor().execute(statement);
    },
    transaction(operation) {
      return getExecutor().transaction(operation);
    },
  };
};

export const DRIZZLE_INTERNALS = {
  quoteIdentifier,
  serializeFieldValue,
  deserializeFieldValue,
  fieldSqlType,
  createTableStatement,
  createAddColumnStatement,
  asRows,
  buildFieldPredicate,
  buildWhereClause,
  buildOrderByClause,
  createPrepare,
  createLazyExecutor,
  createPreparedRuntime,
  createRuntime,
} as const;

/**
 * Creates a Curio database adapter backed by Drizzle.
 *
 * @param config Drizzle adapter configuration.
 * @returns A Curio database adapter that can be passed to `Database.create(...)`.
 *
 * @remarks
 * The first supported dialect is PostgreSQL. The adapter prepares the declared
 * tables lazily on first use and also supports explicit preparation through
 * `db.prepare()`.
 *
 * @example
 * ```ts
 * import postgres from "@postgres";
 * import { Database } from "@curio/core";
 * import { drizzleAdapter } from "@curio/core/drizzle";
 *
 * const client = postgres("postgresql://curio:curio@localhost:5432/curio");
 *
 * const db = Database.create({
 *   adapter: drizzleAdapter({
 *     dialect: "postgres",
 *     client,
 *   }),
 *   tables: {
 *     User: UserModel,
 *   },
 * });
 *
 * await db.prepare();
 * ```
 */
export const drizzleAdapter = (
  config: DrizzleAdapterConfig,
): DatabaseAdapter => ({
  bind(definitions: ResolvedTableDefinition[]): AdapterRuntime {
    if (config.dialect !== "postgres") {
      throw new TypeError(`Unsupported Drizzle dialect "${config.dialect}".`);
    }

    const database = createLazyExecutor(() => drizzle(config.client));
    return createPreparedRuntime(database, definitions);
  },
});
