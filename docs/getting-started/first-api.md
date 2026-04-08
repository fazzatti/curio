# Build a First API

Curio APIs are defined as a tree of single path segments. The Oak happy path
lives under `@curio/sdk/http/oak`.

## Basic Route

```ts
import * as v from "@valibot/valibot";
import { API, GET, Route } from "@curio/sdk/http/oak";

const healthRoute = Route("health", {
  GET: GET({
    responseSchema: v.object({
      ok: v.boolean(),
    }),
    handler: () => ({
      payload: { ok: true },
    }),
  }),
});

export const api = API.from([healthRoute]);
```

## Reuse The Build Artifact When You Need Tooling

Most apps should stay on `API.from(routes)`.

When you need the router plus Curio's normalized route registrations, use
`API.build(routes)`:

```ts
const runtime = API.build([healthRoute]);

runtime.router;
runtime.routes;
```

That is the intended advanced path for tooling built from the same route tree.

## Built-In Operations

The built-in `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` helpers do the common
work for the Oak and Valibot happy path:

- parse declared request input
- validate request input with Valibot
- call your handler with typed parsed values
- validate the response payload when a response schema exists
- write the payload to the HTTP response

Example:

```ts
import * as v from "@valibot/valibot";
import { POST, Route } from "@curio/sdk/http/oak";

const createUserRoute = Route("users", {
  POST: POST({
    requestSchema: {
      body: v.object({
        email: v.pipe(v.string(), v.email()),
      }),
    },
    responseSchema: v.object({
      id: v.string(),
      email: v.string(),
    }),
    handler: async ({ body }) => ({
      status: 201,
      payload: {
        id: crypto.randomUUID(),
        email: body.email,
      },
    }),
  }),
});
```

## Generated Template Shape

The default template keeps HTTP routes in `src/http/api/` and assembles them in
`src/http/api/index.ts`:

```ts
import type { RouteSegment } from "@curio/sdk";
import { API } from "@curio/sdk/http/oak";
import type { OakHttpContext } from "@curio/sdk/http/oak";
import { healthRoute } from "@/http/api/health/index.ts";
import { usersRoute } from "@/http/api/users/index.ts";

export const httpRoutes: RouteSegment<OakHttpContext>[] = [
  healthRoute,
  usersRoute,
];

export const httpApi = API.from(httpRoutes);
```

## When To Drop Down A Level

Use the root `@curio/sdk` entrypoint when you need adapter-agnostic HTTP
building blocks:

- `API.withHttp(adapter)`
- `API.withHttp(adapter).build(routes)`
- `createRouteFactory()`
- `createMiddlewareFactory()`
- `createEndpointOperations()`

If you are building a normal Curio app on Oak, stay on the Oak entrypoint.

## Related Docs

- [HTTP](../sdk/http.md)
- [OpenAPI](../sdk/openapi.md)
- [Extension Points](../architecture/extension-points.md)
