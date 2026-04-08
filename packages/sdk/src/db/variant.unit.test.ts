import {
  assert,
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { resolveFieldDefinition } from "@/db/field.ts";
import {
  cloneVariantFields,
  Timestamps,
  UuidPrimaryKey,
} from "@/db/variant.ts";

describe("db variants", () => {
  it("clones variant field maps and handles empty input", () => {
    assertEquals(cloneVariantFields(undefined), {});

    const cloned = cloneVariantFields(UuidPrimaryKey.fields);

    assertNotStrictEquals(cloned, UuidPrimaryKey.fields);
    assertStrictEquals(cloned.id, UuidPrimaryKey.fields?.id);
  });

  it("exposes built-in uuid and timestamp variants", () => {
    const uuidId = UuidPrimaryKey.fields?.id;
    const createdAt = Timestamps.fields?.createdAt;
    const updatedAt = Timestamps.fields?.updatedAt;

    assert(uuidId);
    assert(createdAt);
    assert(updatedAt);

    assertEquals(UuidPrimaryKey.name, "UuidPrimaryKey");
    assertEquals(
      resolveFieldDefinition(uuidId, "id").kind,
      "uuid",
    );
    assertEquals(
      resolveFieldDefinition(uuidId, "id").primaryKey,
      true,
    );
    assertEquals(
      resolveFieldDefinition(uuidId, "id").unique,
      true,
    );

    assertEquals(Timestamps.name, "Timestamps");
    assertEquals(
      resolveFieldDefinition(createdAt, "createdAt").kind,
      "datetime",
    );
    assertEquals(
      resolveFieldDefinition(createdAt, "createdAt").sortable,
      true,
    );
    assertEquals(
      resolveFieldDefinition(updatedAt, "updatedAt").kind,
      "datetime",
    );
    assertEquals(
      resolveFieldDefinition(updatedAt, "updatedAt").sortable,
      true,
    );
  });
});
