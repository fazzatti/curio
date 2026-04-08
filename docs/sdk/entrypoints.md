# Entrypoints

Curio publishes focused SDK entrypoints so consumers only pull in the parts they
intend to use.

## Public Entrypoints

| Import path | Purpose |
| --- | --- |
| `@curio/sdk` | Adapter-agnostic HTTP primitives, schema adapters, DB primitives |
| `@curio/sdk/http/oak` | Oak-first route authoring and API assembly |
| `@curio/sdk/admin` | Server-rendered admin runtime, config types, built-in admin models |
| `@curio/sdk/admin/modules/rbac` | Built-in admin roles, permissions, grants, and permission seeding |
| `@curio/sdk/admin/modules/sessions` | Built-in admin session and auth helpers |
| `@curio/sdk/admin/modules/audit` | Built-in admin audit helpers |
| `@curio/sdk/auth` | Password hashing helpers |
| `@curio/sdk/drizzle` | Drizzle/Postgres adapter |
| `@curio/sdk/openapi` | Advanced route-tree to OpenAPI generation |

## Why The Root Barrel Is Narrow

The root entrypoint is intentionally not the universal import path for
everything Curio exposes.

That keeps the package easier to reason about:

- Oak-specific behavior stays under `http/oak`
- admin opinionated modules stay under `admin/modules/*`
- Drizzle stays off the root path
- OpenAPI stays an advanced surface, not part of the default runtime story

## Rule Of Thumb

Start from the most specific entrypoint that matches your use case.

- building routes on Oak: `@curio/sdk/http/oak`
- mounting the admin: `@curio/sdk/admin`
- seeding admin roles and permissions: `@curio/sdk/admin/modules/rbac`
- generating a spec document: `@curio/sdk/openapi`

Drop to `@curio/sdk` only when you need the generic contracts or DB primitives.
