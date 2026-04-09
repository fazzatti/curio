import { entityBindingSymbol } from "@/db/entity/constants.ts";
import type { Entity } from "@/db/entity.ts";
import type { AnyModel, InferModelRecord, RawRecord } from "@/db/types.ts";

export type EntityBinding<TModel extends AnyModel = AnyModel> = {
  model: TModel;
  entityName: TModel["name"];
};

type IfEquals<TLeft, TRight, TThen, TElse> =
  (<T>() => T extends TLeft ? 1 : 2) extends (<T>() => T extends TRight ? 1 : 2)
    ? TThen
    : TElse;

type WritableKeys<TObject> = {
  [K in keyof TObject]-?: IfEquals<
    { [Q in K]: TObject[K] },
    { -readonly [Q in K]: TObject[K] },
    K,
    never
  >;
}[keyof TObject];

type NonFunctionWritableKeys<TObject> = {
  [K in WritableKeys<TObject>]-?: TObject[K] extends
    (...args: never[]) => unknown ? never
    : K;
}[WritableKeys<TObject>];

type EntityDeclaredFieldKeys<TEntity extends Entity> = Exclude<
  NonFunctionWritableKeys<TEntity>,
  keyof Entity
>;

type EntityDeclaredFieldRecord<TEntity extends Entity> = Pick<
  TEntity,
  EntityDeclaredFieldKeys<TEntity>
>;

export type CompatibleModel<
  TModel extends AnyModel,
  TEntity extends Entity,
> = InferModelRecord<TModel> extends EntityDeclaredFieldRecord<TEntity> ? TModel
  : never;

/** Any entity constructor accepted by the Curio entity layer. */
export type EntityClass<TEntity extends Entity = Entity> = abstract new (
  ...args: never[]
) => TEntity;

/**
 * Hydrated entity instance shape combining the entity base class with model fields.
 *
 * @typeParam TEntityBase The custom entity class.
 * @typeParam TRecord The persisted model record.
 */
export type HydratedEntityInstance<
  TEntityBase extends Entity = Entity,
  TRecord extends RawRecord = RawRecord,
> = TEntityBase & TRecord;

/**
 * Entity class already bound to a specific model.
 *
 * @typeParam TModel The bound Curio model.
 * @typeParam TEntityBase The custom entity base class.
 */
export type BoundEntityClass<
  TModel extends AnyModel = AnyModel,
  TEntityBase extends Entity = Entity,
> =
  & EntityClass<TEntityBase>
  & {
    readonly [entityBindingSymbol]: EntityBinding<TModel>;
    readonly model: TModel;
    readonly entityName: TModel["name"];
  };
