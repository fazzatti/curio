import type { FieldBuilderMap, NormalizeFieldDefinitions } from "@/db/field.ts";
import type {
  NormalizeRelationDefinitions,
  RelationBuilderMap,
} from "@/db/relation.ts";
import type {
  ModelLabels,
  ModelValidationConfig,
  OrderByClause,
} from "@/db/types.ts";
import type { AnyModelVariant, VariantFieldMap } from "@/db/variant.ts";

/**
 * Model constructor input.
 *
 * @typeParam TName The model name.
 * @typeParam TFields Field-builder map declared on the model.
 * @typeParam TRelations Relation-builder map declared on the model.
 */
export type ModelOptions<
  TName extends string = string,
  TFields extends FieldBuilderMap = FieldBuilderMap,
  TRelations extends RelationBuilderMap = RelationBuilderMap,
  TUses extends readonly AnyModelVariant[] = readonly [],
> = {
  name: TName;
  table: string;
  uses?: TUses;
  fields?: TFields;
  relations?: TRelations;
  labels?: ModelLabels;
  defaultOrder?: OrderByClause<Record<string, unknown>>;
  validation?: ModelValidationConfig;
};

export type ResolvedModelFields<
  TFields extends FieldBuilderMap,
  TUses extends readonly AnyModelVariant[],
> = NormalizeFieldDefinitions<VariantFieldMap<TUses> & TFields>;

export type ResolvedModelRelations<TRelations extends RelationBuilderMap> =
  NormalizeRelationDefinitions<TRelations>;
