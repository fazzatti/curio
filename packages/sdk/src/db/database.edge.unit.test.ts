import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Database } from "@/db/database.ts";
import { Entity } from "@/db/entity.ts";
import {
  MissingRelationForeignKeyError,
  MissingRequiredFieldError,
  NonNullableFieldError,
  NotFoundError,
  TableRegistrationNameMismatchError,
  UnknownModelFieldError,
  UnknownRelationForeignKeyError,
  UnknownRelationReferenceError,
} from "@/db/errors.ts";
import { field } from "@/db/field.ts";
import { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
import { Model } from "@/db/model.ts";
import { relation } from "@/db/relation.ts";
import { UuidPrimaryKey } from "@/db/variant.ts";

const PlainModel = new Model({
  name: "Plain",
  table: "plains",
  uses: [UuidPrimaryKey],
  fields: {
    name: field.string().required(),
    note: field.string().nullable(),
  },
});

const validationAdapter = {
  parse<TOutput>(schema: unknown, input: unknown): TOutput {
    if (typeof schema !== "function") {
      throw new Error("Function schema expected.");
    }

    return (schema as (input: unknown) => TOutput)(input);
  },
};

describe("Database edge cases", () => {
  it("rejects unknown fields and invalid nullability on create and update", async () => {
    const db = Database.create({
      adapter: memoryDatabaseAdapter(),
      tables: {
        Plain: PlainModel,
      },
    });

    await assertRejects(
      () => db.Plain.create({ name: "Ada", extra: "boom" } as never),
      UnknownModelFieldError,
    );
    await assertRejects(
      () => db.Plain.create({ note: "missing name" } as never),
      MissingRequiredFieldError,
    );
    await assertRejects(
      () => db.Plain.create({ name: "Ada", note: null, id: null } as never),
      NonNullableFieldError,
    );

    const record = await db.Plain.create({ name: "Ada", note: null });

    await assertRejects(
      () => db.Plain.updateById(record.id, { note: undefined, name: null } as never),
      NonNullableFieldError,
    );
    await assertRejects(
      () => db.Plain.updateById(record.id, { extra: true } as never),
      UnknownModelFieldError,
    );
  });

  it("throws when validation returns a non-object payload and when singular writes miss rows", async () => {
    const BrokenValidationModel = new Model({
      name: "BrokenValidation",
      table: "broken_validations",
      uses: [UuidPrimaryKey],
      fields: {
        name: field.string().required(),
      },
      validation: {
        create: () => "bad-output" as never,
      },
    });

    const db = Database.create({
      adapter: memoryDatabaseAdapter(),
      schemaAdapter: validationAdapter,
      tables: {
        BrokenValidation: BrokenValidationModel,
        Plain: PlainModel,
      },
    });

    await assertRejects(
      () => db.BrokenValidation.create({ name: "Ada" }),
      TypeError,
      "must return an object payload",
    );
    await assertRejects(
      () => db.Plain.getOne({ where: { name: "missing" } }),
      NotFoundError,
    );
    await assertRejects(
      () => db.Plain.updateById("missing", { name: "next" }),
      NotFoundError,
    );
    await assertRejects(
      () => db.Plain.deleteById("missing"),
      NotFoundError,
    );
  });

  it("uses auto-generated entities for plain model registrations", async () => {
    const db = Database.create({
      adapter: memoryDatabaseAdapter(),
      tables: {
        Plain: PlainModel,
      },
    });

    const created = await db.Plain.create({ name: "Ada", note: "Hello" });

    assertEquals(created.name, "Ada");
    assertEquals(created.toJSON(), {
      id: created.id,
      name: "Ada",
      note: "Hello",
    });
  });

  it("validates relation foreign keys and references for belongsTo and hasMany", () => {
    const UserModel = new Model({
      name: "User",
      table: "users",
      uses: [UuidPrimaryKey],
      fields: {
        email: field.string().required(),
      },
    });

    const MissingForeignKeyModel = new Model({
      name: "MissingForeignKey",
      table: "missing_foreign_keys",
      uses: [UuidPrimaryKey],
      fields: {
        userId: field.uuid().required(),
      },
      relations: {
        user: relation.belongsTo("User"),
      },
    });

    assertThrows(
      () =>
        Database.create({
          adapter: memoryDatabaseAdapter(),
          tables: {
            User: UserModel,
            MissingForeignKey: MissingForeignKeyModel,
          },
        }),
      MissingRelationForeignKeyError,
    );

    const MissingBelongsToFieldModel = new Model({
      name: "MissingBelongsToField",
      table: "missing_belongs_to_fields",
      uses: [UuidPrimaryKey],
      fields: {},
      relations: {
        user: relation.belongsTo("User").foreignKey("userId"),
      },
    });

    assertThrows(
      () =>
        Database.create({
          adapter: memoryDatabaseAdapter(),
          tables: {
            User: UserModel,
            MissingBelongsToField: MissingBelongsToFieldModel,
          },
        }),
      UnknownRelationForeignKeyError,
    );

    const MissingBelongsToReferenceModel = new Model({
      name: "MissingBelongsToReference",
      table: "missing_belongs_to_references",
      uses: [UuidPrimaryKey],
      fields: {
        userId: field.uuid().required(),
      },
      relations: {
        user: relation.belongsTo("User").foreignKey("userId").references("slug"),
      },
    });

    assertThrows(
      () =>
        Database.create({
          adapter: memoryDatabaseAdapter(),
          tables: {
            User: UserModel,
            MissingBelongsToReference: MissingBelongsToReferenceModel,
          },
        }),
      UnknownRelationReferenceError,
    );

    const MissingHasManyForeignKeyModel = new Model({
      name: "MissingHasManyForeignKey",
      table: "missing_has_many_foreign_keys",
      uses: [UuidPrimaryKey],
      fields: {},
      relations: {
        users: relation.hasMany("User").foreignKey("accountId"),
      },
    });

    assertThrows(
      () =>
        Database.create({
          adapter: memoryDatabaseAdapter(),
          tables: {
            User: UserModel,
            MissingHasManyForeignKey: MissingHasManyForeignKeyModel,
          },
        }),
      UnknownRelationForeignKeyError,
    );

    const MissingHasManyReferenceModel = new Model({
      name: "MissingHasManyReference",
      table: "missing_has_many_references",
      uses: [UuidPrimaryKey],
      fields: {},
      relations: {
        users: relation.hasMany("User").foreignKey("email").references("slug"),
      },
    });

    assertThrows(
      () =>
        Database.create({
          adapter: memoryDatabaseAdapter(),
          tables: {
            User: UserModel,
            MissingHasManyReference: MissingHasManyReferenceModel,
          },
        }),
      UnknownRelationReferenceError,
    );
  });

  it("rejects unsupported table registrations", () => {
    assertThrows(
      () =>
        Database.create({
          adapter: memoryDatabaseAdapter(),
          tables: {
            Plain: { invalid: true } as never,
          },
        }),
      TypeError,
      'Unsupported table registration "Plain".',
    );

    assertThrows(
      () =>
        Database.create({
          adapter: memoryDatabaseAdapter(),
          tables: {
            Wrong: PlainModel,
          },
        }),
      TableRegistrationNameMismatchError,
    );
  });
});
