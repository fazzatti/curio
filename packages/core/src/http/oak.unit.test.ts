import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Application } from "@oak/oak";
import { oakHttpAdapter } from "@/http/oak.ts";

const createAppResponse = async (
  setup: Parameters<typeof oakHttpAdapter.registerRoute>[3],
  request: Request,
) => {
  const router = oakHttpAdapter.createRouter();
  oakHttpAdapter.registerRoute(router, request.method as "GET" | "POST", "/test", setup);

  const app = new Application();
  app.use(router.routes());
  app.use(router.allowedMethods());

  const response = await app.handle(request);
  assertExists(response);
  return response;
};

describe("oakHttpAdapter", () => {
  it("exposes raw request data and writes responses through", async () => {
    const response = await createAppResponse(
      (ctx) => {
        const query = Object.fromEntries(ctx.request.query.entries());

        ctx.response.send({
          status: 201,
          headers: {
            "x-test": "ok",
          },
          payload: {
            path: ctx.request.path,
            method: ctx.request.method,
            params: ctx.request.params,
            query,
          },
        });
      },
      new Request("http://localhost/test?verbose=true"),
    );

    assertEquals(response.status, 201);
    assertEquals(response.headers.get("x-test"), "ok");
    assertEquals(await response.json(), {
      path: "/test",
      method: "GET",
      params: {},
      query: {
        verbose: "true",
      },
    });
  });

  it("request.body() reads JSON request bodies", async () => {
    const response = await createAppResponse(
      async (ctx) => {
        const body = await ctx.request.body();
        ctx.response.send({
          payload: body,
        });
      },
      new Request("http://localhost/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ok: true,
        }),
      }),
    );

    assertEquals(await response.json(), {
      ok: true,
    });
  });

const createRawContext = (
  bodyType: "text" | "form" | "form-data" | "binary" | "unknown",
  bodyValue: unknown,
) => {
  const responseHeaders = new Headers();

  return {
    params: {
      id: "42",
    },
    request: {
      method: "POST",
      url: new URL("http://localhost/test/42?verbose=true"),
      headers: new Headers({
        "x-test": "ok",
      }),
      hasBody: true,
      body: {
        type: () => bodyType,
        json: () => Promise.resolve(bodyValue),
        text: () => Promise.resolve(bodyValue),
        form: () => Promise.resolve(bodyValue),
        formData: () => Promise.resolve(bodyValue),
        blob: () => Promise.resolve(bodyValue),
      },
    },
    response: {
      status: 200,
      headers: responseHeaders,
      body: undefined as unknown,
    },
  };
};

const createCountedRawContext = (
  bodyType: "json" | "text" | "form" | "form-data" | "binary" | "unknown",
  bodyValue: unknown,
) => {
  const counters = {
    json: 0,
    text: 0,
    form: 0,
    formData: 0,
    blob: 0,
  };

  const rawContext = {
    params: {},
    request: {
      method: "POST",
      url: new URL("http://localhost/test"),
      headers: new Headers(),
      hasBody: true,
      body: {
        type: () => bodyType,
        json: () => {
          counters.json += 1;
          return Promise.resolve(bodyValue);
        },
        text: () => {
          counters.text += 1;
          return Promise.resolve(bodyValue);
        },
        form: () => {
          counters.form += 1;
          return Promise.resolve(bodyValue);
        },
        formData: () => {
          counters.formData += 1;
          return Promise.resolve(bodyValue);
        },
        blob: () => {
          counters.blob += 1;
          return Promise.resolve(bodyValue);
        },
      },
    },
    response: {
      status: 200,
      headers: new Headers(),
      body: undefined as unknown,
    },
  };

  return { rawContext, counters };
};

  it("createContext reads non-JSON body types and writes responses", async () => {
    const formData = new FormData();
    formData.set("role", "admin");
    const blob = new Blob(["hello"], { type: "application/octet-stream" });

    const textContext = oakHttpAdapter.createContext(
      createRawContext("text", "hello world") as never,
    );
    assertEquals(await textContext.request.body(), "hello world");

    const formContext = oakHttpAdapter.createContext(
      createRawContext("form", new URLSearchParams("role=admin")) as never,
    );
    assertEquals(
      (await formContext.request.body())?.toString(),
      new URLSearchParams("role=admin").toString(),
    );

    const formDataContext = oakHttpAdapter.createContext(
      createRawContext("form-data", formData) as never,
    );
    assertEquals(
      ((await formDataContext.request.body()) as FormData).get("role"),
      "admin",
    );

    const binaryContext = oakHttpAdapter.createContext(
      createRawContext("binary", blob) as never,
    );
    assertEquals(
      await ((await binaryContext.request.body()) as Blob).text(),
      "hello",
    );

    const unknownContext = oakHttpAdapter.createContext(
      createRawContext("unknown", "fallback text") as never,
    );
    assertEquals(await unknownContext.request.body(), "fallback text");

    const writeContext = oakHttpAdapter.createContext(
      createRawContext("text", "unused") as never,
    );
    writeContext.response.setStatus(204);
    writeContext.response.setHeaders({
      "x-extra": "yes",
    });
    writeContext.response.setPayload({
      ok: true,
    });

    assertEquals(writeContext.raw.response.status, 204);
    assertEquals(writeContext.raw.response.headers.get("x-extra"), "yes");
    assertEquals(writeContext.raw.response.body, {
      ok: true,
    });
    assertEquals(writeContext.request.params, { id: "42" });
  });

  it("returns undefined when the raw Oak request has no body", async () => {
    const context = oakHttpAdapter.createContext({
      params: {},
      request: {
        method: "GET",
        url: new URL("http://localhost/test"),
        headers: new Headers(),
        hasBody: false,
        body: {
          type: () => "unknown",
          json: () => Promise.resolve(undefined),
          text: () => Promise.resolve(undefined),
          form: () => Promise.resolve(new URLSearchParams()),
          formData: () => Promise.resolve(new FormData()),
          blob: () => Promise.resolve(new Blob()),
        },
      },
      response: {
        status: 200,
        headers: new Headers(),
        body: undefined as unknown,
      },
    } as never);

    assertEquals(await context.request.body(), undefined);
  });

  it("memoizes body reads so multiple callers see the same parsed value", async () => {
    const { rawContext, counters } = createCountedRawContext("json", {
      ok: true,
    });
    const context = oakHttpAdapter.createContext(rawContext as never);

    const first = await context.request.body();
    const second = await context.request.body();

    assertEquals(first, { ok: true });
    assertEquals(second, { ok: true });
    assertEquals(counters.json, 1);
    assertEquals(counters.text, 0);
    assertEquals(counters.form, 0);
    assertEquals(counters.formData, 0);
    assertEquals(counters.blob, 0);
  });

  it("creates an empty middlewareData bag for request-scoped middleware state", () => {
    const context = oakHttpAdapter.createContext(
      createRawContext("text", "unused") as never,
    );

    assertEquals(context.middlewareData, {});
  });
});
