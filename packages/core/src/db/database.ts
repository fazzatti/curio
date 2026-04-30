// deno-coverage-ignore-start
import {
  type BoundEntityClass,
  createDefaultEntityClass,
  type Entity,
  getEntityBinding,
  hydrateEntityInstance,
} from "@/db/entity.ts";
import {
  MissingRelationForeignKeyError,
  MissingRequiredFieldError,
  NonNullableFieldError,
  NotFoundError,
  ReservedTableKeyError,
  TableRegistrationNameMismatchError,
  UnknownModelFieldError,
  UnknownRelationForeignKeyError,
  UnknownRelationReferenceError,
  UnknownRelationTargetError,
} from "@/db/errors.ts";
import { type FieldDefinition, resolveFieldDefault } from "@/db/field.ts";
import { Model } from "@/db/model.ts";
import type {
  AdapterRuntime,
  DatabaseCreateInput,
  DatabaseInstance,
  DatabaseValidationAdapter,
  EntityRegistryOf,
  FindManyOptions,
  FindOneOptions,
  ModelRegistryOf,
  RawRecord,
  RelationValue,
  Repository,
  RepositoryOfRegistration,
  RepositoryRegistryOf,
  ResolvedRelationDefinition,
  ResolvedTableDefinition,
  TableRegistration,
  TableRegistry,
  WriteOptions,
} from "@/db/types.ts";
// deno-coverage-ignore-stop

const RESERVED_TABLE_KEYS = new Set([
  "repo",
  "transaction",
  "models",
  "entities",
]);

const cloneRecord = <TRecord extends RawRecord>(record: TRecord): TRecord =>
  structuredClone(record);

const assertKnownFields = (
  model: Model,
  input: RawRecord,
): void => {
  for (const fieldName of Object.keys(input)) {
    if (!(fieldName in model.fields)) {
      throw new UnknownModelFieldError(model.name, fieldName);
    }
  }
};

const applyModelValidation = (
  input: RawRecord,
  validation: Model["validation"],
  mode: "create" | "update",
  defaultSchemaAdapter: DatabaseValidationAdapter | undefined,
  options?: WriteOptions,
): RawRecord => {
  if (options?.validate === false) {
    return input;
  }

  const entry = validation?.[mode];

  if (!entry) {
    return input;
  }

  const binding = (
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      "schema" in entry
    )
    ? entry as {
      schema: unknown;
      adapter?: DatabaseValidationAdapter;
    }
    : { schema: entry, adapter: undefined };

  const adapter = binding.adapter ?? defaultSchemaAdapter;

  if (!adapter) {
    throw new TypeError(
      `Model ${mode} validation requires a schema adapter. Pass one to Database.create({ schemaAdapter }) or override the model validation binding explicitly.`,
    );
  }

  const output = adapter.parse<unknown>(binding.schema, input);

  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new TypeError(
      `Model ${mode} validation must return an object payload.`,
    );
  }

  return output as RawRecord;
};

const normalizeCreateInput = (
  model: Model,
  rawInput: RawRecord,
  defaultSchemaAdapter: DatabaseValidationAdapter | undefined,
  options?: WriteOptions,
): RawRecord => {
  assertKnownFields(model, rawInput);

  const input = cloneRecord(rawInput);

  for (const [fieldName, field] of Object.entries(model.fields)) {
    const typedField = field as FieldDefinition;

    if (input[fieldName] === undefined) {
      const nextDefault = resolveFieldDefault(typedField);

      if (nextDefault !== undefined) {
        input[fieldName] = nextDefault;
      }
    }
  }

  const validatedInput = applyModelValidation(
    input,
    model.validation,
    "create",
    defaultSchemaAdapter,
    options,
  );

  for (const [fieldName, field] of Object.entries(model.fields)) {
    const typedField = field as {
      required: boolean;
      nullable: boolean;
    };
    const value = validatedInput[fieldName];

    if (value === undefined && typedField.required) {
      throw new MissingRequiredFieldError(model.name, fieldName);
    }

    if (value === null && !typedField.nullable) {
      throw new NonNullableFieldError(model.name, fieldName);
    }
  }

  return validatedInput;
};

const normalizeUpdateInput = (
  model: Model,
  rawInput: RawRecord,
  defaultSchemaAdapter: DatabaseValidationAdapter | undefined,
  options?: WriteOptions,
): RawRecord => {
  assertKnownFields(model, rawInput);

  const validatedInput = applyModelValidation(
    cloneRecord(rawInput),
    model.validation,
    "update",
    defaultSchemaAdapter,
    options,
  );

  for (const [fieldName, value] of Object.entries(validatedInput)) {
    const field = model.fields[fieldName] as { nullable: boolean };

    if (value === null && !field.nullable) {
      throw new NonNullableFieldError(model.name, fieldName);
    }
  }

  return validatedInput;
};

const normalizeRelation = (
  tableDefinitionMap: Record<string, ResolvedTableDefinition>,
  source: ResolvedTableDefinition,
  relationName: string,
  relation: Model["relations"][string] & {
    kind: "belongsTo" | "hasMany";
    target: string;
    foreignKey?: string;
    references?: string;
  },
): ResolvedRelationDefinition => {
  const target = tableDefinitionMap[relation.target];

  if (!target) {
    throw new UnknownRelationTargetError(
      source.model.name,
      relationName,
      relation.target,
    );
  }

  if (!relation.foreignKey) {
    throw new MissingRelationForeignKeyError(source.model.name, relationName);
  }

  const references = relation.references ?? target.primaryKey;

  if (relation.kind === "belongsTo") {
    if (!(relation.foreignKey in source.model.fields)) {
      throw new UnknownRelationForeignKeyError(
        source.model.name,
        relationName,
        relation.foreignKey,
      );
    }

    if (!(references in target.model.fields)) {
      throw new UnknownRelationReferenceError(
        source.model.name,
        relationName,
        target.model.name,
        references,
      );
    }
  } else {
    if (!(relation.foreignKey in target.model.fields)) {
      throw new UnknownRelationForeignKeyError(
        source.model.name,
        relationName,
        relation.foreignKey,
      );
    }

    if (!(references in source.model.fields)) {
      throw new UnknownRelationReferenceError(
        source.model.name,
        relationName,
        source.model.name,
        references,
      );
    }
  }

  return {
    name: relationName,
    kind: relation.kind,
    target: relation.target,
    foreignKey: relation.foreignKey,
    references,
  };
};

const resolveRegistration = (
  key: string,
  registration: TableRegistration,
): Omit<ResolvedTableDefinition, "relations"> => {
  const model = registration instanceof Model
    ? registration
    : getEntityBinding(registration)?.model;

  if (!model) {
    throw new TypeError(`Unsupported table registration "${key}".`);
  }

  if (RESERVED_TABLE_KEYS.has(key)) {
    throw new ReservedTableKeyError(key);
  }

  if (model.name !== key) {
    throw new TableRegistrationNameMismatchError(key, model.name);
  }

  return {
    key,
    model,
    entity: registration instanceof Model
      ? createDefaultEntityClass(model)
      : registration as BoundEntityClass,
    primaryKey: model.primaryKey,
  };
};

const createResolvedDefinitions = (
  tables: TableRegistry,
): ResolvedTableDefinition[] => {
  const baseDefinitions = Object.entries(tables).map(([key, registration]) =>
    resolveRegistration(key, registration)
  );

  const definitionMap = Object.fromEntries(
    baseDefinitions.map((definition) => [definition.key, definition]),
  ) as Record<string, ResolvedTableDefinition>;

  return baseDefinitions.map((definition) => ({
    ...definition,
    relations: Object.fromEntries(
      Object.entries(definition.model.relations).map((
        [relationName, relation],
      ) => [
        relationName,
        normalizeRelation(
          definitionMap,
          definitionMap[definition.key],
          relationName,
          relation as Model["relations"][string] & {
            kind: "belongsTo" | "hasMany";
            target: string;
            foreignKey?: string;
            references?: string;
          },
        ),
      ]),
    ),
  }));
};

class DatabaseRuntime<TTables extends TableRegistry> {
  readonly models: ModelRegistryOf<TTables>;
  readonly entities: EntityRegistryOf<TTables>;

  readonly #definitions: Record<string, ResolvedTableDefinition>;
  readonly #runtime: AdapterRuntime;
  readonly #repositories: RepositoryRegistryOf<TTables>;
  readonly #schemaAdapter?: DatabaseValidationAdapter;

  constructor(
    definitions: Record<string, ResolvedTableDefinition>,
    runtime: AdapterRuntime,
    repositories: RepositoryRegistryOf<TTables>,
    schemaAdapter?: DatabaseValidationAdapter,
  ) {
    this.#definitions = definitions;
    this.#runtime = runtime;
    this.#repositories = repositories;
    this.#schemaAdapter = schemaAdapter;
    this.models = Object.fromEntries(
      Object.entries(definitions).map((
        [key, definition],
      ) => [key, definition.model]),
    ) as ModelRegistryOf<TTables>;
    this.entities = Object.fromEntries(
      Object.entries(definitions).map((
        [key, definition],
      ) => [key, definition.entity]),
    ) as EntityRegistryOf<TTables>;
  }

  repo<TKey extends keyof TTables & string>(
    key: TKey,
  ): RepositoryOfRegistration<TTables[TKey]> {
    return this.#repositories[key];
  }

  async prepare(): Promise<void> {
    await this.#runtime.prepare();
  }

  async transaction<TResult>(
    operation: (database: DatabaseInstance<TTables>) => Promise<TResult>,
  ): Promise<TResult> {
    await this.#runtime.prepare();

    return await this.#runtime.transaction(async (transactionScope) => {
      const transactionDatabase = createDatabaseInstance<TTables>(
        this.#definitions,
        {
          ...transactionScope,
          prepare: async () => {},
          transaction: async <T>(
            nestedOperation: (
              transaction: typeof transactionScope,
            ) => Promise<T>,
          ) => await nestedOperation(transactionScope),
        },
        this.#schemaAdapter,
      );

      return await operation(transactionDatabase);
    });
  }
}

const createDatabaseInstance = <TTables extends TableRegistry>(
  definitions: Record<string, ResolvedTableDefinition>,
  runtime: AdapterRuntime,
  schemaAdapter?: DatabaseValidationAdapter,
): DatabaseInstance<TTables> => {
  const databaseRef: { current?: DatabaseInstance<TTables> } = {};

  const loadIncludes = async (
    definition: ResolvedTableDefinition,
    record: RawRecord,
    include: FindOneOptions<RawRecord, string>["include"],
  ): Promise<Record<string, RelationValue>> => {
    if (!include) {
      return {};
    }

    const loadedRelations: Record<string, RelationValue> = {};

    for (const [relationName, enabled] of Object.entries(include)) {
      if (!enabled) {
        continue;
      }

      const relation = definition.relations[relationName];

      if (!relation) {
        continue;
      }

      const database = databaseRef.current as DatabaseInstance<TTables>;
      const targetRepo = database.repo(
        relation.target as keyof TTables & string,
      ) as Repository<RawRecord, Entity, string>;

      if (relation.kind === "belongsTo") {
        const foreignKeyValue = record[relation.foreignKey];
        if (foreignKeyValue == null) {
          loadedRelations[relationName] = null;
        } else {
          loadedRelations[relationName] = await targetRepo.findById(
            foreignKeyValue,
          );
        }
        continue;
      }

      loadedRelations[relationName] = await targetRepo.findMany({
        where: {
          [relation.foreignKey]: record[relation.references],
        },
      });
    }

    return loadedRelations;
  };

  const hydrate = async (
    definition: ResolvedTableDefinition,
    record: RawRecord,
    include?: FindOneOptions<RawRecord, string>["include"],
  ) => {
    const loadedRelations = await loadIncludes(definition, record, include);

    return hydrateEntityInstance(
      definition.entity,
      record,
      loadedRelations,
    );
  };

  const repositories = Object.fromEntries(
    Object.values(definitions).map((definition) => {
      const repository: Repository<RawRecord, Entity, string> = {
        async findById(id, options) {
          const row = await runtime.findById(definition.key, { id });
          return row ? await hydrate(definition, row, options?.include) : null;
        },

        async getById(id, options) {
          const entity = await repository.findById(id, options);

          if (!entity) {
            throw new NotFoundError(
              definition.model.name,
              `id ${JSON.stringify(id)}`,
            );
          }

          return entity;
        },

        async findOne(options) {
          const row = await runtime.findOne(definition.key, {
            where: options?.where as FindOneOptions<RawRecord, string>["where"],
            orderBy: options?.orderBy ?? definition.model.defaultOrder,
          });

          return row ? await hydrate(definition, row, options?.include) : null;
        },

        async getOne(options) {
          const entity = await repository.findOne(options);

          if (!entity) {
            throw new NotFoundError(
              definition.model.name,
              "the provided query",
            );
          }

          return entity;
        },

        async findMany(options) {
          const rows = await runtime.findMany(definition.key, {
            where: options?.where as FindManyOptions<
              RawRecord,
              string
            >["where"],
            orderBy: options?.orderBy ?? definition.model.defaultOrder,
            limit: options?.limit,
            offset: options?.offset,
          });

          return await Promise.all(
            rows.map((row) => hydrate(definition, row, options?.include)),
          );
        },

        async create(input, options) {
          const normalizedInput = normalizeCreateInput(
            definition.model,
            input,
            schemaAdapter,
            options,
          );
          const row = await runtime.create(definition.key, normalizedInput);
          return await hydrate(definition, row);
        },

        async updateById(id, input, options) {
          const normalizedInput = normalizeUpdateInput(
            definition.model,
            input,
            schemaAdapter,
            options,
          );
          const row = await runtime.updateById(
            definition.key,
            id,
            normalizedInput,
          );

          if (!row) {
            throw new NotFoundError(
              definition.model.name,
              `id ${JSON.stringify(id)}`,
            );
          }

          return await hydrate(definition, row);
        },

        async deleteById(id) {
          const row = await runtime.deleteById(definition.key, id);

          if (!row) {
            throw new NotFoundError(
              definition.model.name,
              `id ${JSON.stringify(id)}`,
            );
          }

          return await hydrate(definition, row);
        },
      };

      return [definition.key, repository];
    }),
  ) as RepositoryRegistryOf<TTables>;

  const database = new DatabaseRuntime<TTables>(
    definitions,
    runtime,
    repositories,
    schemaAdapter,
  ) as DatabaseRuntime<TTables> & RepositoryRegistryOf<TTables>;

  for (const [key, repository] of Object.entries(repositories)) {
    Object.defineProperty(database, key, {
      value: repository,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }

  databaseRef.current = database as DatabaseInstance<TTables>;
  return databaseRef.current;
};

/**
 * Curio database assembly API.
 *
 * `Database.create(...)` resolves model/entity registrations, validates
 * relation graphs, binds the configured adapter, and returns a database object
 * exposing direct repositories such as `db.User`.
 */
export class Database {
  /**
   * Creates a Curio database from registered tables and an adapter.
   *
   * @param input Database assembly input.
   * @returns A fully bound Curio database with direct repository properties.
   *
   * @remarks
   * `tables` may contain either plain models or entity classes already bound
   * with `Entity.from(model)`. Plain models receive a default entity class
   * automatically.
   *
   * @example
   * ```ts
   * const db = Database.create({
   *   adapter: memoryDatabaseAdapter(),
   *   tables: {
   *     User: User.from(UserModel),
   *     Session: SessionModel,
   *   },
   * });
   * ```
   */
  static create<const TTables extends TableRegistry>(
    input: DatabaseCreateInput<TTables>,
  ): DatabaseInstance<TTables> {
    const definitions = createResolvedDefinitions(input.tables);
    const definitionMap = Object.fromEntries(
      definitions.map((definition) => [definition.key, definition]),
    ) as Record<string, ResolvedTableDefinition>;
    const runtime = input.adapter.bind(definitions);

    return createDatabaseInstance<TTables>(
      definitionMap,
      runtime,
      input.schemaAdapter,
    );
  }
}
