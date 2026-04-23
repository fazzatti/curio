// deno-coverage-ignore-start
import { UniqueConstraintViolationError } from "@/db/errors.ts";
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
// deno-coverage-ignore-stop

type MemoryAdapterOptions = {
  seed?: Record<string, RawRecord[]>;
};

type MemoryStore = Record<string, RawRecord[]>;

const compareValues = (left: unknown, right: unknown): number => {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right));
};

const matchesFieldOperator = (value: unknown, operator: unknown): boolean => {
  if (
    operator === null ||
    typeof operator !== "object" ||
    Array.isArray(operator) ||
    operator instanceof Date
  ) {
    return value === operator;
  }

  const typedOperator = operator as Record<string, unknown>;

  if ("eq" in typedOperator && value !== typedOperator.eq) {
    return false;
  }

  if ("ne" in typedOperator && value === typedOperator.ne) {
    return false;
  }

  if (
    "in" in typedOperator &&
    Array.isArray(typedOperator.in) &&
    !typedOperator.in.some((entry) => entry === value)
  ) {
    return false;
  }

  if (
    "notIn" in typedOperator &&
    Array.isArray(typedOperator.notIn) &&
    typedOperator.notIn.some((entry) => entry === value)
  ) {
    return false;
  }

  if ("gt" in typedOperator && compareValues(value, typedOperator.gt) <= 0) {
    return false;
  }

  if ("gte" in typedOperator && compareValues(value, typedOperator.gte) < 0) {
    return false;
  }

  if ("lt" in typedOperator && compareValues(value, typedOperator.lt) >= 0) {
    return false;
  }

  if ("lte" in typedOperator && compareValues(value, typedOperator.lte) > 0) {
    return false;
  }

  if ("isNull" in typedOperator) {
    const expectsNull = Boolean(typedOperator.isNull);
    if (expectsNull !== (value === null || value === undefined)) {
      return false;
    }
  }

  if ("contains" in typedOperator) {
    if (
      typeof value !== "string" ||
      typeof typedOperator.contains !== "string" ||
      !value.includes(typedOperator.contains)
    ) {
      return false;
    }
  }

  if ("startsWith" in typedOperator) {
    if (
      typeof value !== "string" ||
      typeof typedOperator.startsWith !== "string" ||
      !value.startsWith(typedOperator.startsWith)
    ) {
      return false;
    }
  }

  if ("endsWith" in typedOperator) {
    if (
      typeof value !== "string" ||
      typeof typedOperator.endsWith !== "string" ||
      !value.endsWith(typedOperator.endsWith)
    ) {
      return false;
    }
  }

  return true;
};

const matchesWhereClause = (
  record: RawRecord,
  where: WhereClause<RawRecord> | undefined,
): boolean => {
  if (!where) {
    return true;
  }

  const { AND, OR, NOT, ...fieldFilters } = where;

  for (const [fieldName, operator] of Object.entries(fieldFilters)) {
    if (!matchesFieldOperator(record[fieldName], operator)) {
      return false;
    }
  }

  if (
    AND?.length && !AND.every((clause) => matchesWhereClause(record, clause))
  ) {
    return false;
  }

  if (OR?.length && !OR.some((clause) => matchesWhereClause(record, clause))) {
    return false;
  }

  if (NOT?.length && NOT.some((clause) => matchesWhereClause(record, clause))) {
    return false;
  }

  return true;
};

const applyOrderBy = (
  records: RawRecord[],
  orderBy: AdapterFindOneOptions["orderBy"],
): RawRecord[] => {
  if (!orderBy?.length) {
    return records;
  }

  return [...records].sort((left, right) => {
    for (const clause of orderBy) {
      for (const [fieldName, direction] of Object.entries(clause)) {
        const comparison = compareValues(left[fieldName], right[fieldName]);

        if (comparison === 0) {
          continue;
        }

        return direction === "desc" ? comparison * -1 : comparison;
      }
    }

    return 0;
  });
};

const findTableDefinition = (
  schema: ResolvedTableDefinition[],
  table: string,
): ResolvedTableDefinition => {
  const definition = schema.find((entry) => entry.key === table);

  if (!definition) {
    throw new TypeError(`Unknown bound table "${table}" in memory adapter.`);
  }

  return definition;
};

const enforceUniqueConstraints = (
  schema: ResolvedTableDefinition[],
  store: MemoryStore,
  table: string,
  input: RawRecord,
  currentId?: unknown,
): void => {
  const definition = findTableDefinition(schema, table);
  const rows = store[table];

  for (const [fieldName, field] of Object.entries(definition.model.fields)) {
    const typedField = field as { unique: boolean; primaryKey: boolean };

    if (!typedField.unique && !typedField.primaryKey) {
      continue;
    }

    const nextValue = input[fieldName];

    if (nextValue === undefined) {
      continue;
    }

    const duplicate = rows.find((row) => {
      const isCurrentRow = currentId !== undefined &&
        row[definition.primaryKey] === currentId;

      return !isCurrentRow && row[fieldName] === nextValue;
    });

    if (duplicate) {
      throw new UniqueConstraintViolationError(
        definition.model.name,
        fieldName,
        nextValue,
      );
    }
  }
};

const createScope = (
  schema: ResolvedTableDefinition[],
  store: MemoryStore,
): AdapterTransactionScope => ({
  findById(table: string, options: AdapterFindByIdOptions) {
    const definition = findTableDefinition(schema, table);
    const row = store[table].find((entry) =>
      entry[definition.primaryKey] === options.id
    );

    return Promise.resolve(row ? structuredClone(row) : null);
  },

  findOne(table: string, options?: AdapterFindOneOptions) {
    findTableDefinition(schema, table);
    const rows = applyOrderBy(
      store[table].filter((entry) => matchesWhereClause(entry, options?.where)),
      options?.orderBy,
    );

    const row = rows[0];
    return Promise.resolve(row ? structuredClone(row) : null);
  },

  findMany(table: string, options?: AdapterFindManyOptions) {
    findTableDefinition(schema, table);
    const orderedRows = applyOrderBy(
      store[table].filter((entry) => matchesWhereClause(entry, options?.where)),
      options?.orderBy,
    );

    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    const pagedRows = limit === undefined
      ? orderedRows.slice(offset)
      : orderedRows.slice(offset, offset + limit);

    return Promise.resolve(structuredClone(pagedRows));
  },

  create(table: string, input: RawRecord) {
    enforceUniqueConstraints(schema, store, table, input);
    const row = structuredClone(input);
    store[table] = [...store[table], row];
    return Promise.resolve(structuredClone(row));
  },

  updateById(table: string, id: unknown, input: RawRecord) {
    const definition = findTableDefinition(schema, table);
    const rows = store[table];
    const index = rows.findIndex((entry) =>
      entry[definition.primaryKey] === id
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    const nextRow = {
      ...rows[index],
      ...structuredClone(input),
    };

    enforceUniqueConstraints(schema, store, table, nextRow, id);

    const nextRows = [...rows];
    nextRows[index] = nextRow;
    store[table] = nextRows;

    return Promise.resolve(structuredClone(nextRow));
  },

  deleteById(table: string, id: unknown) {
    const definition = findTableDefinition(schema, table);
    const rows = store[table];
    const index = rows.findIndex((entry) =>
      entry[definition.primaryKey] === id
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    const [deletedRow] = rows.splice(index, 1);
    store[table] = [...rows];

    return Promise.resolve(structuredClone(deletedRow));
  },
});

/**
 * In-memory Curio database adapter.
 *
 * @param options Optional seed data used to pre-populate the adapter.
 * @returns A database adapter suitable for tests and local execution.
 *
 * @remarks
 * This adapter supports the same repository API as the main database layer,
 * including filtering, ordering, pagination, includes, uniqueness checks, and
 * transactions. Transactions are implemented by cloning the in-memory store and
 * committing it only when the callback resolves successfully.
 */
export const memoryDatabaseAdapter = (
  options: MemoryAdapterOptions = {},
): DatabaseAdapter => ({
  bind(schema: ResolvedTableDefinition[]): AdapterRuntime {
    const rootStore: MemoryStore = Object.fromEntries(
      schema.map((definition) => [
        definition.key,
        structuredClone(options.seed?.[definition.key] ?? []),
      ]),
    );

    const baseScope = createScope(schema, rootStore);

    return {
      ...baseScope,
      prepare(): Promise<void> {
        return Promise.resolve();
      },
      async transaction<T>(
        operation: (transaction: AdapterTransactionScope) => Promise<T>,
      ): Promise<T> {
        const transactionalStore = structuredClone(rootStore);
        const transactionalScope = createScope(schema, transactionalStore);
        const result = await operation(transactionalScope);

        for (const key of Object.keys(rootStore)) {
          rootStore[key] = structuredClone(transactionalStore[key]);
        }

        return result;
      },
    };
  },
});
