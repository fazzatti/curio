import { assertEquals, assertInstanceOf, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as v from "@valibot/valibot";
import { valibotSchemaAdapter } from "@/schema/valibot.ts";
import { SchemaValidationError } from "@/schema/types.ts";

describe("valibotSchemaAdapter", () => {
  it("parse returns validated output", () => {
    const schema = v.object({
      id: v.string(),
    });

    const result = valibotSchemaAdapter.parse<{ id: string }>(schema, {
      id: "tx_123",
    });

    assertEquals(result, { id: "tx_123" });
  });

  it("safeParse returns validated output on success", () => {
    const schema = v.object({
      id: v.string(),
    });

    const result = valibotSchemaAdapter.safeParse<{ id: string }>(schema, {
      id: "tx_123",
    });

    assertEquals(result, {
      success: true,
      output: {
        id: "tx_123",
      },
    });
  });

  it("safeParse returns issues on validation failure", () => {
    const schema = v.object({
      id: v.string(),
    });

    const result = valibotSchemaAdapter.safeParse<{ id: string }>(schema, {
      id: 123,
    });

    assertEquals(result.success, false);

    if (!result.success) {
      assertEquals(result.issues.length, 1);
    }
  });

  it("parse throws SchemaValidationError on failure", () => {
    const schema = v.object({
      id: v.string(),
    });

    const error = assertThrows(
      () => valibotSchemaAdapter.parse(schema, { id: 123 }),
      SchemaValidationError,
    );

    assertInstanceOf(error, SchemaValidationError);
    assertEquals(error.issues.length, 1);
  });
});
