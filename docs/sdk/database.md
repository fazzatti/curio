# Database

Curio's DB layer is relational-first and explicit. It centers on a small set of
primitives instead of hiding persistence behind runtime magic.

## Core Primitives

- `Model`
- `field(...)`
- `relation(...)`
- `Entity.from(model)`
- `Database.create(...)`

## Defining Models

```ts
import * as v from "@valibot/valibot";
import { Model, UuidPrimaryKey, field } from "@curio/sdk";

export const UserModel = new Model({
  name: "users",
  fields: {
    ...UuidPrimaryKey.fields,
    email: field.string({
      unique: true,
      validation: v.pipe(v.string(), v.email()),
    }),
    name: field.string(),
  },
});
```

Curio also ships common field variants such as:

- `UuidPrimaryKey`
- `Timestamps`

## Entities

Entities bind classes to models so records can expose behavior while still
serializing correctly.

```ts
import { Entity } from "@curio/sdk";

export class User extends Entity.from(UserModel) {
  get displayName() {
    return this.name || this.email;
  }
}
```

## Database Creation

```ts
import { Database, valibotSchemaAdapter } from "@curio/sdk";

export const db = Database.create({
  adapter: memoryDatabaseAdapter(),
  schemaAdapter: valibotSchemaAdapter,
  tables: {
    users: UserModel,
  },
});
```

At creation time, Curio wires:

- model registry
- repositories
- optional schema validation
- relation loading
- adapter-specific persistence behavior

## Repositories

Repositories expose a typed data-access surface with:

- `create(...)`
- `findMany(...)`
- `findOne(...)`
- `findById(...)`
- `getById(...)`
- `updateById(...)`
- `deleteById(...)`

Supported query features include:

- filtering
- ordering
- pagination
- relation includes
- transactions

## Adapters

Curio separates the DB contract from the backing storage adapter.

Current built-ins:

- `memoryDatabaseAdapter` from `@curio/sdk`
- `drizzleAdapter` from `@curio/sdk/drizzle`

Use memory for fast tests and in-process development scenarios. Use Drizzle
when you want a SQL-backed runtime.

## Validation

Model validation can run through the configured schema adapter. The common happy
path is Valibot via `valibotSchemaAdapter`.

This keeps input and persistence constraints explicit without forcing the entire
DB layer to be Valibot-only forever.

## Admin Relationship

The Curio admin talks to repositories directly. It does not consume the public
HTTP API. That is intentional:

- the admin stays server-rendered
- the admin shares the same persistence contracts as backend code
- the admin can operate on typed resources and relations without duplicating API
  logic
