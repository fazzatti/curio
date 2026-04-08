/** Error thrown when a model ends up with an invalid primary-key setup. */
export class InvalidModelPrimaryKeyError extends Error {
  /**
   * @param modelName The model whose primary-key setup is invalid.
   * @param primaryKeyCount The number of primary-key fields discovered.
   */
  constructor(modelName: string, primaryKeyCount: number) {
    super(
      `Model "${modelName}" must define exactly one primary key, but ${primaryKeyCount} were found.`,
    );
    this.name = "InvalidModelPrimaryKeyError";
  }
}

/** Error thrown when a variant is registered more than once on the same model. */
export class DuplicateModelVariantError extends Error {
  /**
   * @param modelName The model receiving the duplicated variant.
   * @param variantName The duplicated variant name.
   */
  constructor(modelName: string, variantName: string) {
    super(
      `Model "${modelName}" registers the variant "${variantName}" more than once.`,
    );
    this.name = "DuplicateModelVariantError";
  }
}

/** Error thrown when two model contributors try to define the same field. */
export class ModelFieldConflictError extends Error {
  /**
   * @param modelName The model where the conflict happened.
   * @param fieldName The conflicting field name.
   * @param firstSource The contributor that defined the field first.
   * @param secondSource The contributor that attempted to redefine it.
   */
  constructor(
    modelName: string,
    fieldName: string,
    firstSource: string,
    secondSource: string,
  ) {
    super(
      `Model "${modelName}" cannot define field "${fieldName}" from both ${firstSource} and ${secondSource}.`,
    );
    this.name = "ModelFieldConflictError";
  }
}

/** Error thrown when two model contributors collide on the same metadata key. */
export class ModelMetadataConflictError extends Error {
  /**
   * @param modelName The model where the conflict happened.
   * @param metadataKey The metadata key that conflicted.
   * @param firstSource The contributor that defined the metadata first.
   * @param secondSource The contributor that attempted to redefine it.
   */
  constructor(
    modelName: string,
    metadataKey: string,
    firstSource: string,
    secondSource: string,
  ) {
    super(
      `Model "${modelName}" cannot define metadata "${metadataKey}" from both ${firstSource} and ${secondSource}.`,
    );
    this.name = "ModelMetadataConflictError";
  }
}

/** Error thrown when a database registration key does not match its model name. */
export class TableRegistrationNameMismatchError extends Error {
  /**
   * @param registrationKey The key used in `Database.create({ tables })`.
   * @param modelName The actual model name discovered from the registration.
   */
  constructor(registrationKey: string, modelName: string) {
    super(
      `Table registration key "${registrationKey}" does not match model name "${modelName}".`,
    );
    this.name = "TableRegistrationNameMismatchError";
  }
}

/** Error thrown when a table key would shadow a core database API member. */
export class ReservedTableKeyError extends Error {
  /**
   * @param key The conflicting table registration key.
   */
  constructor(key: string) {
    super(
      `Table registration key "${key}" is reserved by the database API and cannot be used as a direct repository property.`,
    );
    this.name = "ReservedTableKeyError";
  }
}

/** Error thrown when a relation targets an unknown model. */
export class UnknownRelationTargetError extends Error {
  /**
   * @param modelName The source model declaring the relation.
   * @param relationName The relation name.
   * @param targetName The missing relation target.
   */
  constructor(
    modelName: string,
    relationName: string,
    targetName: string,
  ) {
    super(
      `Relation "${modelName}.${relationName}" targets unknown model "${targetName}".`,
    );
    this.name = "UnknownRelationTargetError";
  }
}

/** Error thrown when a relation does not declare its foreign key. */
export class MissingRelationForeignKeyError extends Error {
  /**
   * @param modelName The source model declaring the relation.
   * @param relationName The relation name.
   */
  constructor(modelName: string, relationName: string) {
    super(
      `Relation "${modelName}.${relationName}" must declare a foreign key.`,
    );
    this.name = "MissingRelationForeignKeyError";
  }
}

/** Error thrown when a relation references an unknown foreign-key field. */
export class UnknownRelationForeignKeyError extends Error {
  /**
   * @param modelName The source model declaring the relation.
   * @param relationName The relation name.
   * @param foreignKey The missing foreign-key field.
   */
  constructor(
    modelName: string,
    relationName: string,
    foreignKey: string,
  ) {
    super(
      `Relation "${modelName}.${relationName}" references unknown foreign key "${foreignKey}".`,
    );
    this.name = "UnknownRelationForeignKeyError";
  }
}

/** Error thrown when a relation references an unknown target field. */
export class UnknownRelationReferenceError extends Error {
  /**
   * @param modelName The source model declaring the relation.
   * @param relationName The relation name.
   * @param targetName The target model name.
   * @param referenceField The missing reference field on the target side.
   */
  constructor(
    modelName: string,
    relationName: string,
    targetName: string,
    referenceField: string,
  ) {
    super(
      `Relation "${modelName}.${relationName}" references unknown field "${referenceField}" on model "${targetName}".`,
    );
    this.name = "UnknownRelationReferenceError";
  }
}

/** Error thrown when a lookup expected an entity but none matched. */
export class NotFoundError extends Error {
  /**
   * @param modelName The model that was queried.
   * @param detail Optional lookup detail to include in the message.
   */
  constructor(modelName: string, detail?: string) {
    super(
      detail
        ? `${modelName} was not found for ${detail}.`
        : `${modelName} was not found.`,
    );
    this.name = "NotFoundError";
  }
}

/** Error thrown when a write payload contains an unknown model field. */
export class UnknownModelFieldError extends Error {
  /**
   * @param modelName The target model.
   * @param fieldName The unknown field name.
   */
  constructor(modelName: string, fieldName: string) {
    super(`Model "${modelName}" does not define field "${fieldName}".`);
    this.name = "UnknownModelFieldError";
  }
}

/** Error thrown when a required field is missing from a create payload. */
export class MissingRequiredFieldError extends Error {
  /**
   * @param modelName The target model.
   * @param fieldName The missing field name.
   */
  constructor(modelName: string, fieldName: string) {
    super(`Model "${modelName}" requires field "${fieldName}".`);
    this.name = "MissingRequiredFieldError";
  }
}

/** Error thrown when a non-nullable field receives `null`. */
export class NonNullableFieldError extends Error {
  /**
   * @param modelName The target model.
   * @param fieldName The invalid field name.
   */
  constructor(modelName: string, fieldName: string) {
    super(`Field "${modelName}.${fieldName}" does not allow null values.`);
    this.name = "NonNullableFieldError";
  }
}

/** Error thrown when a unique field or primary key receives a duplicate value. */
export class UniqueConstraintViolationError extends Error {
  /**
   * @param modelName The target model.
   * @param fieldName The constrained field name.
   * @param value The duplicate value.
   */
  constructor(modelName: string, fieldName: string, value: unknown) {
    super(
      `Field "${modelName}.${fieldName}" already contains the value ${JSON.stringify(value)}.`,
    );
    this.name = "UniqueConstraintViolationError";
  }
}
