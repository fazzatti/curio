import { REDACTED_FIELD_VALUE } from "@/db/field.ts";
import { entityBindingSymbol } from "@/db/entity/constants.ts";
import type {
  BoundEntityClass,
  CompatibleModel,
  EntityBinding,
  EntityClass,
  HydratedEntityInstance,
} from "@/db/entity/types.ts";
import type { AnyModel, InferModelRecord } from "@/db/types.ts";

export type {
  BoundEntityClass,
  CompatibleModel,
  EntityBinding,
  EntityClass,
  HydratedEntityInstance,
} from "@/db/entity/types.ts";

const bindEntityClass = <
  TModel extends AnyModel,
  TEntityClass extends EntityClass,
>(
  entityClass: TEntityClass,
  model: TModel,
): BoundEntityClass<TModel, InstanceType<TEntityClass>> => {
  class BoundEntity extends (entityClass as EntityClass) {}

  Object.defineProperty(BoundEntity, "model", {
    value: model,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  Object.defineProperty(BoundEntity, "entityName", {
    value: model.name,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  Object.defineProperty(BoundEntity, entityBindingSymbol, {
    value: {
      model,
      entityName: model.name,
    } satisfies EntityBinding<TModel>,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return BoundEntity as unknown as BoundEntityClass<
    TModel,
    InstanceType<TEntityClass>
  >;
};

/**
 * Curio entity base class.
 *
 * Extend this class to add computed getters and instance methods on top of a
 * model. Custom entity classes should declare the persisted fields they read
 * with `declare` properties so TypeScript can validate `Entity.from(model)`.
 *
 * @remarks
 * `declare` fields are a compile-time contract only. Curio does not inspect
 * those declarations at runtime. Runtime binding validates only the model
 * metadata Curio owns directly.
 *
 * Custom entity classes should avoid required constructor arguments. Curio
 * hydrates entities by constructing them with no arguments and then assigning
 * persisted field values afterward.
 *
 * @example
 * ```ts
 * class User extends Entity {
 *   declare email: string;
 *
 *   get emailDomain() {
 *     return this.email.split("@")[1];
 *   }
 * }
 *
 * const UserEntity = User.from(UserModel);
 * ```
 */
export abstract class Entity {
  /**
   * Binds a custom entity class to a Curio model.
   *
   * @param model Curio model to bind to the entity class.
   * @returns A bound entity class that can be registered in `Database.create(...)`.
   *
   * @remarks
   * TypeScript validates that the model record can satisfy the mutable
   * `declare` fields present on the custom entity class. Computed getters and
   * methods do not participate in that compatibility check.
   */
  static from<TModel extends AnyModel, TEntityClass extends EntityClass>(
    this: TEntityClass,
    model: CompatibleModel<TModel, InstanceType<TEntityClass>>,
  ): BoundEntityClass<TModel, InstanceType<TEntityClass>> {
    return bindEntityClass(this, model);
  }

  /**
   * Builds a safe JSON representation of the entity.
   *
   * @returns Persisted model fields with hidden fields omitted and obfuscated fields redacted.
   *
   * @remarks
   * `toJSON()` includes only persisted model fields. It does not serialize
   * loaded relations or computed getters.
   */
  toJSON(): Record<string, unknown> {
    const binding = getEntityBinding(
      this.constructor as BoundEntityClass,
    );

    if (!binding) {
      return Object.assign({}, this as Record<string, unknown>);
    }

    const output: Record<string, unknown> = {};

    for (const [fieldName, field] of Object.entries(binding.model.fields)) {
      const typedField = field as { hidden: boolean; obfuscate: boolean };

      if (typedField.hidden) {
        continue;
      }

      const value = (this as Record<string, unknown>)[fieldName];

      output[fieldName] = typedField.obfuscate ? REDACTED_FIELD_VALUE : value;
    }

    return output;
  }
}

/** Returns the bound model metadata for an entity class when available. */
export const getEntityBinding = <TModel extends AnyModel = AnyModel>(
  entityClass: EntityClass,
): EntityBinding<TModel> | undefined => {
  return (entityClass as BoundEntityClass<TModel>)[entityBindingSymbol];
};

/** Type guard for bound entity classes. */
export const isBoundEntityClass = (
  value: unknown,
): value is BoundEntityClass => {
  return typeof value === "function" &&
    Boolean((value as BoundEntityClass)[entityBindingSymbol]);
};

/**
 * Creates a default bound entity class for a model.
 *
 * @param model Curio model to wrap.
 * @returns A bound entity class with no extra behavior.
 */
export const createDefaultEntityClass = <TModel extends AnyModel>(
  model: TModel,
): BoundEntityClass<TModel, Entity> => {
  class DefaultEntity extends Entity {}

  return bindEntityClass(DefaultEntity, model);
};

/**
 * Hydrates a bound entity instance from persisted data.
 *
 * @param entityClass Bound entity class to instantiate.
 * @param record Persisted record data.
 * @param loadedRelations Optional already-loaded relation values.
 * @returns A hydrated entity instance.
 */
export const hydrateEntityInstance = <
  TModel extends AnyModel,
  TEntityBase extends Entity,
>(
  entityClass: BoundEntityClass<TModel, TEntityBase>,
  record: InferModelRecord<TModel>,
  loadedRelations?: Record<string, unknown>,
): HydratedEntityInstance<TEntityBase, InferModelRecord<TModel>> => {
  const instance = Reflect.construct(
    entityClass as unknown as new () => TEntityBase,
    [],
  ) as HydratedEntityInstance<TEntityBase, InferModelRecord<TModel>>;

  Object.assign(instance, record);

  if (loadedRelations) {
    Object.assign(instance, loadedRelations);
  }

  return instance;
};
