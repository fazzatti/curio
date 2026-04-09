import type {
  RelationDefinition,
  RelationKind,
  RelationNamespace,
} from "@/db/relation/types.ts";

export type {
  AnyRelationBuilder,
  NormalizeRelationDefinitions,
  RelationBuilderMap,
  RelationDefinition,
  RelationDefinitionMap,
  RelationKind,
  RelationNamespace,
} from "@/db/relation/types.ts";

/**
 * Fluent relation builder used inside `new Model({ relations: ... })`.
 *
 * @typeParam TKind The relation kind.
 * @typeParam TTarget The target model name.
 */
export class RelationBuilder<
  TKind extends RelationKind,
  TTarget extends string,
> {
  /** Internal resolved relation definition. */
  readonly definition: RelationDefinition<TKind, TTarget>;

  /**
   * @param kind Relation kind.
   * @param target Target model name.
   * @param definition Optional initial definition patch.
   */
  constructor(
    kind: TKind,
    target: TTarget,
    definition?: Partial<RelationDefinition<TKind, TTarget>>,
  ) {
    this.definition = {
      kind,
      target,
      foreignKey: definition?.foreignKey,
      references: definition?.references,
    };
  }

  /** Clones the builder with a definition patch applied. */
  protected with(
    patch: Partial<RelationDefinition<TKind, TTarget>>,
  ): RelationBuilder<TKind, TTarget> {
    return new RelationBuilder(this.definition.kind, this.definition.target, {
      ...this.definition,
      ...patch,
    });
  }

  /**
   * Sets the foreign-key field used by the relation.
   *
   * @param value Foreign-key field name.
   * @returns A new relation builder with the updated foreign-key metadata.
   */
  foreignKey(value: string): RelationBuilder<TKind, TTarget> {
    return this.with({ foreignKey: value });
  }

  /**
   * Sets the referenced target field. When omitted, Curio resolves the target
   * model primary key during database assembly.
   *
   * @param value Target field name.
   * @returns A new relation builder with the updated reference metadata.
   */
  references(value: string): RelationBuilder<TKind, TTarget> {
    return this.with({ references: value });
  }
}

/** Resolves a relation builder into its stored relation definition. */
export const resolveRelationDefinition = <
  TKind extends RelationKind,
  TTarget extends string,
>(
  builder: RelationBuilder<TKind, TTarget>,
): RelationDefinition<TKind, TTarget> => ({
  ...builder.definition,
});

/**
 * Relation-builder namespace used in model declarations.
 *
 * @remarks
 * Relations target models by name and are validated later during
 * `Database.create(...)`, which avoids cross-file import cycles between models.
 *
 * @example
 * ```ts
 * const SessionModel = new Model({
 *   name: "Session",
 *   table: "sessions",
 *   fields: {
 *     id: field.uuidId(),
 *     userId: field.uuid(),
 *   },
 *   relations: {
 *     user: relation.belongsTo("User").foreignKey("userId"),
 *   },
 * });
 * ```
 */
export const relation: RelationNamespace = {
  /**
   * Builds a `belongsTo` relation.
   *
   * @param target Target model name.
   * @returns A relation builder for a `belongsTo` relation.
   */
  belongsTo<TTarget extends string>(
    target: TTarget,
  ): RelationBuilder<"belongsTo", TTarget> {
    return new RelationBuilder("belongsTo", target);
  },

  /**
   * Builds a `hasMany` relation.
   *
   * @param target Target model name.
   * @returns A relation builder for a `hasMany` relation.
   */
  hasMany<TTarget extends string>(
    target: TTarget,
  ): RelationBuilder<"hasMany", TTarget> {
    return new RelationBuilder("hasMany", target);
  },
};
