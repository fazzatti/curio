// deno-coverage-ignore-start
import type {
  EnumFieldOptions,
  FieldDefault,
  FieldDefinition,
  FieldKind,
  FieldNamespace,
  FieldOptions,
} from "@/db/field/types.ts";

export type {
  AnyFieldBuilder,
  EnumFieldOptions,
  FieldBuilderMap,
  FieldDefault,
  FieldDefinition,
  FieldDefinitionMap,
  FieldKind,
  FieldNamespace,
  FieldOptions,
  InferFieldRecord,
  NormalizeFieldDefinitions,
} from "@/db/field/types.ts";
// deno-coverage-ignore-stop

/** Redacted value used for obfuscated field representations. */
export const REDACTED_FIELD_VALUE = "<redacted>";

const normalizeFieldDefinition = <TValue, TKind extends FieldKind>(
  kind: TKind,
  options?: Partial<FieldDefinition<TValue, TKind>>,
): FieldDefinition<TValue, TKind> => ({
  kind,
  required: options?.required ?? false,
  nullable: options?.nullable ?? false,
  default: options?.default,
  unique: options?.unique ?? false,
  primaryKey: options?.primaryKey ?? false,
  hidden: options?.hidden ?? false,
  obfuscate: options?.obfuscate ?? false,
  searchable: options?.searchable ?? true,
  sortable: options?.sortable ?? false,
  column: options?.column ?? "",
  values: options?.values,
});

/**
 * Fluent field builder used inside `new Model({ fields: ... })`.
 *
 * Common flags can be provided either through the constructor options or
 * through chained modifiers. Chained modifiers always win over earlier options.
 *
 * @typeParam TValue The hydrated entity value produced by this field.
 * @typeParam TKind The underlying Curio field kind.
 */
export class FieldBuilder<
  TValue,
  TKind extends FieldKind = FieldKind,
> {
  /** Internal resolved field definition. */
  readonly definition: FieldDefinition<TValue, TKind>;

  /**
   * @param kind Curio field kind.
   * @param definition Optional initial definition values.
   */
  constructor(
    kind: TKind,
    definition?: Partial<FieldDefinition<TValue, TKind>>,
  ) {
    this.definition = normalizeFieldDefinition(kind, definition);
  }

  /** Clones the builder with a definition patch applied. */
  protected with<TNextValue = TValue>(
    patch: Partial<FieldDefinition<TNextValue, TKind>>,
  ): FieldBuilder<TNextValue, TKind> {
    const nextDefinition = {
      ...this.definition,
      ...patch,
    } as unknown as Partial<FieldDefinition<TNextValue, TKind>>;

    return new FieldBuilder<TNextValue, TKind>(
      this.definition.kind,
      nextDefinition,
    );
  }

  /**
   * Marks the field as required or not required.
   *
   * @param value Whether the field should be required. Defaults to `true`.
   * @returns A new field builder with the updated requirement flag.
   */
  required(value = true): FieldBuilder<TValue, TKind> {
    return this.with({ required: value });
  }

  /**
   * Marks the field as nullable or non-nullable.
   *
   * @param value Whether the field should allow `null`. Defaults to `true`.
   * @returns A new field builder with the updated nullability.
   */
  nullable<TEnabled extends boolean = true>(
    value: TEnabled = true as TEnabled,
  ): FieldBuilder<
    TEnabled extends false ? Exclude<TValue, null> : TValue | null,
    TKind
  > {
    return this.with({
      nullable: value,
    }) as FieldBuilder<
      TEnabled extends false ? Exclude<TValue, null> : TValue | null,
      TKind
    >;
  }

  /**
   * Assigns a default value or factory.
   *
   * @param value Default value or factory used when a create payload omits the field.
   * @returns A new field builder with the updated default.
   */
  default(value: FieldDefault<TValue>): FieldBuilder<TValue, TKind> {
    return this.with({ default: value });
  }

  /**
   * Marks the field as unique or not unique.
   *
   * @param value Whether the field should be unique. Defaults to `true`.
   * @returns A new field builder with the updated uniqueness flag.
   */
  unique(value = true): FieldBuilder<TValue, TKind> {
    return this.with({ unique: value });
  }

  /**
   * Marks the field as a primary key or not.
   *
   * @param value Whether the field should be the model primary key. Defaults to `true`.
   * @returns A new field builder with the updated primary-key flag.
   */
  primaryKey(value = true): FieldBuilder<TValue, TKind> {
    return this.with({
      primaryKey: value,
      required: value ? true : this.definition.required,
      unique: value ? true : this.definition.unique,
    });
  }

  /**
   * Hides the field from safe representations such as `toJSON()`.
   *
   * @param value Whether the field should be hidden. Defaults to `true`.
   * @returns A new field builder with the updated hidden flag.
   */
  hidden(value = true): FieldBuilder<TValue, TKind> {
    return this.with({ hidden: value });
  }

  /**
   * Redacts the field value in safe representations while keeping the key visible.
   *
   * @param value Whether the field should be obfuscated. Defaults to `true`.
   * @returns A new field builder with the updated obfuscation flag.
   */
  obfuscate(value = true): FieldBuilder<TValue, TKind> {
    return this.with({ obfuscate: value });
  }

  /**
   * Marks the field as searchable or not.
   *
   * @param value Whether higher-level Curio tools should treat this field as searchable. Defaults to `true`.
   * @returns A new field builder with the updated searchable flag.
   */
  searchable(value = true): FieldBuilder<TValue, TKind> {
    return this.with({ searchable: value });
  }

  /**
   * Marks the field as sortable or not.
   *
   * @param value Whether higher-level Curio tools should treat this field as sortable. Defaults to `true`.
   * @returns A new field builder with the updated sortable flag.
   */
  sortable(value = true): FieldBuilder<TValue, TKind> {
    return this.with({ sortable: value });
  }

  /**
   * Overrides the physical column name used by persistence adapters.
   *
   * @param value Custom column name.
   * @returns A new field builder with the updated column metadata.
   */
  column(value: string): FieldBuilder<TValue, TKind> {
    return this.with({ column: value });
  }
}

/** Resolves a field builder into its stored field definition. */
export const resolveFieldDefinition = <TValue, TKind extends FieldKind>(
  builder: FieldBuilder<TValue, TKind>,
  fieldName: string,
): FieldDefinition<TValue, TKind> => ({
  ...builder.definition,
  column: builder.definition.column || fieldName,
});

/**
 * Applies a field default value when one is configured.
 *
 * @param field Field definition holding the default.
 * @returns The resolved default value.
 *
 * @typeParam TValue The field value type.
 */
export const resolveFieldDefault = <TValue>(
  field: FieldDefinition<TValue>,
): TValue | undefined => {
  if (typeof field.default === "function") {
    return (field.default as (() => TValue))();
  }

  return field.default;
};

/**
 * Field-builder namespace used in model declarations.
 *
 * @remarks
 * Use these helpers inside `new Model({ fields: ... })` to declare persisted
 * fields. Constructor options are optional and do not disable further chaining.
 *
 * @example
 * ```ts
 * const UserModel = new Model({
 *   name: "User",
 *   table: "users",
 *   fields: {
 *     id: field.uuidId(),
 *     email: field.string({ unique: true }).searchable(),
 *     passwordHash: field.string().hidden(),
 *   },
 * });
 * ```
 */
export const field: FieldNamespace = {
  /**
   * Builds a string primary-key field without a default generator.
   *
   * @param options Optional field configuration overrides.
   * @returns A string primary-key field builder.
   */
  id(options?: FieldOptions<string>): FieldBuilder<string, "id"> {
    return new FieldBuilder("id", {
      required: true,
      primaryKey: true,
      unique: true,
      ...options,
    });
  },

  /**
   * Builds a UUID string field.
   *
   * @param options Optional field configuration overrides.
   * @returns A UUID field builder.
   */
  uuid(options?: FieldOptions<string>): FieldBuilder<string, "uuid"> {
    return new FieldBuilder("uuid", options);
  },

  /**
   * Builds a UUID primary-key field with an automatic UUID default.
   *
   * @param options Optional field configuration overrides.
   * @returns A UUID primary-key field builder.
   */
  uuidId(options?: FieldOptions<string>): FieldBuilder<string, "uuid"> {
    return new FieldBuilder("uuid", {
      required: true,
      primaryKey: true,
      unique: true,
      default: () => crypto.randomUUID(),
      ...options,
    });
  },

  /**
   * Builds a string field.
   *
   * @param options Optional field configuration overrides.
   * @returns A string field builder.
   */
  string(options?: FieldOptions<string>): FieldBuilder<string, "string"> {
    return new FieldBuilder("string", options);
  },

  /**
   * Builds a text field.
   *
   * @param options Optional field configuration overrides.
   * @returns A text field builder.
   */
  text(options?: FieldOptions<string>): FieldBuilder<string, "text"> {
    return new FieldBuilder("text", options);
  },

  /**
   * Builds a boolean field.
   *
   * @param options Optional field configuration overrides.
   * @returns A boolean field builder.
   */
  boolean(options?: FieldOptions<boolean>): FieldBuilder<boolean, "boolean"> {
    return new FieldBuilder("boolean", options);
  },

  /**
   * Builds an integer field.
   *
   * @param options Optional field configuration overrides.
   * @returns An integer field builder.
   */
  integer(options?: FieldOptions<number>): FieldBuilder<number, "integer"> {
    return new FieldBuilder("integer", options);
  },

  /**
   * Builds a generic numeric field.
   *
   * @param options Optional field configuration overrides.
   * @returns A number field builder.
   */
  number(options?: FieldOptions<number>): FieldBuilder<number, "number"> {
    return new FieldBuilder("number", options);
  },

  /**
   * Builds a datetime field represented as a `Date` instance in hydrated entities.
   *
   * @param options Optional field configuration overrides.
   * @returns A datetime field builder.
   */
  datetime(options?: FieldOptions<Date>): FieldBuilder<Date, "datetime"> {
    return new FieldBuilder("datetime", options);
  },

  /**
   * Builds a JSON field.
   *
   * @param options Optional field configuration overrides.
   * @returns A JSON field builder.
   *
   * @typeParam TValue The JSON payload type stored in the field.
   */
  json<TValue = unknown>(
    options?: FieldOptions<TValue>,
  ): FieldBuilder<TValue, "json"> {
    return new FieldBuilder("json", options);
  },

  /**
   * Builds an enum field constrained to a fixed set of string values.
   *
   * @param values Allowed enum values.
   * @param options Optional field configuration overrides.
   * @returns An enum field builder.
   *
   * @typeParam TValue The string union represented by the enum values.
   */
  enum<const TValue extends string>(
    values: readonly TValue[],
    options?: Omit<EnumFieldOptions<TValue>, "values">,
  ): FieldBuilder<TValue, "enum"> {
    return new FieldBuilder("enum", {
      values,
      ...options,
    });
  },
};
