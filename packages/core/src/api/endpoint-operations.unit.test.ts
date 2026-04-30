import { assertEquals, assertRejects } from "@std/assert";
import * as v from "@valibot/valibot";
import { DELETE, GET, PATCH, POST, PUT } from "@/api/endpoint-operations.ts";
import { middleware } from "@/api/middleware.ts";
import { getHandlerSchemas } from "@/api/with-schemas.ts";
import type { CurioHttpContext, HttpResponseOutput } from "@/http/types.ts";
import { SchemaValidationError } from "@/schema/types.ts";

const createContext = (
  url: string,
  params: Record<string, string> = {},
  method = "GET",
  body: unknown = undefined,
) => {
  let sentResponse: HttpResponseOutput | undefined;

  const ctx: CurioHttpContext = {
    raw: {},
    request: {
      method,
      path: new URL(url).pathname,
      headers: new Headers(),
      query: new URL(url).searchParams,
      params,
      body: () => Promise.resolve(body),
    },
    response: {
      setStatus() {},
      setHeaders() {},
      setPayload() {},
      send(output) {
        sentResponse = output;
      },
    },
    middlewareData: {},
  };

  return {
    ctx,
    getSentResponse() {
      return sentResponse;
    },
  };
};

Deno.test(
  "GET parses request inputs, validates the response, and sends the raw payload",
  async () => {
    const operation = GET({
      requestSchema: {
        pathParams: v.object({
          id: v.string(),
        }),
        query: v.object({
          verbose: v.string(),
        }),
      },
      responseSchema: v.object({
        ok: v.boolean(),
        id: v.string(),
      }),
      handler: ({ pathParams, query }) => {
        return {
          status: query.verbose === "true" ? 202 : 200,
          headers: {
            "x-endpoint": "health",
          },
          payload: {
            ok: true,
            id: pathParams.id,
          },
        };
      },
    });
    const { ctx, getSentResponse } = createContext(
      "http://localhost/health?verbose=true",
      { id: "tx_123" },
    );

    await operation.handler(ctx);

    assertEquals(getSentResponse(), {
      status: 202,
      headers: {
        "x-endpoint": "health",
      },
      payload: {
        ok: true,
        id: "tx_123",
      },
    });
  },
);

Deno.test(
  "GET attaches request and response schemas to the returned handler",
  () => {
    const requestSchema = {
      query: v.object({
        verbose: v.string(),
      }),
    };
    const responseSchema = v.object({
      ok: v.boolean(),
    });
    const operation = GET({
      requestSchema,
      responseSchema,
      handler: () => ({
        payload: { ok: true },
      }),
    });

    assertEquals(operation.method, "GET");
    assertEquals(getHandlerSchemas(operation.handler), {
      request: requestSchema,
      response: responseSchema,
    });
  },
);

Deno.test(
  "GET passes an empty object to the handler when no request schemas are declared",
  async () => {
    let receivedInput: Record<string, never> | undefined;
    const operation = GET({
      handler: (input) => {
        receivedInput = input;

        return {
          payload: {
            ok: true,
          },
        };
      },
    });
    const { ctx, getSentResponse } = createContext("http://localhost/health");

    await operation.handler(ctx);

    assertEquals(receivedInput, {});
    assertEquals(getSentResponse()?.payload, {
      ok: true,
    });
  },
);

Deno.test(
  "GET propagates schema validation errors from request parsing",
  async () => {
    const operation = GET({
      requestSchema: {
        query: v.object({
          verbose: v.string(),
        }),
      },
      handler: ({ query }) => ({
        payload: {
          verbose: query.verbose,
        },
      }),
    });
    const { ctx } = createContext("http://localhost/health");

    await assertRejects(async () => {
      await operation.handler(ctx);
    }, SchemaValidationError);
  },
);

Deno.test(
  "POST parses path params, query, and body inputs before sending the payload",
  async () => {
    const requestSchema = {
      pathParams: v.object({
        id: v.string(),
      }),
      query: v.object({
        dryRun: v.string(),
      }),
      body: v.object({
        name: v.string(),
      }),
    };
    const responseSchema = v.object({
      ok: v.boolean(),
      id: v.string(),
      name: v.string(),
    });
    const operation = POST({
      requestSchema,
      responseSchema,
      handler: ({ pathParams, query, body }) => ({
        status: query.dryRun === "true" ? 202 : 201,
        payload: {
          ok: true,
          id: pathParams.id,
          name: body.name,
        },
      }),
    });
    const { ctx, getSentResponse } = createContext(
      "http://localhost/users/123?dryRun=true",
      { id: "user_123" },
      "POST",
      { name: "Ada" },
    );

    await operation.handler(ctx);

    assertEquals(operation.method, "POST");
    assertEquals(getHandlerSchemas(operation.handler), {
      request: requestSchema,
      response: responseSchema,
    });
    assertEquals(getSentResponse()?.status, 202);
    assertEquals(getSentResponse()?.payload, {
      ok: true,
      id: "user_123",
      name: "Ada",
    });
  },
);

Deno.test("POST propagates schema validation errors from body parsing", async () => {
  const operation = POST({
    requestSchema: {
      body: v.object({
        name: v.string(),
      }),
    },
    handler: ({ body }) => ({
      payload: {
        name: body.name,
      },
    }),
  });
  const { ctx } = createContext(
    "http://localhost/users",
    {},
    "POST",
    { name: 123 },
  );

  await assertRejects(async () => {
    await operation.handler(ctx);
  }, SchemaValidationError);
});

Deno.test("PUT parses the request body and returns the PUT method", async () => {
  const operation = PUT({
    requestSchema: {
      body: v.object({
        name: v.string(),
      }),
    },
    responseSchema: v.object({
      name: v.string(),
    }),
    handler: ({ body }) => ({
      payload: {
        name: body.name,
      },
    }),
  });
  const { ctx, getSentResponse } = createContext(
    "http://localhost/users/123",
    {},
    "PUT",
    { name: "Curio" },
  );

  await operation.handler(ctx);

  assertEquals(operation.method, "PUT");
  assertEquals(getSentResponse()?.payload, {
    name: "Curio",
  });
});

Deno.test("PATCH accepts body and query inputs together", async () => {
  const operation = PATCH({
    requestSchema: {
      query: v.object({
        verbose: v.string(),
      }),
      body: v.object({
        nickname: v.string(),
      }),
    },
    handler: ({ query, body }) => ({
      headers: {
        "x-verbose": query.verbose,
      },
      payload: {
        nickname: body.nickname,
      },
    }),
  });
  const { ctx, getSentResponse } = createContext(
    "http://localhost/users/123?verbose=true",
    {},
    "PATCH",
    { nickname: "Ada" },
  );

  await operation.handler(ctx);

  assertEquals(operation.method, "PATCH");
  assertEquals(getSentResponse()?.headers, {
    "x-verbose": "true",
  });
  assertEquals(getSentResponse()?.payload, {
    nickname: "Ada",
  });
});

Deno.test("DELETE parses request inputs without accepting a request body", async () => {
  const operation = DELETE({
    requestSchema: {
      pathParams: v.object({
        id: v.string(),
      }),
      query: v.object({
        force: v.string(),
      }),
    },
    handler: ({ pathParams, query }) => ({
      status: query.force === "true" ? 202 : 204,
      payload: {
        id: pathParams.id,
      },
    }),
  });
  const { ctx, getSentResponse } = createContext(
    "http://localhost/users/123?force=true",
    { id: "user_123" },
    "DELETE",
    { ignored: true },
  );

  await operation.handler(ctx);

  assertEquals(operation.method, "DELETE");
  assertEquals(getSentResponse()?.status, 202);
  assertEquals(getSentResponse()?.payload, {
    id: "user_123",
  });
});

Deno.test("POST passes middleware data into two-argument handlers", async () => {
  const auth = middleware("auth", () =>
    Promise.resolve({
      account: {
        id: "acc_123",
      },
    }));
  const operation = POST({
    middlewares: [auth] as const,
    requestSchema: {
      body: v.object({
        name: v.string(),
      }),
    },
    handler: ({ body }, ctx) => ({
      payload: {
        accountId: ctx.middlewareData.auth.account.id,
        name: body.name,
      },
    }),
  });
  const { ctx, getSentResponse } = createContext(
    "http://localhost/users",
    {},
    "POST",
    { name: "Ada" },
  );

  ctx.middlewareData = {
    auth: {
      account: {
        id: "acc_123",
      },
    },
  };

  await operation.handler(ctx as never);

  assertEquals(getSentResponse()?.payload, {
    accountId: "acc_123",
    name: "Ada",
  });
});
