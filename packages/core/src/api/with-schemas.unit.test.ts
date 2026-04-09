import { assertEquals, assertStrictEquals } from "@std/assert";
import { getHandlerSchemas, withSchemas } from "@/api/with-schemas.ts";
import type { RouteHandler } from "@/api/types.ts";

Deno.test("withSchemas attaches request and response schemas to a handler", () => {
  const handler: RouteHandler = () => {};
  const requestSchema = { query: { type: "query" } };
  const responseSchema = { type: "response" };
  const handlerWithSchemas = withSchemas(handler, {
    request: requestSchema,
    response: responseSchema,
  });

  const schemas = getHandlerSchemas(handlerWithSchemas);

  assertEquals(schemas, {
    request: requestSchema,
    response: responseSchema,
  });
});

Deno.test("getHandlerSchemas returns undefined when no schemas are attached", () => {
  const handler: RouteHandler = () => {};

  assertStrictEquals(getHandlerSchemas(handler), undefined);
});
