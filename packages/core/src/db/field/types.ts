import type { FieldBuilder } from "@/db/field.ts";

/** Built-in field kinds supported by the first Curio DB slice. */
export type FieldKind =
  | "id"
  | "uuid"
  | "string"
  | "text"
  | "boolean"
  | "integer"
  | "number"
  | "datetime"
  | "json"
  | "enum";

/** Default value accepted by a field definition. */
export type FieldDefault<TValue> = TValue | (() => TValue);

/** Shared field options accepted both in constructors and via chaining. */
export type FieldOptions<TValue> = {
  required?: boolean;
  nullable?: boolean;
  default?: FieldDefault<TValue>;
  unique?: boolean;
  primaryKey?: boolean;
  hidden?: boolean;
  obfuscate?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  column?: string;
};

/** Additional options accepted by enum fields. */
export type EnumFieldOptions<TValue extends string> = FieldOptions<TValue> & {
  values: readonly TValue[];
};

/** Fully-resolved field metadata stored on a model. */
export type FieldDefinition<
  TValue = unknown,
  TKind extends FieldKind = FieldKind,
> = {
  kind: TKind;
  required: boolean;
  nullable: boolean;
  default?: FieldDefault<TValue>;
  unique: boolean;
  primaryKey: boolean;
  hidden: boolean;
  obfuscate: boolean;
  searchable: boolean;
  sortable: boolean;
  column: string;
  values?: readonly TValue[];
};

/** Any field definition map keyed by model field name. */
export type FieldDefinitionMap = Record<string, FieldDefinition>;

/** Any field builder map keyed by model field name. */
export type FieldBuilderMap = Record<string, AnyFieldBuilder>;

/** Any field builder instance. */
export type AnyFieldBuilder = FieldBuilder<unknown, FieldKind>;

/** Normalizes a field-builder map into stored field definitions. */
export type NormalizeFieldDefinitions<TFields extends FieldBuilderMap> = {
  [K in keyof TFields]: TFields[K] extends
    FieldBuilder<infer TValue, infer TKind> ? FieldDefinition<TValue, TKind>
    : never;
};

/** Infers the record shape represented by a field-definition map. */
export type InferFieldRecord<TFields extends FieldDefinitionMap> = {
  [K in keyof TFields]: TFields[K] extends
    FieldDefinition<infer TValue, FieldKind> ? TValue
    : never;
};

/** Public field-builder namespace shape. */
export type FieldNamespace = {
  id(options?: FieldOptions<string>): FieldBuilder<string, "id">;
  uuid(options?: FieldOptions<string>): FieldBuilder<string, "uuid">;
  uuidId(options?: FieldOptions<string>): FieldBuilder<string, "uuid">;
  string(options?: FieldOptions<string>): FieldBuilder<string, "string">;
  text(options?: FieldOptions<string>): FieldBuilder<string, "text">;
  boolean(options?: FieldOptions<boolean>): FieldBuilder<boolean, "boolean">;
  integer(options?: FieldOptions<number>): FieldBuilder<number, "integer">;
  number(options?: FieldOptions<number>): FieldBuilder<number, "number">;
  datetime(options?: FieldOptions<Date>): FieldBuilder<Date, "datetime">;
  json<TValue = unknown>(
    options?: FieldOptions<TValue>,
  ): FieldBuilder<TValue, "json">;
  enum<const TValue extends string>(
    values: readonly TValue[],
    options?: Omit<EnumFieldOptions<TValue>, "values">,
  ): FieldBuilder<TValue, "enum">;
};
