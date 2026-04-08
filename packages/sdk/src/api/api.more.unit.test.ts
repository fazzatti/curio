import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { API, INTERNALS } from "@/api/api.ts";
import { GET } from "@/api/endpoint-operations.ts";
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
});
