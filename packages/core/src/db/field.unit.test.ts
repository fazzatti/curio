import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { field, resolveFieldDefault, resolveFieldDefinition } from "@/db/field.ts";

describe("db fields", () => {
  it("lets chained modifiers toggle metadata and custom columns", () => {
    const primaryKeyField = resolveFieldDefinition(
      field.string().required().unique().primaryKey(false),
      "email",
    );
    const hiddenField = resolveFieldDefinition(
      field.string().hidden(false).obfuscate(true).searchable(false).sortable(true)
        .column("password_hash"),
      "passwordHash",
    );

    assertEquals(primaryKeyField.primaryKey, false);
    assertEquals(primaryKeyField.required, true);
    assertEquals(primaryKeyField.unique, true);

    assertEquals(hiddenField.hidden, false);
    assertEquals(hiddenField.obfuscate, true);
    assertEquals(hiddenField.searchable, false);
    assertEquals(hiddenField.sortable, true);
    assertEquals(hiddenField.column, "password_hash");

    const idField = resolveFieldDefinition(
      field.id({ column: "user_id" }),
      "id",
    );
    const uuidIdField = resolveFieldDefinition(
      field.uuidId({
        required: false,
        primaryKey: false,
        unique: false,
      }),
      "id",
    );
    assertEquals(idField.column, "user_id");
    assertEquals(uuidIdField.required, false);
    assertEquals(uuidIdField.primaryKey, false);
    assertEquals(uuidIdField.unique, false);
  });

  it("resolves static and factory defaults", () => {
    const staticField = resolveFieldDefinition(
      field.string().default("ready"),
      "status",
    );
    const factoryField = resolveFieldDefinition(
      field.integer().default(() => 42),
      "score",
    );

    assertEquals(resolveFieldDefault(staticField), "ready");
    assertEquals(resolveFieldDefault(factoryField), 42);
  });
});
