# OpenAPI

`@curio/sdk/openapi` is an advanced entrypoint that generates an OpenAPI 3.1
document from the same Curio route tree used to assemble the HTTP runtime.

It does not depend on the Oak router instance. It works from the route
definitions and the same normalized build pass Curio uses for runtime assembly.

## Why It Is Separate

OpenAPI generation is useful, but it is not part of the default happy path for
building or serving requests. Keeping it in a dedicated entrypoint avoids
overloading the main SDK runtime story.

## Minimal Example

```ts
import * as v from "@valibot/valibot";
import { GET, Route } from "@curio/sdk/http/oak";
import { OpenAPI } from "@curio/sdk/openapi";

const routes = [
  Route("health", {
    GET: GET({
      docs: {
        summary: "Health check",
        tags: ["System"],
      },
      responseSchema: v.object({
        ok: v.boolean(),
      }),
      handler: () => ({
        payload: { ok: true },
      }),
    }),
  }),
];

const document = OpenAPI.from(routes, {
  info: {
    title: "Example API",
    version: "0.1.0",
  },
});
```

## What It Understands

Out of the box, OpenAPI generation understands:

- route trees
- built-in Curio method helpers
- request `pathParams`, `query`, and `body` schemas
- response payload schemas
- route-level docs metadata such as:
  - `summary`
  - `description`
  - `tags`
  - `operationId`
  - `deprecated`
  - `successStatus`
  - `responses`

## Custom Handlers

Built-in Curio operations attach schema metadata automatically.

If you write a plain custom handler and still want OpenAPI coverage, annotate it
with `withSchemas(...)`:

```ts
import * as v from "@valibot/valibot";
import { Route, withSchemas } from "@curio/sdk";
import { OpenAPI } from "@curio/sdk/openapi";

const routes = [
  Route("health", {
    GET: {
      handler: withSchemas(
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
      ),
    },
  }),
];

const document = OpenAPI.from(routes);
```

## Current Limits

The current OpenAPI surface is intentionally focused:

- built around Valibot-backed schema conversion
- optimized for the current Curio happy path
- not yet a full multi-status response modeling system

It is ready for practical documentation generation without turning the runtime
API into a documentation-first abstraction.
