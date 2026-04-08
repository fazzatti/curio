import {
  type AnyFieldBuilder,
  field,
  type FieldBuilder,
  type FieldBuilderMap,
} from "@/db/field.ts";
import type { ModelVariant } from "@/db/variant/types.ts";

export type {
  AnyModelVariant,
  ModelVariant,
  ModelVariantLabels,
  ModelVariantOrder,
  VariantFieldMap,
} from "@/db/variant/types.ts";

/** Clones a variant field map so model construction remains immutable. */
export const cloneVariantFields = (
  fields: FieldBuilderMap | undefined,
): Record<string, AnyFieldBuilder> => {
  if (!fields) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fields).map(([key, builder]) => [key, builder]),
  );
};

/**
 * Adds a conventional UUID primary key named `id`.
 *
 * @example
 * ```ts
 * const UserModel = new Model({
 *   name: "User",
 *   table: "users",
 *   uses: [UuidPrimaryKey],
 *   fields: {
 *     email: field.string().required(),
 *   },
 * });
 * ```
 */
export const UuidPrimaryKey: ModelVariant<{
  id: FieldBuilder<string, "uuid">;
}> = {
  name: "UuidPrimaryKey",
  fields: {
    id: field.uuidId(),
  },
};

/**
 * Adds `createdAt` and `updatedAt` datetime fields.
 *
 * @remarks
 * In the first DB slice this variant contributes only fields. It does not yet
 * add automatic update-time behavior.
 */
export const Timestamps: ModelVariant<{
  createdAt: FieldBuilder<Date, "datetime">;
  updatedAt: FieldBuilder<Date, "datetime">;
}> = {
  name: "Timestamps",
  fields: {
    createdAt: field.datetime({
      default: () => new Date(),
      sortable: true,
    }),
    updatedAt: field.datetime({
      default: () => new Date(),
      sortable: true,
    }),
  },
};
