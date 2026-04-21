# HTTP

Curio's HTTP layer has two faces:

- a framework-agnostic root surface
- an Oak-first happy path

## Recommended Happy Path

For normal applications, import from `@curio/core/http/oak`.

That gives you:

- `API.from(routes)`
- `API.build(routes)`
- `Route(pathSegment, config)`
- `middleware(...)`
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- `Oak` as a convenience namespace

The Oak entrypoint keeps `ctx.raw` typed as Oak's router context.

## Adapter-Agnostic Surface

The root `@curio/core` entrypoint stays transport-agnostic.

Use it when you want to bind route trees to a custom runtime:

```ts
import { API } from "@curio/core";

const runtime = API.withHttp(customAdapter).build(routes);
const router = runtime.router;
```

This is the escape hatch for advanced transport integrations.

## Build Artifacts

`API.from(routes)` is still the normal happy path.

When you need advanced tooling from the same route tree, use `API.build(routes)`
instead:

```ts
import { API, GET, Route } from "@curio/core/http/oak";

const runtime = API.build([
  Route("health", {
    GET: GET({
      docs: {
        operationId: "getHealth",
      },
      handler: () => ({
        payload: { ok: true },
      }),
    }),
  }),
]);

runtime.router;
runtime.routes[0]?.path;
runtime.routes[0]?.docs?.operationId;
runtime.routes[0]?.schemas?.response;
```

The build artifact gives you:

- the assembled runtime router
- normalized registered routes
- the composed runtime handler Curio will register
- attached request and response schema metadata when it exists

This is the shared foundation for advanced tooling such as OpenAPI generation.

Oak build artifacts also expose `runtime.telemetry()` for route-aware
OpenTelemetry middleware:

```ts
const runtime = API.build([healthRoute]);

app.use(runtime.telemetry());
app.use(runtime.router.routes());
app.use(runtime.router.allowedMethods());
```

Use `@curio/core/http/oak/telemetry` directly when you want the same middleware
through an explicit advanced entrypoint with options.

## Route Model

Curio routes are defined as a tree of single relative path segments:

```ts
import { Route } from "@curio/core/http/oak";

const usersRoute = Route("users", {
  children: [
    Route(":id", {
      GET: async (ctx) => {
        ctx.response.send({
          payload: { id: ctx.request.params.id },
        });
      },
    }),
  ],
});
```

Curio validates the tree before assembling the runtime router:

- no duplicate sibling segments
- no duplicate resolved method paths
- no multi-segment route nodes
- no mismatched method operation objects

## Method Entry Shapes

Each method key supports three shapes:

1. plain handler shorthand
2. explicit config object
3. built-in operation object from `GET(...)`, `POST(...)`, `PUT(...)`,
   `PATCH(...)`, or `DELETE(...)`

Plain handler:

```ts
Route("health", {
  GET: async (ctx) => {
    ctx.response.send({
      payload: { ok: true },
    });
  },
});
```

Explicit config:

```ts
Route("health", {
  GET: {
    handler: async (ctx) => {
      ctx.response.send({
        payload: { ok: true },
      });
    },
  },
});
```

Built-in operation:

```ts
import * as v from "@valibot/valibot";
import { GET, Route } from "@curio/core/http/oak";

Route("health", {
  GET: GET({
    responseSchema: v.object({
      ok: v.boolean(),
    }),
    handler: () => ({
      payload: { ok: true },
    }),
  }),
});
```

## Built-In Operations

The built-in operations are the main happy path. They:

- parse `pathParams`, `query`, and `body` where relevant
- validate input with the built-in Valibot adapter
- pass typed parsed values into the handler
- validate the response payload when a response schema exists
- send the raw payload as the HTTP response body

Default parsing behavior:

- `GET` and `DELETE` parse `pathParams` and `query`
- `POST`, `PUT`, and `PATCH` can also parse `body`

## Middleware

Curio supports two middleware shapes.

### Pass-Through Middleware

Pass-through middleware receives `ctx` and `next()`:

```ts
import { middleware } from "@curio/core/http/oak";

const requestLogger = middleware(async (ctx, next) => {
  console.log(ctx.request.method, ctx.request.path);
  await next();
});
```

### Keyed Middleware

Keyed middleware returns typed data stored under `ctx.middlewareData[key]`:

```ts
import { GET, middleware, Route } from "@curio/core/http/oak";

const auth = middleware("auth", async ({ ctx, halt }) => {
  const token = ctx.request.headers.get("authorization");

  if (!token) {
    halt({
      status: 401,
      payload: { error: "Unauthorized" },
    });
  }

  return { accountId: "account_123" };
});

const meRoute = Route("me", {
  GET: GET({
    middlewares: [auth],
    handler: (_input, ctx) => ({
      payload: {
        accountId: ctx.middlewareData.auth.accountId,
      },
    }),
  }),
});
```

## Telemetry

Curio's telemetry integration is explicit and Oak-specific. Deno still owns
OpenTelemetry bootstrap, providers, exporters, and environment configuration.
Curio only adds the route-aware metadata the runtime cannot derive from Oak by
itself.

```ts
import { API, GET, Route } from "@curio/core/http/oak";

const runtime = API.build([
  Route("users", {
    children: [
      Route(":id", {
        GET: GET({
          docs: {
            operationId: "getUser",
          },
          handler: () => ({
            payload: { ok: true },
          }),
        }),
      }),
    ],
  }),
]);

app.use(runtime.telemetry());
app.use(runtime.router.routes());
app.use(runtime.router.allowedMethods());
```

The middleware:

- reuses an already-active request span when one exists
- creates a fallback server span when no active span exists
- sets `http.route` from Curio route metadata
- renames the span to `METHOD /route/:params`
- adds `curio.route.operation_id` when `docs.operationId` exists

For Deno runtime setup, keep using the
[Deno OpenTelemetry docs](https://docs.deno.com/runtime/fundamentals/open_telemetry/).

## Advanced Documentation Metadata

Route methods can carry documentation metadata for advanced tooling:

```ts
Route("users", {
  GET: GET({
    docs: {
      summary: "List users",
      tags: ["Users"],
      operationId: "listUsers",
      successStatus: "200",
      responses: {
        "401": {
          description: "Authentication required.",
        },
      },
    },
    handler: () => ({
      payload: [],
    }),
  }),
});
```

That metadata is currently consumed by `@curio/core/openapi`.

## Custom Handlers And `withSchemas(...)`

Built-in operations already attach request and response schema metadata for
tooling. Plain custom handlers do not.

When you want advanced tooling such as OpenAPI to understand a custom handler,
annotate it with `withSchemas(...)` from `@curio/core`:

```ts
import * as v from "@valibot/valibot";
import { withSchemas } from "@curio/core";

const handler = withSchemas(
  async (ctx) => {
    ctx.response.send({
      payload: { ok: true },
    });
  },
  {
    response: v.object({
      ok: v.boolean(),
    }),
  },
);
```

This is an advanced path, not the default one.
