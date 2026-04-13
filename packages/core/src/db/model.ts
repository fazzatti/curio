// deno-coverage-ignore-start
import { type FieldBuilderMap, resolveFieldDefinition } from "@/db/field.ts";
import {
  type RelationBuilderMap,
  resolveRelationDefinition,
} from "@/db/relation.ts";
import type {
  ModelLabels,
  ModelValidationConfig,
  OrderByClause,
} from "@/db/types.ts";
import type {
  AnyModelVariant,
  ModelVariant,
} from "@/db/variant.ts";
import type {
  ModelOptions,
  ResolvedModelFields,
  ResolvedModelRelations,
} from "@/db/model/types.ts";
import {
  DuplicateModelVariantError,
  InvalidModelPrimaryKeyError,
  ModelFieldConflictError,
  ModelMetadataConflictError,
} from "@/db/errors.ts";
// deno-coverage-ignore-stop

export type {
  ModelOptions,
  ResolvedModelFields,
  ResolvedModelRelations,
} from "@/db/model/types.ts";

type ModelMetadataSource = {
  labels?: ModelLabels;
  defaultOrder?: OrderByClause<Record<string, unknown>>;
};

const mergeMetadata = (
  modelName: string,
  current: ModelMetadataSource,
  incoming: ModelMetadataSource,
  firstSource: string,
  secondSource: string,
): ModelMetadataSource => {
  const next: ModelMetadataSource = {
    ...current,
  };

  if (incoming.defaultOrder?.length) {
    if (next.defaultOrder?.length) {
      throw new ModelMetadataConflictError(
        modelName,
        "defaultOrder",
        firstSource,
        secondSource,
      );
    }

    next.defaultOrder = incoming.defaultOrder;
  }

  if (incoming.labels) {
    if (incoming.labels.singular && next.labels?.singular) {
      throw new ModelMetadataConflictError(
        modelName,
        "labels.singular",
        firstSource,
        secondSource,
      );
    }

    if (incoming.labels.plural && next.labels?.plural) {
      throw new ModelMetadataConflictError(
        modelName,
        "labels.plural",
        firstSource,
        secondSource,
      );
    }

    next.labels = {
      ...next.labels,
      ...incoming.labels,
    };
  }

  return next;
};

/**
 * Curio persistence model.
 *
 * Models are explicit persistence definitions. They own stored fields,
 * relations, and model-level metadata, but they do not carry higher-level
 * entity behavior.
 *
 * @example
 * ```ts
 * const UserModel = new Model({
 *   name: "User",
 *   table: "users",
 *   uses: [UuidPrimaryKey],
 *   fields: {
 *     email: field.string().required().unique(),
 *   },
 *   relations: {
 *     sessions: relation.hasMany("Session").foreignKey("userId"),
 *   },
 * });
 * ```
 *
 * @remarks
 * Variants added through `uses: []` are applied during construction. Curio
 * throws immediately when variants or explicit fields collide.
 *
 * @typeParam TName The model name.
 * @typeParam TFields The resolved field-definition map stored on the model.
 * @typeParam TRelations The resolved relation-definition map stored on the model.
 */
export class Model<
  TName extends string = string,
  TFields extends FieldBuilderMap = FieldBuilderMap,
  TRelations extends RelationBuilderMap = RelationBuilderMap,
  TUses extends readonly AnyModelVariant[] = readonly [],
> {
  /** Model name used across the DB registry. */
  readonly name: TName;
  /** Physical table name used by persistence adapters. */
  readonly table: string;
  /** Resolved model fields keyed by field name. */
  readonly fields: ResolvedModelFields<TFields, TUses>;
  /** Resolved model relations keyed by relation name. */
  readonly relations: ResolvedModelRelations<TRelations>;
  /** Human-friendly labels associated with the model. */
  readonly labels: ModelLabels;
  /** Default ordering applied when queries omit `orderBy`. */
  readonly defaultOrder?: OrderByClause<Record<string, unknown>>;
  /** Optional model-level validation bindings. */
  readonly validation?: ModelValidationConfig;
  /** Resolved primary-key field name. */
  readonly primaryKey: keyof ResolvedModelFields<TFields, TUses> & string;
  /** Variants applied during construction. */
  readonly uses: readonly ModelVariant[];

  /**
   * @param options Model definition input.
   */
  constructor(options: ModelOptions<TName, TFields, TRelations, TUses>) {
    const variantNames = new Set<string>();
    const variantFields: FieldBuilderMap = {};
    let variantMetadata: ModelMetadataSource = {};
    let variantMetadataSource = "variant";

    for (const variant of options.uses ?? []) {
      if (variantNames.has(variant.name)) {
        throw new DuplicateModelVariantError(options.name, variant.name);
      }

      variantNames.add(variant.name);

      for (const [fieldName, builder] of Object.entries(variant.fields ?? {})) {
        if (variantFields[fieldName]) {
          throw new ModelFieldConflictError(
            options.name,
            fieldName,
            `variant "${variantMetadataSource}"`,
            `variant "${variant.name}"`,
          );
        }

        variantFields[fieldName] = builder;
      }

      variantMetadata = mergeMetadata(
        options.name,
        variantMetadata,
        {
          labels: variant.labels,
          defaultOrder: variant.defaultOrder as
            | OrderByClause<Record<string, unknown>>
            | undefined,
        },
        `variant "${variantMetadataSource}"`,
        `variant "${variant.name}"`,
      );

      variantMetadataSource = variant.name;
    }

    const explicitFields = options.fields ?? {} as TFields;
    for (const fieldName of Object.keys(explicitFields)) {
      if (variantFields[fieldName]) {
        throw new ModelFieldConflictError(
          options.name,
          fieldName,
          "variant",
          "explicit fields",
        );
      }
    }

    const resolvedFields = Object.fromEntries(
      [
        ...Object.entries(variantFields),
        ...Object.entries(explicitFields),
      ].map(([fieldName, builder]) => [
        fieldName,
        resolveFieldDefinition(builder, fieldName),
      ]),
    ) as ResolvedModelFields<TFields, TUses>;

    let metadata = mergeMetadata(
      options.name,
      variantMetadata,
      {
        labels: options.labels,
        defaultOrder: options.defaultOrder,
      },
      "variant",
      "explicit model metadata",
    );

    const resolvedLabels = {
      singular: metadata.labels?.singular ?? options.name,
      plural: metadata.labels?.plural ?? `${options.name}s`,
    };
    metadata = {
      labels: resolvedLabels,
      defaultOrder: metadata.defaultOrder,
    };

    const resolvedRelations = Object.fromEntries(
      Object.entries(options.relations ?? {}).map(([relationName, builder]) => [
        relationName,
        resolveRelationDefinition(builder),
      ]),
    ) as ResolvedModelRelations<TRelations>;

    const primaryKeys = Object.entries(resolvedFields)
      .filter(([, field]) =>
        typeof field === "object" && field !== null && "primaryKey" in field &&
        (field as { primaryKey: boolean }).primaryKey
      )
      .map(([fieldName]) => fieldName);

    if (primaryKeys.length !== 1) {
      throw new InvalidModelPrimaryKeyError(options.name, primaryKeys.length);
    }

    this.name = options.name;
    this.table = options.table;
    this.fields = resolvedFields;
    this.relations = resolvedRelations;
    this.labels = resolvedLabels;
    this.defaultOrder = metadata.defaultOrder;
    this.validation = options.validation;
    this.primaryKey = primaryKeys[0] as
      & keyof ResolvedModelFields<TFields, TUses>
      & string;
    this.uses = [...(options.uses ?? [])];
  }
}
