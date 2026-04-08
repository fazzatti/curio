import type {
  AnyFieldBuilder,
  FieldBuilder,
  FieldBuilderMap,
} from "@/db/field.ts";

type Simplify<TObject> =
  & {
    [K in keyof TObject]: TObject[K];
  }
  & Record<never, never>;

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void ? TIntersection
  : never;

/** Labels that can be attached to a model definition. */
export type ModelVariantLabels = {
  singular?: string;
  plural?: string;
};

/** Small model-ordering shape shared with variants. */
export type ModelVariantOrder = Array<Record<string, "asc" | "desc">>;

/**
 * Declarative model variant applied through `uses: []`.
 *
 * Variants in the first DB slice may contribute fields and model-level
 * metadata only. Conflicts are validated during model construction.
 */
export type ModelVariant<
  TFields extends FieldBuilderMap = Record<never, never>,
> = {
  name: string;
  fields?: TFields;
  labels?: ModelVariantLabels;
  defaultOrder?: ModelVariantOrder;
};

/** Any model variant. */
export type AnyModelVariant = ModelVariant<FieldBuilderMap>;

/** Combines the field contributions of a variant tuple into one field map. */
export type VariantFieldMap<TVariants extends readonly AnyModelVariant[]> =
  Simplify<
    UnionToIntersection<
      TVariants[number] extends ModelVariant<infer TFields> ? TFields
        : Record<never, never>
    >
  >;

export type { AnyFieldBuilder, FieldBuilder, FieldBuilderMap };
