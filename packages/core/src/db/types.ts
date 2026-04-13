import type {
  BoundEntityClass,
  Entity,
  HydratedEntityInstance,
} from "@/db/entity.ts";
import type { FieldBuilderMap, InferFieldRecord } from "@/db/field.ts";
import type { Model } from "@/db/model.ts";
import type { RelationBuilderMap } from "@/db/relation.ts";
import type { SchemaAdapter } from "@/schema/types.ts";
import type { AnyModelVariant } from "@/db/variant.ts";

/** Small helper that flattens intersection-heavy types for display. */
export type Simplify<TObject> =
  & {
    [K in keyof TObject]: TObject[K];
  }
  & Record<never, never>;

/** Primitive record shape used across the DB layer. */
export type RawRecord = Record<string, unknown>;

/** Value shape used by loaded relations on hydrated entities. */
export type RelationValue =
  | Entity
  | Entity[]
  | null
  | undefined;

/** Supported sort directions. */
export type OrderDirection = "asc" | "desc";

/**
 * Field-level operator accepted inside repository `where` clauses.
 *
 * @typeParam TValue The field value type being filtered.
 */
export type FieldOperator<TValue> =
  | TValue
  | Simplify<
    & {
      eq?: TValue;
      ne?: TValue;
      in?: TValue[];
      notIn?: TValue[];
      gt?: TValue;
      gte?: TValue;
      lt?: TValue;
      lte?: TValue;
      isNull?: boolean;
    }
    & (TValue extends string ? {
        contains?: string;
        startsWith?: string;
        endsWith?: string;
      }
      : Record<never, never>)
  >;

/**
 * Repository `where` clause.
 *
 * @typeParam TRecord The model record shape being filtered.
 */
export type WhereClause<TRecord extends RawRecord> = Simplify<
  {
    [K in keyof TRecord]?: FieldOperator<TRecord[K]>;
  } & {
    AND?: WhereClause<TRecord>[];
    OR?: WhereClause<TRecord>[];
    NOT?: WhereClause<TRecord>[];
  }
>;

/**
 * Repository ordering clause.
 *
 * @typeParam TRecord The model record shape being ordered.
 */
export type OrderByClause<TRecord extends RawRecord> = Array<
  Partial<Record<keyof TRecord, OrderDirection>>
>;

/**
 * One-level include clause keyed by relation names.
 *
 * @typeParam TRelationNames Supported relation names for the model.
 */
export type IncludeClause<TRelationNames extends string> = Partial<
  Record<TRelationNames, true>
>;

/**
 * Singular repository lookup options.
 *
 * @typeParam TRecord The model record shape.
 * @typeParam TRelationNames Supported relation names for the model.
 */
export type FindOneOptions<
  TRecord extends RawRecord,
  TRelationNames extends string = never,
> = {
  where?: WhereClause<TRecord>;
  orderBy?: OrderByClause<TRecord>;
  include?: IncludeClause<TRelationNames>;
};

/**
 * Plural repository lookup options.
 *
 * @typeParam TRecord The model record shape.
 * @typeParam TRelationNames Supported relation names for the model.
 */
export type FindManyOptions<
  TRecord extends RawRecord,
  TRelationNames extends string = never,
> = FindOneOptions<TRecord, TRelationNames> & {
  limit?: number;
  offset?: number;
};

/** Write-time options accepted by `create(...)` and `updateById(...)`. */
export type WriteOptions = {
  validate?: boolean;
};

/** Minimal schema adapter accepted by the DB validation layer. */
export type DatabaseValidationAdapter = Pick<SchemaAdapter<unknown>, "parse">;

/** Minimal schema binding accepted by model-level validation. */
export type DatabaseValidationBinding = {
  schema: unknown;
  adapter?: DatabaseValidationAdapter;
};

/** Schema entry accepted by model-level validation. */
export type ModelValidationEntry = unknown | DatabaseValidationBinding;

/** Model-level validation bindings used for create and update operations. */
export type ModelValidationConfig = {
  create?: ModelValidationEntry;
  update?: ModelValidationEntry;
};

/** Human-friendly model labels. */
export type ModelLabels = {
  singular?: string;
  plural?: string;
};

/** Model labels after Curio fills defaults during model construction. */
export type ResolvedModelLabels = {
  singular: string;
  plural: string;
};

/**
 * Repository contract exposed on assembled Curio databases.
 *
 * @typeParam TRecord The persisted model record shape.
 * @typeParam TEntity The hydrated entity shape returned by the repository.
 * @typeParam TRelationNames Supported relation names for the model.
 */
export type Repository<
  TRecord extends RawRecord = RawRecord,
  TEntity extends Entity = Entity,
  TRelationNames extends string = never,
> = {
  findById(
    id: TRecord[keyof TRecord],
    options?: Pick<FindOneOptions<TRecord, TRelationNames>, "include">,
  ): Promise<TEntity | null>;
  getById(
    id: TRecord[keyof TRecord],
    options?: Pick<FindOneOptions<TRecord, TRelationNames>, "include">,
  ): Promise<TEntity>;
  findOne(
    options?: FindOneOptions<TRecord, TRelationNames>,
  ): Promise<TEntity | null>;
  getOne(options?: FindOneOptions<TRecord, TRelationNames>): Promise<TEntity>;
  findMany(
    options?: FindManyOptions<TRecord, TRelationNames>,
  ): Promise<TEntity[]>;
  create(input: Partial<TRecord>, options?: WriteOptions): Promise<TEntity>;
  updateById(
    id: TRecord[keyof TRecord],
    input: Partial<TRecord>,
    options?: WriteOptions,
  ): Promise<TEntity>;
  deleteById(id: TRecord[keyof TRecord]): Promise<TEntity>;
};

/** Any Curio model. */
export type AnyModel = Model<
  string,
  FieldBuilderMap,
  RelationBuilderMap,
  readonly AnyModelVariant[]
>;

/** Any registered table value accepted by `Database.create(...)`. */
export type TableRegistration = AnyModel | BoundEntityClass<AnyModel, Entity>;

/** Table registry keyed by model name. */
export type TableRegistry = Record<string, TableRegistration>;

/** Extracts the Curio model from a table registration. */
export type ModelOfRegistration<TRegistration extends TableRegistration> =
  TRegistration extends AnyModel ? TRegistration
    : TRegistration extends BoundEntityClass<infer TModel> ? TModel
    : never;

/** Infers the persisted record shape of a Curio model. */
export type InferModelRecord<TModel extends AnyModel> = Simplify<
  InferFieldRecord<TModel["fields"]>
>;

/** Infers relation names declared by a Curio model. */
export type InferModelRelationNames<TModel extends AnyModel> =
  & keyof TModel["relations"]
  & string;

/** Hydrated entity shape returned for a table registration. */
export type EntityOfRegistration<TRegistration extends TableRegistration> =
  TRegistration extends BoundEntityClass<infer TModel, infer TEntityBase>
    ? HydratedEntityInstance<TEntityBase, InferModelRecord<TModel>>
    : HydratedEntityInstance<
      Entity,
      InferModelRecord<ModelOfRegistration<TRegistration>>
    >;

/** Resolved bound entity class stored in the assembled database registry. */
export type BoundEntityOfRegistration<TRegistration extends TableRegistration> =
  TRegistration extends BoundEntityClass<infer TModel, infer TEntityBase>
    ? BoundEntityClass<TModel, TEntityBase>
    : BoundEntityClass<ModelOfRegistration<TRegistration>, Entity>;

/** Repository type derived from a table registration. */
export type RepositoryOfRegistration<TRegistration extends TableRegistration> =
  Repository<
    InferModelRecord<ModelOfRegistration<TRegistration>>,
    EntityOfRegistration<TRegistration>,
    InferModelRelationNames<ModelOfRegistration<TRegistration>>
  >;

/** Model registry exposed on the assembled database. */
export type ModelRegistryOf<TTables extends TableRegistry> = {
  [K in keyof TTables]: ModelOfRegistration<TTables[K]>;
};

/** Entity registry exposed on the assembled database. */
export type EntityRegistryOf<TTables extends TableRegistry> = {
  [K in keyof TTables]: BoundEntityOfRegistration<TTables[K]>;
};

/** Direct repository registry exposed on the assembled database. */
export type RepositoryRegistryOf<TTables extends TableRegistry> = {
  [K in keyof TTables]: RepositoryOfRegistration<TTables[K]>;
};

/** Input accepted by `Database.create(...)`. */
export type DatabaseCreateInput<TTables extends TableRegistry> = {
  adapter: DatabaseAdapter;
  schemaAdapter?: DatabaseValidationAdapter;
  tables: TTables;
};

/** Final database instance type returned by `Database.create(...)`. */
export type DatabaseInstance<TTables extends TableRegistry> =
  & {
    readonly models: ModelRegistryOf<TTables>;
    readonly entities: EntityRegistryOf<TTables>;
    prepare(): Promise<void>;
    repo<TKey extends keyof TTables & string>(
      key: TKey,
    ): RepositoryOfRegistration<TTables[TKey]>;
    transaction<TResult>(
      operation: (database: DatabaseInstance<TTables>) => Promise<TResult>,
    ): Promise<TResult>;
  }
  & RepositoryRegistryOf<TTables>;

/** Relation definition resolved during database assembly. */
export type ResolvedRelationDefinition = {
  name: string;
  kind: "belongsTo" | "hasMany";
  target: string;
  foreignKey: string;
  references: string;
};

/** Table definition resolved during database assembly. */
export type ResolvedTableDefinition = {
  key: string;
  model: AnyModel;
  entity: BoundEntityClass<AnyModel>;
  primaryKey: string;
  relations: Record<string, ResolvedRelationDefinition>;
};

/** Adapter lookup options for primary-key retrieval. */
export type AdapterFindByIdOptions = {
  id: unknown;
};

/** Adapter lookup options for singular non-primary-key retrieval. */
export type AdapterFindOneOptions = {
  where?: WhereClause<RawRecord>;
  orderBy?: OrderByClause<RawRecord>;
};

/** Adapter lookup options for plural retrieval. */
export type AdapterFindManyOptions = AdapterFindOneOptions & {
  limit?: number;
  offset?: number;
};

/** Transaction-bound adapter scope used by the repository layer. */
export type AdapterTransactionScope = {
  findById(
    table: string,
    options: AdapterFindByIdOptions,
  ): Promise<RawRecord | null>;
  findOne(
    table: string,
    options?: AdapterFindOneOptions,
  ): Promise<RawRecord | null>;
  findMany(
    table: string,
    options?: AdapterFindManyOptions,
  ): Promise<RawRecord[]>;
  create(table: string, input: RawRecord): Promise<RawRecord>;
  updateById(
    table: string,
    id: unknown,
    input: RawRecord,
  ): Promise<RawRecord | null>;
  deleteById(table: string, id: unknown): Promise<RawRecord | null>;
};

/** Runtime adapter contract bound to a concrete set of Curio tables. */
export type AdapterRuntime = AdapterTransactionScope & {
  prepare(): Promise<void>;
  transaction<T>(
    operation: (transaction: AdapterTransactionScope) => Promise<T>,
  ): Promise<T>;
};

/** Database adapter contract used by `Database.create(...)`. */
export type DatabaseAdapter = {
  bind(schema: ResolvedTableDefinition[]): AdapterRuntime;
};
