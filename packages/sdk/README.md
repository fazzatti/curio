# Curio SDK

Curio is a TypeScript-first backend toolkit for Deno. It combines:

- a typed route authoring model
- a small relational-first persistence layer
- a server-rendered admin mounted directly on the backend
- optional Drizzle/Postgres integration

The package is published in focused entrypoints so backends can opt into only
the pieces they need.

## Entry Points

- `@curio/sdk`
  - framework-agnostic HTTP helpers
  - bind route trees to a runtime with `API.withHttp(adapter)`
  - schema adapters
  - DB primitives
- `@curio/sdk/http/oak`
  - Oak-bound route helpers and API factory
- `@curio/sdk/admin`
  - server-rendered admin runtime
  - built-in RBAC/session/audit models
- `@curio/sdk/admin/modules/rbac`
  - built-in admin roles, permissions, and role-assignment helpers
- `@curio/sdk/admin/modules/sessions`
  - built-in admin session/auth helpers
- `@curio/sdk/admin/modules/audit`
  - built-in admin audit helpers
- `@curio/sdk/auth`
  - password hashing helpers
- `@curio/sdk/drizzle`
  - Drizzle/Postgres database adapter
- `@curio/sdk/openapi`
  - advanced route-tree to OpenAPI document generation

## Quick Example

```ts
import * as v from "@valibot/valibot";
import { API, GET, Route } from "@curio/sdk/http/oak";

const healthRoute = Route("health", {
  GET: GET({
    responseSchema: v.object({
      ok: v.boolean(),
    }),
    handler: () => ({
      payload: {
        ok: true,
      },
    }),
  }),
});

const api = API.from([healthRoute]);
```

## HTTP Authoring Model

Routes are declared as a tree of single relative path segments. Curio validates
the tree, flattens it into method/path registrations, and hands the result to
the selected HTTP adapter.

```ts
import { API, Route } from "@curio/sdk/http/oak";

const routes = [
  Route("users", {
    children: [
      Route(":id", {
        GET: async (ctx) => {
          ctx.response.send({
            payload: { id: ctx.request.params.id },
          });
        },
      }),
    ],
  }),
];

const api = API.from(routes);
```

### Method Entry Shapes

Curio accepts three shapes under each method key:

1. Plain handler shorthand
2. Explicit method config object
3. Built-in operation object from `GET(...)`, `POST(...)`, `PUT(...)`,
   `PATCH(...)`, or `DELETE(...)`

```ts
Route("health", {
  GET: async (ctx) => {
    ctx.response.send({
      payload: { ok: true },
    });
  },
});
```

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

```ts
import * as v from "@valibot/valibot";
import { GET, Route } from "@curio/sdk/http/oak";

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

### Built-In Method Helpers

The built-in helpers:

- parse declared `pathParams`, `query`, and `body` input
- validate parsed input through the built-in Valibot adapter
- run the user handler with typed parsed input
- validate the returned `payload` against the declared response schema
- send the raw `payload` as the HTTP response body

Method defaults:

- `GET(...)` parses `pathParams` and `query`
- `DELETE(...)` parses `pathParams` and `query`
- `POST(...)`, `PUT(...)`, and `PATCH(...)` can also parse `body`

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
    handler: async ({ body }) => {
      return {
        status: 201,
        payload: {
          id: crypto.randomUUID(),
          email: body.email,
        },
      };
    },
  }),
});
```

### Middleware

Curio supports two middleware shapes:

- pass-through middleware
- keyed middleware

Pass-through middleware receives `ctx` plus `next()`:

```ts
import { middleware } from "@curio/sdk/http/oak";

const requestLogger = middleware(async (ctx, next) => {
  console.log(ctx.request.method, ctx.request.path);
  await next();
});
```

Keyed middleware returns typed data that becomes available on
`ctx.middlewareData`:

```ts
import { GET, middleware, Route } from "@curio/sdk/http/oak";

const auth = middleware("auth", async ({ ctx, halt }) => {
  const token = ctx.request.headers.get("authorization");

  if (!token) {
    halt({
      status: 401,
      payload: { error: "Unauthorized" },
    });
  }

  return {
    accountId: "account_123",
  };
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

## HTTP Context

Built-in Curio helpers run against a Curio-owned HTTP context:

- `ctx.raw`
- `ctx.request.method`
- `ctx.request.path`
- `ctx.request.headers`
- `ctx.request.query`
- `ctx.request.params`
- `ctx.request.body()`
- `ctx.middlewareData`
- `ctx.response.setStatus(...)`
- `ctx.response.setHeaders(...)`
- `ctx.response.setPayload(...)`
- `ctx.response.send(...)`

Parsed request values are intentionally not attached to `ctx`; they live in the
built-in request pipeline input passed to the operation handler.

## DB Layer

The persistence layer centers on three primitives:

- `new Model({...})`
- `Entity.from(model)`
- `Database.create({...})`

```ts
import * as v from "@valibot/valibot";
import {
  Database,
  Entity,
  field,
  memoryDatabaseAdapter,
  Model,
  relation,
  Timestamps,
  UuidPrimaryKey,
  valibotSchemaAdapter,
} from "@curio/sdk";

const userCreateSchema = v.object({
  id: v.optional(v.string()),
  email: v.pipe(v.string(), v.email()),
  passwordHash: v.string(),
  createdAt: v.optional(v.date()),
  updatedAt: v.optional(v.date()),
});

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    email: field.string().required().unique(),
    passwordHash: field.string().required().hidden(),
  },
  relations: {
    sessions: relation.hasMany("Session").foreignKey("userId"),
  },
  validation: {
    create: userCreateSchema,
  },
});

class User extends Entity {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  get emailDomain() {
    return this.email.split("@")[1];
  }
}

const db = Database.create({
  adapter: memoryDatabaseAdapter(),
  schemaAdapter: valibotSchemaAdapter,
  tables: {
    User: User.from(UserModel),
  },
});
```

### DB Notes

- table registration happens under `tables`
- table keys must match model names exactly
- relation targets are declared by model name and validated during database
  assembly
- the first relation kinds are `belongsTo` and `hasMany`
- `include` is intentionally one level deep
- repository writes validate automatically when model validation is configured
- `find...` returns `null` for missing rows
- `get...` throws `NotFoundError`
- `findMany(...)` returns hydrated entities
- `db.transaction(async (tx) => ...)` exposes the same repository surface inside
  the transaction

### Entities

Custom entities extend `Entity` and should `declare` the persisted fields they
read directly.

```ts
class User extends Entity {
  declare email: string;

  get emailDomain() {
    return this.email.split("@")[1];
  }
}
```

That matters because:

- TypeScript checks `User.from(UserModel)` against those declared fields
- Curio does not reflect on those declarations at runtime
- getters and methods do not need `declare`
- entity constructors should not require arguments because Curio hydrates by
  instantiating first and assigning persisted values afterward

### Fields

Fields support both object options and fluent chaining.

```ts
email: field.string({ unique: true });
```

```ts
email: field.string().required().unique().searchable(false);
```

Safe-representation flags:

- `hidden()`: omit the field from `toJSON()`
- `obfuscate()`: keep the key but replace the value with `"<redacted>"`

These flags affect safe serialization only. Raw in-memory access is unchanged.

## Admin

Import the admin from the dedicated subpath:

```ts
import { Admin } from "@curio/sdk/admin";
```

The admin is:

- backend-mounted
- server-rendered with Preact SSR
- coupled directly to Curio DB repositories
- cookie-session based
- backed by normalized RBAC tables

The admin does not consume your public HTTP API by default.

Minimal setup:

```ts
import { Admin } from "@curio/sdk/admin";

const admin = Admin.create({
  db,
  presets: ["default"],
});

admin.mount(app);
```

### Default Preset

The default preset:

- auto-registers built-in resources it recognizes
  - `User`
  - `Role`
  - `Permission`
  - `Session`
  - `AuditEvent`
- mounts resource routes under `/admin/resources/...`
- supports custom views under `/admin/views/...`
- supports custom flows under `/admin/flows/...`
- renders the dashboard from registered widgets
- seeds built-in roles and permissions
- expects a `User` model with:
  - `name: "User"`
  - `email`
  - `passwordHash`

### Admin Primitives

Use the admin primitives like this:

- `Admin.resource(...)`
  - DB-backed CRUD/read surfaces
- `Admin.view(...)`
  - custom read-only pages and operational views
- `Admin.flow(...)`
  - form-based workflows with side effects
- `Admin.widget(...)`
  - dashboard widgets

Example:

```tsx
/** @jsxImportSource preact */

import { Admin } from "@curio/sdk/admin";

const transactionsView = Admin.view({
  path: "transactions",
  label: "Transaction Queue",
  load: async () => ({
    pending: transactionQueue.summary().pending,
  }),
  render: ({ data }) => <div>{data.pending}</div>,
  live: { mode: "poll", intervalMs: 5000 },
});

const configureChannelsFlow = Admin.flow({
  path: "configure-channels",
  label: "Configure Channels",
  description: "Provision and reconcile Stellar channel accounts.",
  load: async () => ({
    ready: false,
  }),
  render: ({ action, data, error }) => (
    <form action={action} method="post">
      <p>Ready: {String(data.ready)}</p>
      {error ? <p>{error}</p> : null}
      <button type="submit">Run configuration</button>
    </form>
  ),
  submit: async () => ({
    redirectTo: "/admin/flows/configure-channels",
    flash: {
      tone: "success",
      message: "Channels configured.",
    },
  }),
});

const transactionsWidget = Admin.widget({
  key: "transactions",
  title: "Transaction Queue",
  size: "lg",
  href: "/admin/views/transactions",
  load: async () => ({
    pending: transactionQueue.summary().pending,
  }),
  render: ({ data }) => <div>{data.pending}</div>,
});

const admin = Admin.create({
  db,
  presets: ["default"],
  views: {
    transactions: transactionsView,
  },
  flows: {
    configureChannels: configureChannelsFlow,
  },
  widgets: {
    transactions: transactionsWidget,
  },
});
```

### Live Views

Admin views and widgets can opt into polling:

```ts
live: {
  mode: "poll",
  intervalMs: 5000,
}
```

Polling refreshes only the live content region instead of reloading the entire
document, so the admin shell, sidebar, and page state stay stable.

### Built-In Admin Models

`@curio/sdk/admin` also exports the built-in admin/auth models:

- `Role`
- `Permission`
- `UserRole`
- `RolePermission`
- `Session`
- `AuditEvent`

Curio's shipped admin modules live under focused subpaths:

- `@curio/sdk/admin/modules/rbac`
  - role and permission seeding
  - role assignment helpers
  - permission checks
- `@curio/sdk/admin/modules/sessions`
  - admin session creation and resolution
  - admin authentication helpers
- `@curio/sdk/admin/modules/audit`
  - audit event recording and loading

Example:

```ts
import { seedDefaultAdminData } from "@curio/sdk/admin/modules/rbac";
import { resolveAdminActor } from "@curio/sdk/admin/modules/sessions";
import { recordAdminAuditEvent } from "@curio/sdk/admin/modules/audit";
```

## OpenAPI

Import OpenAPI generation from the dedicated subpath:

```ts
import { OpenAPI } from "@curio/sdk/openapi";
```

Generate a document from the same route tree you pass to Curio:

```ts
const document = OpenAPI.from(routes, {
  info: {
    title: "Curio API",
    version: "1.0.0",
  },
});
```

This is the advanced path. Built-in Curio operations contribute Valibot
request/response schemas automatically, and plain custom handlers can opt in
through `withSchemas(...)`.

You can also attach lightweight operation docs without affecting runtime
behavior:

```ts
const createUser = POST({
  requestSchema: {
    body: v.object({
      email: v.pipe(v.string(), v.email()),
    }),
  },
  responseSchema: v.object({
    id: v.string(),
  }),
  docs: {
    summary: "Create user",
    tags: ["Users"],
    operationId: "createUser",
    successStatus: "201",
    responses: {
      "409": {
        description: "A user with that email already exists.",
      },
    },
  },
  handler: async ({ body }) => ({
    status: 201,
    payload: {
      id: crypto.randomUUID(),
      email: body.email,
    },
  }),
});
```

## Auth

Import the shared password helpers from the auth subpath:

```ts
import { hashPassword, verifyPassword } from "@curio/sdk/auth";
```

These helpers currently use PBKDF2-SHA256 via Web Crypto and store hashes in the
format:

```txt
<scheme>$<iterations>$<salt>$<digest>
```

## Drizzle Adapter

Import the SQL adapter from the Drizzle subpath:

```ts
import { drizzleAdapter } from "@curio/sdk/drizzle";
```

This split is intentional. The root SDK entrypoint stays lean for HTTP-only and
memory-backed backends, while SQL-backed backends opt into the Drizzle/Postgres
dependency graph explicitly.

## Package Boundaries

Important design boundaries:

- the admin depends on the Curio DB layer directly
- the admin is backend-mounted and server-rendered
- the admin does not use the public API as its data source
- custom view/flow/widget permissions are seeded automatically but are not
  granted automatically
- the root entrypoint is framework-agnostic
- the Oak subpath is the recommended authoring surface for Oak apps
- the Drizzle adapter is intentionally isolated behind its own subpath

## Status

The package is intended to be published as TypeScript-native source on JSR.
Public entrypoints and exported declarations are documented directly in source
so the generated API docs stay useful when consumed from editors or JSR.
