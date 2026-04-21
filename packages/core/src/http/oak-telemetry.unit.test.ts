import {
  assert,
  assertEquals,
  assertExists,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { API, GET, Route } from "@/http/oak-api.ts";
import {
  INTERNALS,
  type OakTelemetryContext,
  type OakTelemetryMiddleware,
  type OakTelemetryOptions,
  type OakTelemetryRuntime,
} from "@/http/oak-telemetry.ts";

type FakeSpan = {
  attributes: Record<string, unknown>;
  ended: number;
  exceptions: unknown[];
  name: string;
  statuses: unknown[];
  end(): void;
  recordException(error: Error | string): void;
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: unknown): void;
  updateName(name: string): void;
};

type FakeTelemetryRuntime = {
  runtime: {
    SpanKind: {
      SERVER: string;
    };
    SpanStatusCode: {
      ERROR: string;
    };
    getActiveSpan(): FakeSpan | undefined;
    getTracer(name?: string, version?: string): {
      startActiveSpan<T>(
        name: string,
        options: Record<string, unknown>,
        run: (span: FakeSpan) => T | Promise<T>,
      ): Promise<T>;
    };
  };
  setActiveSpan(span: FakeSpan | undefined): void;
  started: Array<{
    name: string;
    options: Record<string, unknown>;
    span: FakeSpan;
  }>;
};

const createRuntime = (): OakTelemetryRuntime<OakTelemetryContext> => {
  return API.build([
    Route("users", {
      children: [
        Route(":id", {
          GET: GET({
            docs: {
              operationId: "getUser",
            },
            handler: () => ({
              payload: {
                ok: true,
              },
            }),
          }),
        }),
      ],
    }),
  ]);
};

const createRouteWithoutOperationId = (): OakTelemetryRuntime<
  OakTelemetryContext
> => {
  return API.build([
    Route("health", {
      GET: GET({
        docs: {
          operationId: "   ",
        },
        handler: () => ({
          payload: {
            ok: true,
          },
        }),
      }),
    }),
  ]);
};

const createSpan = (name = "request"): FakeSpan => {
  return {
    attributes: {},
    ended: 0,
    exceptions: [],
    name,
    statuses: [],
    end() {
      this.ended += 1;
    },
    recordException(error) {
      this.exceptions.push(error);
    },
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
    setStatus(status) {
      this.statuses.push(status);
    },
    updateName(nextName) {
      this.name = nextName;
    },
  };
};

const createTelemetryRuntime = (): FakeTelemetryRuntime => {
  let activeSpan: FakeSpan | undefined;
  const started: Array<{
    name: string;
    options: Record<string, unknown>;
    span: FakeSpan;
  }> = [];

  return {
    runtime: {
      SpanKind: {
        SERVER: "server",
      },
      SpanStatusCode: {
        ERROR: "error",
      },
      getActiveSpan() {
        return activeSpan;
      },
      getTracer(_name?: string, _version?: string) {
        return {
          async startActiveSpan<T>(
            name: string,
            options: Record<string, unknown>,
            run: (span: FakeSpan) => T | Promise<T>,
          ): Promise<T> {
            const span = createSpan(name);
            started.push({ name, options, span });
            const previousSpan = activeSpan;
            activeSpan = span;

            try {
              return await run(span);
            } finally {
              activeSpan = previousSpan;
            }
          },
        };
      },
    },
    setActiveSpan(span) {
      activeSpan = span;
    },
    started,
  };
};

const createOakContext = (requestUrl: string, method = "GET") => {
  return {
    request: {
      method,
      url: new URL(requestUrl),
    },
    response: {},
  } as unknown as Parameters<OakTelemetryMiddleware>[0];
};

describe("Oak telemetry", () => {
  it("matches parameterized routes and root paths", () => {
    const runtime = createRuntime();
    const compiledRoutes = INTERNALS.compileRoutes(runtime.routes);
    const rootPattern = INTERNALS.compileRoutePattern("/");

    assert(rootPattern.test("/"));
    assert(!rootPattern.test("/users"));

    const matchedRoute = INTERNALS.findMatchingRoute(
      compiledRoutes,
      "GET",
      "/users/123",
    );

    assertEquals(matchedRoute?.path, "/users/:id");
    assertEquals(
      INTERNALS.findMatchingRoute(compiledRoutes, "POST", "/users/123"),
      undefined,
    );
  });

  it("reuses the active span and applies Curio route metadata", async () => {
    const runtime = createRuntime();
    const telemetryRuntime = createTelemetryRuntime();
    const activeSpan = createSpan();
    telemetryRuntime.setActiveSpan(activeSpan);

    const middleware = INTERNALS.createTelemetryMiddleware(
      runtime,
      {},
      telemetryRuntime.runtime,
    );
    const ctx = createOakContext("http://localhost/users/123");

    let nextCalls = 0;

    await middleware(ctx, () => {
      nextCalls += 1;
      ctx.response.status = 204;
      return Promise.resolve();
    });

    assertEquals(nextCalls, 1);
    assertEquals(activeSpan.name, "GET /users/:id");
    assertEquals(activeSpan.attributes["http.route"], "/users/:id");
    assertEquals(
      activeSpan.attributes["curio.route.operation_id"],
      "getUser",
    );
    assertEquals(activeSpan.ended, 0);
    assertEquals(telemetryRuntime.started.length, 0);
  });

  it("records active-span errors and rethrows them", async () => {
    const runtime = createRuntime();
    const telemetryRuntime = createTelemetryRuntime();
    const activeSpan = createSpan();
    telemetryRuntime.setActiveSpan(activeSpan);

    const middleware = INTERNALS.createTelemetryMiddleware(
      runtime,
      {},
      telemetryRuntime.runtime,
    );

    let thrown: unknown;

    try {
      await middleware(
        createOakContext("http://localhost/users/123"),
        () => {
          throw "boom";
        },
      );
    } catch (error) {
      thrown = error;
    }

    assertEquals(thrown, "boom");
    assertEquals(activeSpan.exceptions, ["boom"]);
    assertEquals(activeSpan.statuses, [{
      code: "error",
      message: "boom",
    }]);
    assertEquals(activeSpan.ended, 0);
  });

  it("leaves active spans unchanged when no Curio route matches the request", async () => {
    const runtime = createRuntime();
    const telemetryRuntime = createTelemetryRuntime();
    const activeSpan = createSpan("GET");
    telemetryRuntime.setActiveSpan(activeSpan);

    const middleware = INTERNALS.createTelemetryMiddleware(
      runtime,
      {},
      telemetryRuntime.runtime,
    );

    await middleware(createOakContext("http://localhost/missing"), () => {
      return Promise.resolve();
    });

    assertEquals(activeSpan.name, "GET");
    assertEquals(activeSpan.attributes, {});
    assertEquals(activeSpan.ended, 0);
  });

  it("creates a fallback request span and keeps it active during the handler", async () => {
    const runtime = createRuntime();
    const telemetryRuntime = createTelemetryRuntime();
    const middleware = INTERNALS.createTelemetryMiddleware(
      runtime,
      {},
      telemetryRuntime.runtime,
    );
    const ctx = createOakContext("http://localhost/users/123?draft=true");

    let spanSeenInHandler: FakeSpan | undefined;

    await middleware(ctx, () => {
      spanSeenInHandler = telemetryRuntime.runtime.getActiveSpan();
      ctx.response.status = 201;
      return Promise.resolve();
    });

    assertEquals(telemetryRuntime.started.length, 1);

    const startedSpan = telemetryRuntime.started[0];
    assertExists(startedSpan);
    assertEquals(startedSpan.name, "GET /users/:id");
    assertEquals(startedSpan.options.kind, "server");
    assertEquals(
      startedSpan.options.attributes,
      {
        "http.request.method": "GET",
        "http.route": "/users/:id",
        "url.full": "http://localhost/users/123?draft=true",
        "url.path": "/users/123",
        "url.query": "draft=true",
        "curio.route.operation_id": "getUser",
      },
    );
    assertStrictEquals(spanSeenInHandler, startedSpan.span);
    assertEquals(startedSpan.span.attributes["http.response.status_code"], 201);
    assertEquals(startedSpan.span.ended, 1);
  });

  it("omits route metadata when no Curio route matches the request", async () => {
    const runtime = createRouteWithoutOperationId();
    const telemetryRuntime = createTelemetryRuntime();
    const middleware = INTERNALS.createTelemetryMiddleware(
      runtime,
      {},
      telemetryRuntime.runtime,
    );

    await middleware(createOakContext("http://localhost/missing"), () => {
      // The branch is only here to complete middleware execution.
      return Promise.resolve();
    });

    const startedSpan = telemetryRuntime.started[0];
    assertExists(startedSpan);
    assertEquals(startedSpan.name, "GET");
    assertEquals(startedSpan.options.attributes, {
      "http.request.method": "GET",
      "url.full": "http://localhost/missing",
      "url.path": "/missing",
    });
  });

  it("records fallback-span errors, ends the span, and supports custom tracers", async () => {
    const runtime = createRuntime();
    const telemetryRuntime = createTelemetryRuntime();
    const tracer = telemetryRuntime.runtime.getTracer();
    const middleware = INTERNALS.createTelemetryMiddleware(
      runtime,
      { tracer: tracer as OakTelemetryOptions["tracer"] },
      telemetryRuntime.runtime,
    );

    await assertRejects(
      () =>
        middleware(createOakContext("http://localhost/users/123"), () => {
          throw new Error("broken");
        }),
      Error,
      "broken",
    );

    const startedSpan = telemetryRuntime.started[0];
    assertExists(startedSpan);
    assertEquals(startedSpan.span.exceptions.length, 1);
    assertEquals(startedSpan.span.statuses, [{
      code: "error",
      message: "broken",
    }]);
    assertEquals(startedSpan.span.ended, 1);
  });
});
