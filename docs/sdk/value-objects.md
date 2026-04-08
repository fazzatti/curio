# Value Objects

`@curio/sdk/value-object` provides a Valibot-backed base for class-based value
objects.

This is an advanced domain primitive, not part of Curio's default happy path.

## Why It Exists

Some values should be more explicit than naked strings or numbers:

- email addresses
- slugs
- user IDs
- money-like objects

Curio's value-object base gives those values:

- schema-backed construction
- explicit runtime types
- equality behavior
- JSON serialization behavior

## Basic Example

```ts
import * as v from "@valibot/valibot";
import { ValueObject } from "@curio/sdk/value-object";

class Email extends ValueObject.define({
  name: "Email",
  schema: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email()),
}) {
  get domain() {
    return this.value.split("@")[1]!;
  }
}

const email = Email.parse("  Alice@Example.com ");
email.value;
email.domain;
```

## What Curio Provides

Classes created through `ValueObject.define(...)` get:

- `new Value(input)`
- `Value.parse(input)`
- `Value.safeParse(input)`
- `Value.is(input)`
- `Value.from(parsedValue)`
- instance `.value`
- instance `.equals(other)`
- instance `.toJSON()`
- instance `.toString()`
- instance `.unwrap()`

## Custom Serialization

You can define how the value object serializes:

```ts
class Coordinate extends ValueObject.define({
  name: "Coordinate",
  schema: v.object({
    x: v.number(),
    y: v.number(),
  }),
  serialize(value) {
    return `${value.x},${value.y}`;
  },
}) {}
```

## Metadata Helpers

The entrypoint also exposes low-level helpers for advanced cases:

- `isValueObjectClass(...)`
- `isValueObjectInstance(...)`
- `getValueObjectDefinition(...)`
- `parseValueObject(...)`
- `assertValueObject(...)`

Use those when you need runtime inspection or generic helper code around value
objects.
