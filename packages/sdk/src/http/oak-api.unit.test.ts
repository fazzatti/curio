import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Application } from "@oak/oak";
import { API, GET, middleware, Oak, Route } from "@/http/oak-api.ts";

const createAppResponse = async (
  router: ReturnType<typeof API.from>,
  request: Request,
) => {
  const app = new Application();
  app.use(router.routes());
  app.use(router.allowedMethods());

  const response = await app.handle(request);
  assertExists(response);
  return response;
};

describe("Oak HTTP surface", () => {
  it("binds built-in operations, routes, and middleware to Oak", async () => {
    const auth = middleware("auth", async ({ ctx }) => ({
      method: ctx.raw.request.method,
    }));

    const router = API.from([
      Route("account", {
        GET: GET({
          middlewares: [auth] as const,
          handler: (_input, ctx) => {
            const method: string = ctx.raw.request.method;
            const authMethod: string = ctx.middlewareData.auth.method;

            return {
              payload: {
                method,
                authMethod,
              },
            };
          },
        }),
      }),
    ]);

    const response = await createAppResponse(
      router,
      new Request("http://localhost/account"),
    );

    assertEquals(await response.json(), {
      method: "GET",
      authMethod: "GET",
    });
  });

  it("exposes the same prebound surface through the Oak namespace", async () => {
    const router = Oak.API.from([
      Oak.Route("health", {
        GET: Oak.GET({
          handler: (_input, ctx) => {
            const method: string = ctx.raw.request.method;

            return {
              payload: {
                ok: true,
                method,
              },
            };
          },
        }),
      }),
    ]);

    const response = await createAppResponse(
      router,
      new Request("http://localhost/health"),
    );

    assertEquals(await response.json(), {
      ok: true,
      method: "GET",
    });
  });

  it("exposes route build artifacts through the Oak API namespace", () => {
    const result = API.build([
      Route("health", {
        GET: GET({
          handler: () => ({
            payload: {
              ok: true,
            },
          }),
        }),
      }),
    ]);

    assertEquals(typeof result.router.routes, "function");
    assertEquals(result.routes.map(({ method, path }) => ({ method, path })), [
      { method: "GET", path: "/health" },
    ]);
  });
});
