# Core

`@curio/core` is the reusable framework package in the Curio monorepo.

It combines:

- HTTP route authoring
- schema-backed request and response handling
- a relational-first DB layer
- deterministic testing fixtures
- class-based value objects
- a server-rendered admin runtime
- focused modules for admin RBAC, sessions, and audit
- optional Drizzle/Postgres integration
- advanced OpenAPI generation

## Design Goal

The core package is built around a strong happy path:

- Oak for HTTP transport
- Valibot for schema-backed request and response validation
- Curio's own DB abstractions for repositories and admin integration

That happy path is deliberate, but it is not meant to hard-code the entire
framework around one runtime forever. The root core entrypoint remains
adapter-agnostic and exposes lower-level contracts for advanced users.

## How To Choose An Entrypoint

- use `@curio/core/http/oak` for normal API work
- use `@curio/core` for framework-agnostic primitives and the DB layer
- use `@curio/core/testing` for deterministic, model-aware fixtures
- use `@curio/core/value-object` for class-based domain primitives
- use `@curio/core/admin` for the admin runtime
- use `@curio/core/admin/modules/*` for focused built-in admin modules
- use `@curio/core/openapi` when you want a spec document from your route tree

## Documentation

- [Entrypoints](entrypoints.md)
- [HTTP](http.md)
- [Database](database.md)
- [Testing](testing.md)
- [Value Objects](value-objects.md)
- [Admin](admin.md)
- [Admin Modules](admin-modules.md)
- [Auth](auth.md)
- [Drizzle](drizzle.md)
- [OpenAPI](openapi.md)
