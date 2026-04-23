import { assertEquals, assertInstanceOf, assertThrows } from "@std/assert";
import { middleware } from "@/api/middleware.ts";
import {
  API,
  DuplicateMiddlewareDataKeyError,
  DuplicateRegisteredRouteError,
  DuplicateRouteSegmentError,
  INTERNALS,
  InvalidRouteSegmentError,
  MismatchedRouteMethodError,
} from "@/api/api.ts";
import { GET } from "@/api/endpoint-operations.ts";
import { Route } from "@/api/route.ts";
import { oakHttpAdapter } from "@/http/oak.ts";
import type { RouteMethodOperation } from "@/api/types.ts";
import type { CurioHttpContext } from "@/http/types.ts";

const noop = () => {};
const oakApi = API.withHttp(oakHttpAdapter);

Deno.test("API.withHttp(oakHttpAdapter) registers flattened routes", () => {
  const router = oakApi.from([
    Route("health", {
      GET: noop,
    }),
    Route("transactions", {
      children: [
        Route(":id", {
          GET: noop,
        }),
      ],
    }),
  ]);

  assertEquals(typeof router.routes, "function");
  assertEquals(typeof router.allowedMethods, "function");
});

Deno.test("API.withHttp(oakHttpAdapter) accepts root routes and pass-through middleware without middleware data validation errors", () => {
  const router = oakApi.from([
    Route("", {
      GET: {
        middlewares: [
          middleware(async (_ctx, next) => {
            await next();
          }),
          middleware("auth", () =>
            Promise.resolve({
              account: {
                id: "acc_123",
              },
            })),
        ],
        handler: noop,
      },
    }),
  ]);

  assertEquals(typeof router.routes, "function");
});

Deno.test("API.withHttp(oakHttpAdapter) rejects multi-segment path nodes", () => {
  assertThrows(
    () => oakApi.from([Route("transactions/:id", { GET: noop })]),
    InvalidRouteSegmentError,
  );
});

Deno.test("API.withHttp(oakHttpAdapter) rejects duplicate sibling path segments", () => {
  assertThrows(
    () =>
      oakApi.from([
        Route("health", { GET: noop }),
        Route("health", { POST: noop }),
      ]),
    DuplicateRouteSegmentError,
  );
});

Deno.test("API.withHttp(oakHttpAdapter) rejects duplicate resolved method paths", () => {
  assertThrows(
    () =>
      oakApi.from([
        Route("", {
          children: [
            Route("health", {
              GET: noop,
            }),
          ],
        }),
        Route("health", {
          GET: noop,
        }),
      ]),
    DuplicateRegisteredRouteError,
  );
});

Deno.test("INTERNALS.flattenRoutes joins nested paths", () => {
  const routes = INTERNALS.flattenRoutes([
    Route("transactions", {
      GET: noop,
      children: [
        Route(":id", {
          DELETE: noop,
        }),
      ],
    }),
  ]);

  assertEquals(
    routes.map(({ method, path }) => ({ method, path })),
    [
      { method: "GET", path: "/transactions" },
      { method: "DELETE", path: "/transactions/:id" },
    ],
  );

  const rootRoutes = INTERNALS.flattenRoutes([
    Route("", {
      GET: noop,
    }),
  ]);
  assertEquals(rootRoutes[0]?.path, "/");
});

Deno.test("API.withHttp(oakHttpAdapter) accepts object-form method config entries", () => {
  const router = oakApi.from([
    Route("health", {
      GET: {
        handler: noop,
      },
    }),
  ]);

  assertEquals(typeof router.routes, "function");
});

Deno.test("INTERNALS.normalizeRouteMethodEntry preserves method-level middlewares", () => {
  const authMiddleware = middleware("auth", () =>
    Promise.resolve({
      account: {
        id: "acc_123",
      },
    }));
  const normalized = INTERNALS.normalizeRouteMethodEntry("GET", {
    docs: {
      summary: "Health check",
    },
    handler: noop,
    middlewares: [authMiddleware],
  });

  assertEquals(normalized.method, "GET");
  assertEquals(normalized.handler, noop);
  assertEquals(normalized.docs, {
    summary: "Health check",
  });
  assertEquals(normalized.middlewares, [authMiddleware]);
});

Deno.test("INTERNALS.normalizeRouteMethodEntry accepts plain handler shorthand", () => {
  const normalized = INTERNALS.normalizeRouteMethodEntry("GET", noop);

  assertEquals(normalized.method, "GET");
  assertEquals(normalized.handler, noop);
  assertEquals(normalized.middlewares, undefined);
});

Deno.test("API.withHttp(oakHttpAdapter) rejects operation objects attached under the wrong method key", () => {
  const getOperation = GET({
    handler: () => ({
      payload: {
        ok: true,
      },
    }),
  }) as unknown as RouteMethodOperation<"DELETE", CurioHttpContext>;

  assertThrows(
    () =>
      oakApi.from([
        Route("health", {
          DELETE: getOperation,
        }),
      ]),
    MismatchedRouteMethodError,
  );
});

Deno.test("INTERNALS validation errors are concrete error instances", () => {
  try {
    oakApi.from([Route("invalid/path", { GET: noop })]);
  } catch (error) {
    assertInstanceOf(error, InvalidRouteSegmentError);
  }
});

Deno.test("API.withHttp(oakHttpAdapter) rejects duplicate keyed middleware data on one route", () => {
  const auth = middleware("auth", () =>
    Promise.resolve({
      account: {
        id: "acc_123",
      },
    }));

  assertThrows(
    () =>
      oakApi.from([
        Route("protected", {
          GET: {
            middlewares: [auth, auth],
            handler: noop,
          },
        }),
      ]),
    DuplicateMiddlewareDataKeyError,
  );
});

Deno.test("validateMiddlewareDataKeys allows middlewares without data keys", () => {
  const router = oakApi.from([
    Route("unkeyed", {
      GET: {
        middlewares: [
          middleware(async (_ctx, next) => {
            await next();
          }),
        ],
        handler: noop,
      },
    }),
  ]);
  assertEquals(typeof router.routes, "function");
});
