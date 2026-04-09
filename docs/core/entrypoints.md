# Entrypoints

Curio publishes focused core entrypoints so consumers only pull in the parts they
intend to use.

## Public Entrypoints

| Import path | Purpose |
| --- | --- |
| `@curio/core` | Adapter-agnostic HTTP primitives, schema adapters, DB primitives |
| `@curio/core/http/oak` | Oak-first route authoring and API assembly |
| `@curio/core/testing` | Deterministic, model-aware fixture builders |
| `@curio/core/value-object` | Valibot-backed, class-based value object base |
| `@curio/core/admin` | Server-rendered admin runtime, config types, built-in admin models |
| `@curio/core/admin/modules/rbac` | Built-in admin roles, permissions, grants, and permission seeding |
| `@curio/core/admin/modules/sessions` | Built-in admin session and auth helpers |
| `@curio/core/admin/modules/audit` | Built-in admin audit helpers |
| `@curio/core/auth` | Password hashing helpers |
| `@curio/core/drizzle` | Drizzle/Postgres adapter |
| `@curio/core/openapi` | Advanced route-tree to OpenAPI generation |

## Why The Root Barrel Is Narrow

The root entrypoint is intentionally not the universal import path for
everything Curio exposes.

That keeps the package easier to reason about:

- Oak-specific behavior stays under `http/oak`
- testing helpers stay under `testing`
- value-object helpers stay under `value-object`
- admin opinionated modules stay under `admin/modules/*`
- Drizzle stays off the root path
- OpenAPI stays an advanced surface, not part of the default runtime story

## Rule Of Thumb

Start from the most specific entrypoint that matches your use case.

- building routes on Oak: `@curio/core/http/oak`
- building deterministic fixtures: `@curio/core/testing`
- defining domain primitives: `@curio/core/value-object`
- mounting the admin: `@curio/core/admin`
- seeding admin roles and permissions: `@curio/core/admin/modules/rbac`
- generating a spec document: `@curio/core/openapi`

Drop to `@curio/core` only when you need the generic contracts or DB primitives.
