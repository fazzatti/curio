import {
  DuplicateModelVariantError,
  InvalidModelPrimaryKeyError,
  MissingRelationForeignKeyError,
  MissingRequiredFieldError,
  ModelFieldConflictError,
  ModelMetadataConflictError,
  NonNullableFieldError,
  NotFoundError,
  ReservedTableKeyError,
  TableRegistrationNameMismatchError,
  UniqueConstraintViolationError,
  UnknownModelFieldError,
  UnknownRelationForeignKeyError,
  UnknownRelationReferenceError,
  UnknownRelationTargetError,
} from "@/db/errors.ts";
import { assertEquals, assertInstanceOf } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

describe("database errors", () => {
  it("expose stable names and messages", () => {
    const cases = [
      [
        new InvalidModelPrimaryKeyError("User", 0),
        "InvalidModelPrimaryKeyError",
        'Model "User" must define exactly one primary key, but 0 were found.',
      ],
      [
        new DuplicateModelVariantError("User", "Timestamps"),
        "DuplicateModelVariantError",
        'Model "User" registers the variant "Timestamps" more than once.',
      ],
      [
        new ModelFieldConflictError("User", "email", "variant A", "variant B"),
        "ModelFieldConflictError",
        'Model "User" cannot define field "email" from both variant A and variant B.',
      ],
      [
        new ModelMetadataConflictError(
          "User",
          "defaultOrder",
          "variant A",
          "variant B",
        ),
        "ModelMetadataConflictError",
        'Model "User" cannot define metadata "defaultOrder" from both variant A and variant B.',
      ],
      [
        new TableRegistrationNameMismatchError("People", "User"),
        "TableRegistrationNameMismatchError",
        'Table registration key "People" does not match model name "User".',
      ],
      [
        new ReservedTableKeyError("repo"),
        "ReservedTableKeyError",
        'Table registration key "repo" is reserved by the database API and cannot be used as a direct repository property.',
      ],
      [
        new UnknownRelationTargetError("User", "manager", "Person"),
        "UnknownRelationTargetError",
        'Relation "User.manager" targets unknown model "Person".',
      ],
      [
        new MissingRelationForeignKeyError("User", "manager"),
        "MissingRelationForeignKeyError",
        'Relation "User.manager" must declare a foreign key.',
      ],
      [
        new UnknownRelationForeignKeyError("User", "manager", "managerId"),
        "UnknownRelationForeignKeyError",
        'Relation "User.manager" references unknown foreign key "managerId".',
      ],
      [
        new UnknownRelationReferenceError("User", "manager", "Person", "id"),
        "UnknownRelationReferenceError",
        'Relation "User.manager" references unknown field "id" on model "Person".',
      ],
      [
        new NotFoundError("User"),
        "NotFoundError",
        "User was not found.",
      ],
      [
        new NotFoundError("User", "id=123"),
        "NotFoundError",
        "User was not found for id=123.",
      ],
      [
        new UnknownModelFieldError("User", "nickname"),
        "UnknownModelFieldError",
        'Model "User" does not define field "nickname".',
      ],
      [
        new MissingRequiredFieldError("User", "email"),
        "MissingRequiredFieldError",
        'Model "User" requires field "email".',
      ],
      [
        new NonNullableFieldError("User", "email"),
        "NonNullableFieldError",
        'Field "User.email" does not allow null values.',
      ],
      [
        new UniqueConstraintViolationError("User", "email", "ada@example.com"),
        "UniqueConstraintViolationError",
        'Field "User.email" already contains the value "ada@example.com".',
      ],
    ] as const;

    for (const [error, name, message] of cases) {
      assertInstanceOf(error, Error);
      assertEquals(error.name, name);
      assertEquals(error.message, message);
    }
  });
});
