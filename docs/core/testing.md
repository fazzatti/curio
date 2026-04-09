# Testing

`@curio/core/testing` provides deterministic, model-aware testing helpers for
Curio applications and core-package tests.

The current surface is intentionally focused around fixture generation.

## Why It Exists

Curio already knows a lot about a model:

- field kinds
- labels
- defaults
- bound entities

`createFixtureBuilder(...)` uses that metadata so tests can generate records
without repeating low-value setup in every test file.

## Basic Example

```ts
import { createFixtureBuilder } from "@curio/core/testing";
import { UserModel } from "@/db/tables/user.ts";

const users = createFixtureBuilder(UserModel, {
  seed: "users",
});

const record = users.build();
const many = users.buildMany(3);
```

The generated records are deterministic for the same seed.

## Bound Entities

You can pass either:

- a `Model`
- or a bound entity class from `Entity.from(model)`

When a bound entity class is used, the builder can hydrate entity instances
directly:

```ts
import { createFixtureBuilder } from "@curio/core/testing";
import { User } from "@/db/entities/user.ts";

const users = createFixtureBuilder(User);
const entity = users.hydrate();
```

## Persistence Helpers

Fixture builders can also persist records through a repository:

```ts
const created = await users.create(db.User);
const createdMany = await users.createMany(db.User, 2);
```

That keeps persistence tests aligned with the same deterministic fixture source.

## Custom Generators

Model-aware defaults are helpful, but some domains need more specific values.

Use `generators` to override fields:

```ts
const users = createFixtureBuilder(UserModel, {
  generators: {
    email: ({ sequence }) => `staff+${sequence("email")}@example.com`,
    role: ({ pick }) => pick(["owner", "editor", "viewer"] as const),
  },
});
```

Each generator receives:

- `index`
- `field`
- `modelName`
- the partial `record`
- deterministic `random()`
- deterministic `pick(...)`
- deterministic `sequence(...)`

## Default Behavior

Out of the box, fixture generation understands common Curio field kinds:

- `id`
- `uuid`
- `string`
- `text`
- `boolean`
- `integer`
- `number`
- `datetime`
- `json`
- `enum`

It prefers deterministic values over dynamic defaults such as
`crypto.randomUUID()` or `new Date()`.

That is deliberate. Tests should be stable first. Use custom generators when a
model needs more domain-specific fixture semantics.
