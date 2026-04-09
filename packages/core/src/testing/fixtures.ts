import {
  createDefaultEntityClass,
  getEntityBinding,
  hydrateEntityInstance,
  isBoundEntityClass,
} from "@/db/entity.ts";
import type { FieldDefinition } from "@/db/field.ts";
import { resolveFieldDefault } from "@/db/field.ts";
import type {
  BoundEntityOfRegistration,
  EntityOfRegistration,
  InferModelRecord,
  ModelOfRegistration,
  RawRecord,
  RepositoryOfRegistration,
  TableRegistration,
} from "@/db/types.ts";
import type { AnyModel } from "@/db/types.ts";

export type FixtureBuildContext<TRecord extends RawRecord = RawRecord> = {
  index: number;
  field: keyof TRecord & string;
  modelName: string;
  record: Partial<TRecord>;
  random(): number;
  pick<TValue>(values: readonly TValue[]): TValue;
  seed: number;
  sequence(key?: string): number;
};

export type FixtureFieldGenerator<
  TRecord extends RawRecord,
  TKey extends keyof TRecord,
> = (
  context: FixtureBuildContext<TRecord> & { field: TKey & string },
) => TRecord[TKey];

export type FixtureGenerators<TRecord extends RawRecord> = Partial<
  {
    [K in keyof TRecord]: FixtureFieldGenerator<TRecord, K>;
  }
>;

export type FixtureBuilderOptions<TRegistration extends TableRegistration> = {
  seed?: number | string;
  generators?: FixtureGenerators<
    InferModelRecord<ModelOfRegistration<TRegistration>>
  >;
};

export type FixtureManyOverrides<TRecord extends RawRecord> =
  | Partial<TRecord>
  | ((index: number) => Partial<TRecord>);

export type FixtureBuilder<TRegistration extends TableRegistration> = {
  readonly entityClass: BoundEntityOfRegistration<TRegistration>;
  readonly model: ModelOfRegistration<TRegistration>;
  build(
    overrides?: Partial<InferModelRecord<ModelOfRegistration<TRegistration>>>,
  ): InferModelRecord<ModelOfRegistration<TRegistration>>;
  buildMany(
    count: number,
    overrides?:
      | FixtureManyOverrides<
        InferModelRecord<ModelOfRegistration<TRegistration>>
      >
      | undefined,
  ): Array<InferModelRecord<ModelOfRegistration<TRegistration>>>;
  hydrate(
    overrides?: Partial<InferModelRecord<ModelOfRegistration<TRegistration>>>,
  ): EntityOfRegistration<TRegistration>;
  hydrateMany(
    count: number,
    overrides?:
      | FixtureManyOverrides<
        InferModelRecord<ModelOfRegistration<TRegistration>>
      >
      | undefined,
  ): Array<EntityOfRegistration<TRegistration>>;
  create(
    repo: RepositoryOfRegistration<TRegistration>,
    overrides?: Partial<InferModelRecord<ModelOfRegistration<TRegistration>>>,
  ): Promise<EntityOfRegistration<TRegistration>>;
  createMany(
    repo: RepositoryOfRegistration<TRegistration>,
    count: number,
    overrides?:
      | FixtureManyOverrides<
        InferModelRecord<ModelOfRegistration<TRegistration>>
      >
      | undefined,
  ): Promise<Array<EntityOfRegistration<TRegistration>>>;
  reset(): void;
};

const BASE_TIMESTAMP_MS = Date.UTC(2024, 0, 1, 0, 0, 0, 0);

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const cloneFixtureValue = <TValue>(value: TValue): TValue => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    typeof value === "undefined" ||
    value === null
  ) {
    return value;
  }

  return structuredClone(value);
};

const hashSeed = (seed: number | string | undefined): number => {
  const input = String(seed ?? "curio-fixtures");
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const deterministicUuid = (
  seed: number,
  modelName: string,
  fieldName: string,
  sequence: number,
): string => {
  const source = `${seed}:${modelName}:${fieldName}:${sequence}`;
  const bytes = new Uint8Array(16);

  for (let index = 0; index < bytes.length; index += 1) {
    const hash = hashSeed(`${source}:${index}`);
    bytes[index] = hash & 0xff;
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

const defaultStringValue = (
  model: AnyModel,
  fieldName: string,
  sequence: number,
): string => {
  const normalizedField = fieldName.toLowerCase();

  if (normalizedField.includes("email")) {
    return `${slugify(model.name)}+${sequence}@example.com`;
  }

  if (normalizedField.includes("slug")) {
    return `${slugify(model.name)}-${sequence}`;
  }

  if (normalizedField.includes("url")) {
    return `https://example.com/${slugify(model.name)}/${
      slugify(fieldName)
    }/${sequence}`;
  }

  if (normalizedField === "name" || normalizedField.endsWith("name")) {
    return `${model.labels.singular} ${sequence}`;
  }

  if (normalizedField.includes("title")) {
    return `${model.labels.singular} Title ${sequence}`;
  }

  if (normalizedField.includes("password")) {
    return `secret-${slugify(model.name)}-${sequence}`;
  }

  return `${slugify(model.table)}-${slugify(fieldName)}-${sequence}`;
};

const defaultValueForField = (
  model: AnyModel,
  fieldName: string,
  field: FieldDefinition,
  context: FixtureBuildContext,
): unknown => {
  const staticDefault = resolveFieldDefault(field);

  if (typeof field.default !== "function" && staticDefault !== undefined) {
    return cloneFixtureValue(staticDefault);
  }

  const sequence = context.sequence(fieldName);

  switch (field.kind) {
    case "id":
      return `${slugify(model.name)}_${sequence}`;
    case "uuid":
      return deterministicUuid(context.seed, model.name, fieldName, sequence);
    case "string":
      return defaultStringValue(model, fieldName, sequence);
    case "text":
      return `${model.labels.singular} ${fieldName} ${sequence}`;
    case "boolean":
      return sequence % 2 === 1;
    case "integer":
      return sequence;
    case "number":
      return sequence + 0.5;
    case "datetime":
      return new Date(
        BASE_TIMESTAMP_MS + (sequence * 60_000) + (context.seed % 10_000),
      );
    case "json":
      return {
        field: fieldName,
        index: context.index,
        model: model.name,
        seed: context.seed,
      };
    case "enum": {
      const values = field.values ?? [];

      if (values.length === 0) {
        throw new Error(
          `Enum field "${model.name}.${fieldName}" has no registered values.`,
        );
      }

      return values[(sequence - 1) % values.length];
    }
  }
};

const resolveModel = <TRegistration extends TableRegistration>(
  registration: TRegistration,
): ModelOfRegistration<TRegistration> => {
  if (isBoundEntityClass(registration)) {
    return getEntityBinding(registration)!.model as ModelOfRegistration<
      TRegistration
    >;
  }

  return registration as ModelOfRegistration<TRegistration>;
};

const resolveEntityClass = <TRegistration extends TableRegistration>(
  registration: TRegistration,
): BoundEntityOfRegistration<TRegistration> => {
  if (isBoundEntityClass(registration)) {
    return registration as unknown as BoundEntityOfRegistration<TRegistration>;
  }

  return createDefaultEntityClass(registration) as BoundEntityOfRegistration<
    TRegistration
  >;
};

const normalizeManyOverrides = <TRecord extends RawRecord>(
  index: number,
  overrides: FixtureManyOverrides<TRecord> | undefined,
): Partial<TRecord> => {
  if (!overrides) {
    return {};
  }

  return typeof overrides === "function" ? overrides(index) : overrides;
};

/**
 * Creates a deterministic fixture builder for a Curio model or bound entity.
 *
 * @remarks
 * The builder prefers deterministic generated values over dynamic model
 * defaults such as `crypto.randomUUID()` or `new Date()`. Use field generators
 * when a model needs domain-specific fixture values.
 */
export const createFixtureBuilder = <
  TRegistration extends TableRegistration,
>(
  registration: TRegistration,
  options: FixtureBuilderOptions<TRegistration> = {},
): FixtureBuilder<TRegistration> => {
  const model = resolveModel(registration);
  const entityClass = resolveEntityClass(registration);
  const seed = hashSeed(options.seed);
  const random = createRandom(seed);
  const sequences = new Map<string, number>();
  let buildIndex = 0;

  const sequence = (key = "__default__") => {
    const next = (sequences.get(key) ?? 0) + 1;
    sequences.set(key, next);
    return next;
  };

  const build = (
    overrides: Partial<InferModelRecord<ModelOfRegistration<TRegistration>>> =
      {},
  ): InferModelRecord<ModelOfRegistration<TRegistration>> => {
    buildIndex += 1;
    const record: Partial<
      InferModelRecord<ModelOfRegistration<TRegistration>>
    > = {};

    for (const [fieldName, field] of Object.entries(model.fields)) {
      const typedFieldName = fieldName as
        & keyof InferModelRecord<
          ModelOfRegistration<TRegistration>
        >
        & string;

      if (Object.prototype.hasOwnProperty.call(overrides, fieldName)) {
        record[typedFieldName] = cloneFixtureValue(
          overrides[typedFieldName],
        ) as InferModelRecord<ModelOfRegistration<TRegistration>>[
          typeof typedFieldName
        ];
        continue;
      }

      const context: FixtureBuildContext<
        InferModelRecord<ModelOfRegistration<TRegistration>>
      > = {
        index: buildIndex,
        field: typedFieldName,
        modelName: model.name,
        record,
        random,
        pick<TValue>(values: readonly TValue[]): TValue {
          if (values.length === 0) {
            throw new Error("Cannot pick from an empty fixture value list.");
          }

          const selectedIndex = Math.floor(random() * values.length);
          return values[selectedIndex] as TValue;
        },
        seed,
        sequence,
      };

      const generator = options.generators?.[typedFieldName] as
        | FixtureFieldGenerator<
          InferModelRecord<ModelOfRegistration<TRegistration>>,
          typeof typedFieldName
        >
        | undefined;
      const value = generator
        ? generator(context)
        : defaultValueForField(model, fieldName, field, context);

      record[typedFieldName] = cloneFixtureValue(value) as InferModelRecord<
        ModelOfRegistration<TRegistration>
      >[typeof typedFieldName];
    }

    return record as InferModelRecord<ModelOfRegistration<TRegistration>>;
  };

  return {
    entityClass,
    model,
    build,
    buildMany(count, overrides) {
      if (!Number.isInteger(count) || count < 0) {
        throw new RangeError(
          `Fixture count must be a non-negative integer. Received: ${count}.`,
        );
      }

      return Array.from(
        { length: count },
        (_unused, index) => build(normalizeManyOverrides(index, overrides)),
      );
    },
    hydrate(overrides) {
      return hydrateEntityInstance(
        entityClass,
        build(overrides),
      ) as EntityOfRegistration<TRegistration>;
    },
    hydrateMany(count, overrides) {
      return this.buildMany(count, overrides).map((record) =>
        hydrateEntityInstance(
          entityClass,
          record,
        ) as EntityOfRegistration<TRegistration>
      );
    },
    async create(repo, overrides) {
      return await repo.create(build(overrides)) as EntityOfRegistration<
        TRegistration
      >;
    },
    async createMany(repo, count, overrides) {
      const created: Array<EntityOfRegistration<TRegistration>> = [];

      for (const record of this.buildMany(count, overrides)) {
        created.push(
          await repo.create(record) as EntityOfRegistration<TRegistration>,
        );
      }

      return created;
    },
    reset() {
      buildIndex = 0;
      sequences.clear();
    },
  };
};
