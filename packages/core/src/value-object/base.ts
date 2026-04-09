import type { SchemaValidationResult } from "@/schema/types.ts";
import { SchemaValidationError } from "@/schema/types.ts";
import {
  type InferValibotSchema,
  type ValibotSchema,
  valibotSchemaAdapter,
} from "@/schema/valibot.ts";

const valueObjectDefinitionSymbol = Symbol("curio.valueObjectDefinition");
const parsedValueSymbol = Symbol("curio.valueObjectParsed");

export type ValueObjectDefinition<
  TSchema extends ValibotSchema = ValibotSchema,
  TValue = InferValibotSchema<TSchema>,
> = {
  name?: string;
  schema: TSchema | (() => TSchema);
  equals?: (left: TValue, right: TValue) => boolean;
  serialize?: (value: TValue) => unknown;
};

export type ValueObjectClass<
  TValue = unknown,
  TSchema extends ValibotSchema = ValibotSchema,
> = {
  new (input: unknown): ValueObject<TValue>;
  readonly schema: TSchema;
  parse<TInstance extends ValueObject<TValue>>(
    this: new (input: unknown, marker?: symbol) => TInstance,
    input: unknown,
  ): TInstance;
  safeParse<TInstance extends ValueObject<TValue>>(
    this: new (input: unknown, marker?: symbol) => TInstance,
    input: unknown,
  ): SchemaValidationResult<TInstance>;
  is(input: unknown): boolean;
  from<TInstance extends ValueObject<TValue>>(
    this: new (input: unknown, marker?: symbol) => TInstance,
    input: TValue,
  ): TInstance;
  [valueObjectDefinitionSymbol]: ValueObjectDefinition<TSchema, TValue>;
};

const resolveDefinition = <
  TValue,
  TSchema extends ValibotSchema,
>(
  valueObject: ValueObjectClass<TValue, TSchema>,
): ValueObjectDefinition<TSchema, TValue> => {
  return valueObject[valueObjectDefinitionSymbol];
};

const resolveSchema = <
  TValue,
  TSchema extends ValibotSchema,
>(
  valueObject: ValueObjectClass<TValue, TSchema>,
): TSchema => {
  const definition = resolveDefinition(valueObject);

  return typeof definition.schema === "function"
    ? definition.schema()
    : definition.schema;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === "[object Object]";
};

const cloneValue = <TValue>(value: TValue): TValue => {
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

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => valuesEqual(value, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      valuesEqual(left[key], right[key])
    );
  }

  return false;
};

const parseValue = <
  TValue,
  TSchema extends ValibotSchema,
>(
  valueObject: ValueObjectClass<TValue, TSchema>,
  input: unknown,
): TValue => {
  return valibotSchemaAdapter.parse<TValue>(
    resolveSchema(valueObject),
    input,
  );
};

/**
 * Curio value-object base class.
 *
 * @remarks
 * Use `ValueObject.define(...)` to create a Valibot-backed base class and then
 * extend it with domain-specific getters or methods.
 */
export abstract class ValueObject<TValue = unknown> {
  readonly value!: TValue;

  protected constructor(value: TValue) {
    Object.defineProperty(this, "value", {
      configurable: false,
      enumerable: true,
      value: cloneValue(value),
      writable: false,
    });
  }

  equals(other: unknown): boolean {
    const valueObjectClass = this.constructor as ValueObjectClass<TValue>;
    const definition = resolveDefinition(valueObjectClass);
    const compare = definition.equals ?? valuesEqual;

    if (other instanceof ValueObject) {
      if (other.constructor !== this.constructor) {
        return false;
      }

      return compare(this.value, other.value);
    }

    return compare(this.value, other as TValue);
  }

  toJSON(): unknown {
    const valueObjectClass = this.constructor as ValueObjectClass<TValue>;
    const definition = resolveDefinition(valueObjectClass);

    return definition.serialize
      ? definition.serialize(this.value)
      : cloneValue(this.value);
  }

  toString(): string {
    return typeof this.value === "string"
      ? this.value
      : JSON.stringify(this.toJSON());
  }

  unwrap(): TValue {
    return this.value;
  }

  static define<
    const TSchema extends ValibotSchema,
    TValue = InferValibotSchema<TSchema>,
  >(
    definition: ValueObjectDefinition<TSchema, TValue>,
  ): ValueObjectClass<TValue, TSchema> {
    class DefinedValueObject extends ValueObject<TValue> {
      static readonly [valueObjectDefinitionSymbol] = definition;

      static get schema(): TSchema {
        return resolveSchema(this as ValueObjectClass<TValue, TSchema>);
      }

      constructor(input: unknown, marker?: symbol) {
        super(
          marker === parsedValueSymbol ? input as TValue : parseValue(
            DefinedValueObject as unknown as ValueObjectClass<TValue, TSchema>,
            input,
          ),
        );
      }

      static parse<TInstance extends ValueObject<TValue>>(
        this: new (input: unknown, marker?: symbol) => TInstance,
        input: unknown,
      ): TInstance {
        const parsed = parseValue(
          this as unknown as ValueObjectClass<TValue, TSchema>,
          input,
        );

        return new this(parsed, parsedValueSymbol);
      }

      static safeParse<TInstance extends ValueObject<TValue>>(
        this: new (input: unknown, marker?: symbol) => TInstance,
        input: unknown,
      ): SchemaValidationResult<TInstance> {
        const result = valibotSchemaAdapter.safeParse<TValue>(
          resolveSchema(this as unknown as ValueObjectClass<TValue, TSchema>),
          input,
        );

        if (!result.success) {
          return result;
        }

        return {
          success: true,
          output: new this(result.output, parsedValueSymbol),
        };
      }

      static is(input: unknown): boolean {
        if (input instanceof this) {
          return true;
        }

        return this.safeParse(input).success;
      }

      static from<TInstance extends ValueObject<TValue>>(
        this: new (input: unknown, marker?: symbol) => TInstance,
        input: TValue,
      ): TInstance {
        const parsed = parseValue(
          this as unknown as ValueObjectClass<TValue, TSchema>,
          input,
        );

        return new this(parsed, parsedValueSymbol);
      }
    }

    Object.defineProperty(
      DefinedValueObject,
      "name",
      {
        configurable: true,
        value: definition.name ?? "CurioValueObject",
      },
    );

    return DefinedValueObject as unknown as ValueObjectClass<TValue, TSchema>;
  }
}

export const isValueObjectClass = (
  value: unknown,
): value is ValueObjectClass => {
  return typeof value === "function" && valueObjectDefinitionSymbol in value;
};

export const isValueObjectInstance = (
  value: unknown,
): value is ValueObject => {
  return value instanceof ValueObject;
};

export const getValueObjectDefinition = <
  TValue = unknown,
  TSchema extends ValibotSchema = ValibotSchema,
>(
  valueObject: ValueObjectClass<TValue, TSchema>,
): ValueObjectDefinition<TSchema, TValue> => {
  return resolveDefinition(valueObject);
};

export const parseValueObject = <
  TValue,
  TSchema extends ValibotSchema,
>(
  valueObject: ValueObjectClass<TValue, TSchema>,
  input: unknown,
): InstanceType<ValueObjectClass<TValue, TSchema>> => {
  return valueObject.parse(input);
};

export const assertValueObject = <
  TValue,
  TSchema extends ValibotSchema,
>(
  valueObject: ValueObjectClass<TValue, TSchema>,
  input: unknown,
): asserts input is TValue => {
  if (!valueObject.is(input)) {
    throw new SchemaValidationError(
      `Value does not satisfy ${valueObject.name}.`,
      [],
    );
  }
};
