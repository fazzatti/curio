# Extension Points

Curio is opinionated, but it is not meant to be rigid.

This page describes the intended places where advanced users can customize the
framework without forcing the happy path to become complicated.

## HTTP Adapters

The root `API` namespace is adapter-agnostic:

```ts
import { API } from "@curio/sdk";

const api = API.withHttp(customAdapter);
const router = api.from(routes);
```

That is the primary transport extension point.

The Oak helpers in `@curio/sdk/http/oak` are the built-in happy path layered on
top of that contract.

## Middleware Composition

Curio middleware is composable and typed:

- pass-through middleware for request flow control
- keyed middleware for typed per-request data

This is the intended way to inject authentication, request context, tracing,
and similar cross-cutting concerns into the route layer.

## Custom Handlers With Schema Metadata

The built-in Curio operations already attach schema metadata. Plain handlers do
not.

`withSchemas(...)` is the advanced escape hatch for custom handlers that still
need to participate in schema-driven tooling such as OpenAPI generation.

That keeps the happy path simple while leaving room for expert composition.

## Schema Adapters

Curio currently ships the Valibot happy path. Advanced users can still work at
the lower-level schema adapter boundary in the SDK and DB layers.

The current built-in method helpers are optimized for Valibot-backed request and
response handling. That is a deliberate v1 constraint, not a statement that
alternative schema integrations are impossible forever.

## Admin Overrides

The admin runtime supports composition through:

- resource registration
- view registration
- flow registration
- widget registration
- component overrides
- presets

That is where admin customization should happen. The admin should not require a
client-heavy rewrite just to support project-specific behavior.

## Future Admin Modules

Curio's `admin/modules/*` structure is meant to scale to future modules as long
as they remain:

- additive
- focused
- easy to adopt
- explicit about conflicts

Modules should not silently override each other or blur the runtime boundary.
