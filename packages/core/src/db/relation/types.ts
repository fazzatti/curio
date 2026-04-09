import type { RelationBuilder } from "@/db/relation.ts";

/** Relation kinds supported by the first Curio DB slice. */
export type RelationKind = "belongsTo" | "hasMany";

/** Fully-resolved relation metadata stored on a model. */
export type RelationDefinition<
  TKind extends RelationKind = RelationKind,
  TTarget extends string = string,
> = {
  kind: TKind;
  target: TTarget;
  foreignKey?: string;
  references?: string;
};

/** Map of stored relation definitions keyed by relation name. */
export type RelationDefinitionMap = Record<string, RelationDefinition>;

/** Any relation builder instance. */
export type AnyRelationBuilder = RelationBuilder<RelationKind, string>;

/** Map of relation builders keyed by relation name. */
export type RelationBuilderMap = Record<string, AnyRelationBuilder>;

/** Normalizes relation builders into stored relation definitions. */
export type NormalizeRelationDefinitions<
  TRelations extends RelationBuilderMap,
> = {
  [K in keyof TRelations]: TRelations[K] extends RelationBuilder<
    infer TKind,
    infer TTarget
  > ? RelationDefinition<TKind, TTarget>
    : never;
};

/** Public relation-builder namespace shape. */
export type RelationNamespace = {
  belongsTo<TTarget extends string>(
    target: TTarget,
  ): RelationBuilder<"belongsTo", TTarget>;
  hasMany<TTarget extends string>(
    target: TTarget,
  ): RelationBuilder<"hasMany", TTarget>;
};
