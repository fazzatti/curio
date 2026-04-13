import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as v from "@valibot/valibot";
import { API, INTERNALS } from "@/api/api.ts";
import { GET } from "@/api/endpoint-operations.ts";
import { middleware } from "@/api/middleware.ts";
import { Route } from "@/api/route.ts";
import type { HttpAdapter } from "@/http/types.ts";

const noop = () => {};

describe("API helpers", () => {
  it("normalizes operation entries and rejects unsupported method entries", () => {
    const operation = GET({
      handler: () => ({
        payload: {
          ok: true,
        },
      }),
    });

    const normalized = INTERNALS.normalizeRouteMethodEntry("GET", operation);

    assertEquals(normalized.method, "GET");
    assertEquals(typeof normalized.handler, "function");
    assertEquals(normalized.middlewares, undefined);

    assertThrows(
      () =>
        INTERNALS.normalizeRouteMethodEntry(
          "GET",
          { nope: true } as never,
        ),
      TypeError,
      "Unsupported route method entry for GET.",
    );
  });

  it("binds route creation to custom HTTP adapters", () => {
    const registrations: Array<{ method: string; path: string }> = [];
    const adapter: HttpAdapter<{ kind: "router" }, unknown> = {
      createRouter() {
        return { kind: "router" };
      },
      registerRoute(router, method, path) {
        assertEquals(router.kind, "router");
        registrations.push({ method, path });
      },
      createContext: () => {
        throw new Error("Not needed");
      },
    };

    const router = API.withHttp(adapter).from([
      Route("health", {
        GET: noop,
      }),
    ]);

    assertEquals(router, { kind: "router" });
    assertEquals(registrations, [{ method: "GET", path: "/health" }]);
  });

  it("builds a reusable route artifact alongside the runtime router", () => {
    const registrations: Array<{ method: string; path: string }> = [];
    const adapter: HttpAdapter<{ kind: "router" }, unknown> = {
      createRouter() {
        return { kind: "router" };
      },
      registerRoute(router, method, path, handler) {
        assertEquals(router.kind, "router");
        assertEquals(typeof handler, "function");
        registrations.push({ method, path });
      },
      createContext: () => {
        throw new Error("Not needed");
      },
    };

    const querySchema = v.object({
      page: v.optional(v.number()),
    });
    const responseSchema = v.object({
      ok: v.boolean(),
    });
    const operation = GET({
      docs: {
        operationId: "listUsers",
      },
      requestSchema: {
        query: querySchema,
      },
      responseSchema,
      handler: () => ({
        payload: {
          ok: true,
        },
      }),
    });
    const route = Route("users", {
      GET: operation,
    });

    const result = API.withHttp(adapter).build([route]);

    assertEquals(result.router, { kind: "router" });
    assertEquals(registrations, [{ method: "GET", path: "/users" }]);
    assertEquals(result.routes.length, 1);
    assertEquals(result.routes[0]?.method, "GET");
    assertEquals(result.routes[0]?.path, "/users");
    assertEquals(result.routes[0]?.docs?.operationId, "listUsers");
    assertEquals(result.routes[0]?.handler, operation.handler);
    assertEquals(typeof result.routes[0]?.runtimeHandler, "function");
    assertEquals(
      (result.routes[0]?.schemas as {
        request?: { query?: unknown };
      })?.request?.query,
      querySchema,
    );
    assertEquals(
      (result.routes[0]?.schemas as { response?: unknown })?.response,
      responseSchema,
    );
  });

  it("preserves pass-through middleware on built-in operations", () => {
    const registrations: Array<{ method: string; path: string }> = [];
    const adapter: HttpAdapter<{ kind: "router" }, unknown> = {
      createRouter() {
        return { kind: "router" };
      },
      registerRoute(router, method, path) {
        assertEquals(router.kind, "router");
        registrations.push({ method, path });
      },
      createContext: () => {
        throw new Error("Not needed");
      },
    };
    const tracing = middleware(async (_ctx, next) => {
      await next();
    });

    const result = API.withHttp(adapter).build([
      Route("health", {
        GET: GET({
          middlewares: [tracing],
          handler: () => ({
            payload: {
              ok: true,
            },
          }),
        }),
      }),
    ]);

    assertEquals(result.router, { kind: "router" });
    assertEquals(registrations, [{ method: "GET", path: "/health" }]);
    assertEquals(result.routes[0]?.middlewares, [tracing]);
  });
});
