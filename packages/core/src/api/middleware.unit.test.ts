import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as v from "@valibot/valibot";
import { INTERNALS } from "@/api/api.ts";
import { createMiddlewareFactory, middleware } from "@/api/middleware.ts";
import { GET, POST } from "@/api/endpoint-operations.ts";
import type { CurioHttpContext, HttpResponseOutput } from "@/http/types.ts";

const createContext = (body: unknown = undefined) => {
  let sentResponse: HttpResponseOutput | undefined;

  const ctx: CurioHttpContext<unknown, Record<string, unknown>> = {
    raw: {},
    request: {
      method: "POST",
      path: "/test",
      headers: new Headers(),
      query: new URL("http://localhost/test").searchParams,
      params: {},
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

describe("route middleware", () => {
  it("runs pass-through middlewares around the handler in order", async () => {
    const calls: string[] = [];
    const wrappedHandler = INTERNALS.composeRouteHandler(
      () => {
        calls.push("handler");
      },
      [
        middleware(async (_ctx, next) => {
          calls.push("mw:before");
          await next();
          calls.push("mw:after");
        }),
      ],
    );

    await wrappedHandler(createContext().ctx);

    assertEquals(calls, ["mw:before", "handler", "mw:after"]);
  });

  it("stores keyed middleware data before the handler runs", async () => {
    let seenAccountId = "";
    const wrappedHandler = INTERNALS.composeRouteHandler(
      (ctx) => {
        seenAccountId =
          ((ctx.middlewareData as Record<string, { account: { id: string } }>)
            .auth).account.id;
      },
      [
        middleware("auth", () => Promise.resolve({
          account: {
            id: "acc_123",
          },
        })),
      ],
    );

    await wrappedHandler(createContext().ctx);

    assertEquals(seenAccountId, "acc_123");
  });

  it("halts the handler when keyed middleware returns a response", async () => {
    const wrappedHandler = INTERNALS.composeRouteHandler(
      () => {
        throw new Error("handler should not run");
      },
      [
        middleware("auth", ({ halt }) => {
          return halt({
            status: 401,
            payload: {
              error: "Missing bearer token.",
            },
          });
        }),
      ],
    );
    const { ctx, getSentResponse } = createContext();

    await wrappedHandler(ctx);

    assertEquals(getSentResponse(), {
      status: 401,
      payload: {
        error: "Missing bearer token.",
      },
    });
  });

  it("rejects pass-through middleware calling next more than once", async () => {
    const wrappedHandler = INTERNALS.composeRouteHandler(
      () => {},
      [
        middleware(async (_ctx, next) => {
          await next();
          await next();
        }),
      ],
    );

    await assertRejects(
      async () => await wrappedHandler(createContext().ctx),
      Error,
      "Route middleware called next() more than once in a single pass.",
    );
  });

  it("keeps request bodies readable for both middleware and built-in body parsing", async () => {
    let seenRawBody: unknown;
    const operation = POST({
      middlewares: [
        middleware(async (ctx, next) => {
          seenRawBody = await ctx.request.body();
          await next();
        }),
      ] as const,
      requestSchema: {
        body: v.object({
          ok: v.boolean(),
        }),
      },
      handler: ({ body }) => ({
        payload: body,
      }),
    });
    const { ctx, getSentResponse } = createContext({
      ok: true,
    });

    await INTERNALS.composeRouteHandler(operation.handler, operation.middlewares)(
      ctx,
    );

    assertEquals(seenRawBody, {
      ok: true,
    });
    assertEquals(getSentResponse()?.payload, {
      ok: true,
    });
    assertEquals(getSentResponse(), {
      headers: undefined,
      payload: {
        ok: true,
      },
      status: undefined,
    });
  });

  it("allows built-in operations to infer middleware data in the handler context", () => {
    const auth = middleware("auth", () => Promise.resolve({
      account: {
        id: "acc_123",
      },
    }));
    const request = middleware("request", () => Promise.resolve({
      requestId: "req_123",
    }));

    POST({
      middlewares: [auth, request] as const,
      handler: (_input, ctx) => {
        const accountId: string = ctx.middlewareData.auth.account.id;
        const requestId: string = ctx.middlewareData.request.requestId;

        return {
          payload: {
            accountId,
            requestId,
          },
        };
      },
    });
  });

  it("type-checks duplicate middleware keys as an error for built-in operations", () => {
    const auth = middleware("auth", () => Promise.resolve({
      account: {
        id: "acc_123",
      },
    }));

    GET({
      // @ts-expect-error Duplicate keyed middleware data must be rejected.
      middlewares: [auth, auth] as const,
      handler: () => ({
        payload: {
          ok: true,
        },
      }),
    });
  });

  it("throws for duplicate keyed middleware data during route assembly", () => {
    const auth = middleware("auth", () => Promise.resolve({
      account: {
        id: "acc_123",
      },
    }));

    assertThrows(
      () => INTERNALS.validateMiddlewareDataKeys([auth, auth], "GET", "/test"),
      Error,
      'Duplicate middleware data key "auth" detected for GET /test.',
    );
  });

  it("creates pass-through and keyed middleware through a typed factory", async () => {
    const factory = createMiddlewareFactory<CurioHttpContext>();
    const calls: string[] = [];

    const passThrough = factory(async (_ctx, next) => {
      calls.push("before");
      await next();
      calls.push("after");
    });
    const keyed = factory("auth", () => Promise.resolve({
      accountId: "acc_123",
    }));

    const wrappedHandler = INTERNALS.composeRouteHandler(
      (ctx) => {
        calls.push(
          `handler:${String((ctx.middlewareData as { auth: { accountId: string } }).auth.accountId)}`,
        );
      },
      [passThrough, keyed],
    );

    await wrappedHandler(createContext().ctx);

    assertEquals(calls, ["before", "handler:acc_123", "after"]);
  });

  it("throws when a keyed factory call omits the handler", () => {
    const factory = createMiddlewareFactory<CurioHttpContext>();

    assertThrows(
      () =>
        factory(
          "auth",
          undefined as never,
        ),
      TypeError,
      'Missing keyed middleware handler for "auth".',
    );
  });

  it("throws when raw keyed middleware omits the handler", () => {
    assertThrows(
      () => middleware("auth", undefined as never),
      TypeError,
      'Missing keyed middleware handler for "auth".',
    );
  });
});
