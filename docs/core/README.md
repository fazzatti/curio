# Core Package Overview

`@curio/core` is the reusable framework package in the Curio monorepo. It owns
the runtime layers that applications build on top of: HTTP authoring, schema
integration, the relational-first DB layer, the server-rendered admin runtime,
focused admin modules, testing fixtures, value objects, and advanced OpenAPI
generation.

Use `@curio/init` to scaffold a project. Use `@curio/core` inside the generated
application and any other Curio-based backend that wants the reusable runtime
surface.

## Installation

```sh
deno add jsr:@curio/core
```

## Architecture At A Glance

- **HTTP** — Oak-first route authoring with an adapter-agnostic core beneath it
- **Database** — models, entities, relations, repositories, and adapters
- **Admin** — server-rendered admin runtime plus focused Curio modules
- **Tooling** — OpenAPI generation, testing fixtures, and value objects

## Quick Import Examples

### HTTP

```ts
import { API, GET, Route } from "@curio/core/http/oak";
```

### Database

```ts
import { Database, field, Model } from "@curio/core";
```

### Admin

```ts
import { Admin } from "@curio/core/admin";
```

### OpenAPI

```ts
import { OpenAPI } from "@curio/core/openapi";
```

### Testing

```ts
import { createFixtureBuilder } from "@curio/core/testing";
```

### Value Objects

```ts
import { ValueObject } from "@curio/core/value-object";
```

## Choosing An Entrypoint

- use `@curio/core/http/oak` for normal API work
- use `@curio/core` for framework-agnostic primitives and the DB layer
- use `@curio/core/testing` for deterministic, model-aware fixtures
- use `@curio/core/value-object` for class-based domain primitives
- use `@curio/core/admin` for the admin runtime
- use `@curio/core/admin/modules/*` for focused built-in admin modules
- use `@curio/core/openapi` when you want a spec document from your route tree

## Next Steps

- [Entrypoints](entrypoints.md)
- [HTTP](http.md)
- [Database](database.md)
- [Admin](admin.md)
- [Admin Modules](admin-modules.md)
- [Testing](testing.md)
- [Value Objects](value-objects.md)
- [Auth](auth.md)
- [Drizzle](drizzle.md)
- [OpenAPI](openapi.md)
