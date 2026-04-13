import { assertEquals, assertThrows } from "@std/assert";
import * as v from "@valibot/valibot";
import { GET, POST } from "@/api/endpoint-operations.ts";
import { Route } from "@/api/route.ts";
import { withSchemas } from "@/api/with-schemas.ts";
import { OpenAPI, OpenApiGenerationError } from "@/openapi.ts";

Deno.test("OpenAPI.from derives paths, parameters, request bodies, and responses from built-in Curio operations", () => {
  const document = OpenAPI.from([
    Route("users", {
      GET: GET({
        requestSchema: {
          query: v.object({
            page: v.optional(v.number()),
          }),
        },
        docs: {
          summary: "List users",
          description: "Returns the current user collection.",
          tags: ["Users"],
          operationId: "listUsers",
          responses: {
            "400": {
              description: "The list query was invalid.",
            },
          },
        },
        responseSchema: v.object({
          users: v.array(v.object({
            id: v.string(),
          })),
        }),
        handler: () => ({
          payload: {
            users: [],
          },
        }),
      }),
      children: [
        Route(":id", {
          POST: POST({
            requestSchema: {
              pathParams: v.object({
                id: v.string(),
              }),
              body: v.object({
                email: v.pipe(v.string(), v.email()),
              }),
            },
            docs: {
              summary: "Update user",
              successStatus: "201",
              responses: {
                "409": {
                  description: "A conflicting user already exists.",
                },
              },
            },
            responseSchema: v.object({
              ok: v.boolean(),
            }),
            handler: () => ({
              payload: {
                ok: true,
              },
            }),
          }),
        }),
      ],
    }),
  ], {
    info: {
      title: "Curio API",
      version: "1.0.0",
    },
  });

  assertEquals(document.info, {
    title: "Curio API",
    version: "1.0.0",
  });
  assertEquals(document.paths["/users"]?.get?.summary, "List users");
  assertEquals(
    document.paths["/users"]?.get?.description,
    "Returns the current user collection.",
  );
  assertEquals(document.paths["/users"]?.get?.tags, ["Users"]);
  assertEquals(document.paths["/users"]?.get?.operationId, "listUsers");
  assertEquals(document.paths["/users"]?.get?.parameters, [
    {
      name: "page",
      in: "query",
      required: false,
      schema: {
        type: "number",
      },
    },
  ]);
  assertEquals(
    document.paths["/users"]?.get?.responses["200"]?.content?.[
      "application/json"
    ]?.schema,
    {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
              },
            },
            required: ["id"],
          },
        },
      },
      required: ["users"],
    },
  );
  assertEquals(document.paths["/users"]?.get?.responses["400"], {
    description: "The list query was invalid.",
  });
  assertEquals(document.paths["/users/{id}"]?.post?.parameters, [
    {
      name: "id",
      in: "path",
      required: true,
      schema: {
        type: "string",
      },
    },
  ]);
  assertEquals(
    document.paths["/users/{id}"]?.post?.requestBody?.content?.[
      "application/json"
    ]?.schema,
    {
      type: "object",
      properties: {
        email: {
          type: "string",
          format: "email",
        },
      },
      required: ["email"],
    },
  );
  assertEquals(document.paths["/users/{id}"]?.post?.responses["201"], {
    description: "Successful response.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ok: {
              type: "boolean",
            },
          },
          required: ["ok"],
        },
      },
    },
  });
  assertEquals(document.paths["/users/{id}"]?.post?.responses["409"], {
    description: "A conflicting user already exists.",
  });
});

Deno.test("OpenAPI.from supports custom handlers annotated with withSchemas(...) and route-level docs metadata", () => {
  const customHandler = withSchemas(
    () => {},
    {
      request: {
        pathParams: v.object({
          slug: v.string(),
        }),
      },
      response: v.object({
        ok: v.boolean(),
      }),
    },
  );
  const document = OpenAPI.from([
    Route("projects", {
      children: [
        Route(":slug", {
          GET: {
            handler: customHandler,
            docs: {
              summary: "Get project",
              operationId: "getProject",
              successStatus: "202",
              deprecated: true,
              responses: {
                "404": {
                  description: "Project not found.",
                },
              },
            },
          },
        }),
      ],
    }),
  ]);

  assertEquals(document.paths["/projects/{slug}"]?.get?.summary, "Get project");
  assertEquals(
    document.paths["/projects/{slug}"]?.get?.operationId,
    "getProject",
  );
  assertEquals(document.paths["/projects/{slug}"]?.get?.deprecated, true);
  assertEquals(document.paths["/projects/{slug}"]?.get?.parameters, [
    {
      name: "slug",
      in: "path",
      required: true,
      schema: {
        type: "string",
      },
    },
  ]);
  assertEquals(document.paths["/projects/{slug}"]?.get?.responses["202"], {
    description: "Successful response.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ok: {
              type: "boolean",
            },
          },
          required: ["ok"],
        },
      },
    },
  });
  assertEquals(document.paths["/projects/{slug}"]?.get?.responses["404"], {
    description: "Project not found.",
  });
});

Deno.test("OpenAPI.from rejects non-object path and query schemas", () => {
  const invalidHandler = withSchemas(
    () => {},
    {
      request: {
        query: v.string(),
      },
    },
  );

  assertThrows(
    () =>
      OpenAPI.from([
        Route("health", {
          GET: invalidHandler,
        }),
      ]),
    OpenApiGenerationError,
    "GET /health: query schema must be an object schema.",
  );
});

Deno.test("OpenAPI.from uses default metadata, skips blank responses, and omits JSON content when no response schema exists", () => {
  const document = OpenAPI.from([
    Route("health", {
      GET: GET({
        handler: () => ({
          payload: undefined,
          status: 204,
        }),
        docs: {
          successStatus: "204",
          responses: {
            "": {
              description: "ignore me",
            },
            "204": {},
          },
        },
      }),
    }),
  ], {
    defaultResponseDescription: "No content.",
    servers: [{ url: "https://api.curio.test" }],
  });

  assertEquals(document.info, {
    title: "Curio API",
    version: "0.1.0",
  });
  assertEquals(document.servers, [{ url: "https://api.curio.test" }]);
  assertEquals(document.paths["/health"]?.get?.responses, {
    "204": {
      description: "No content.",
      content: undefined,
    },
  });
});

Deno.test("OpenAPI.from marks optional query parameters as non-required when Valibot omits a required array", () => {
  const document = OpenAPI.from([
    Route("search", {
      GET: GET({
        requestSchema: {
          query: v.object({
            q: v.optional(v.string()),
          }),
        },
        handler: () => ({
          payload: {
            ok: true,
          },
        }),
      }),
    }),
  ]);

  assertEquals(document.paths["/search"]?.get?.parameters, [
    {
      name: "q",
      in: "query",
      required: false,
      schema: {
        type: "string",
      },
    },
  ]);
});

Deno.test("OpenAPI.from wraps Valibot conversion failures in OpenApiGenerationError", () => {
  const invalidHandler = withSchemas(
    () => {},
    {
      response: v.custom(() => true),
    },
  );

  assertThrows(
    () =>
      OpenAPI.from([
        Route("health", {
          GET: invalidHandler,
        }),
      ]),
    OpenApiGenerationError,
    'GET /health: failed to convert Valibot schema to JSON Schema: The "custom" schema cannot be converted to JSON Schema.',
  );
});
