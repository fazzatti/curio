import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import * as v from "@valibot/valibot";
import { SchemaValidationError } from "@/schema/types.ts";
import {
  assertValueObject,
  getValueObjectDefinition,
  isValueObjectClass,
  isValueObjectInstance,
  parseValueObject,
  ValueObject,
} from "@/value-object.ts";

class Email extends ValueObject.define({
  name: "Email",
  schema: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email()),
}) {
  get domain() {
    return this.value.split("@")[1]!;
  }
}

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

class Username extends ValueObject.define({
  name: "Username",
  schema: v.pipe(v.string(), v.trim()),
}) {}

class TagList extends ValueObject.define({
  name: "TagList",
  schema: v.array(v.string()),
}) {}

class EventWindow extends ValueObject.define({
  name: "EventWindow",
  schema: v.object({
    startsAt: v.date(),
    tags: v.array(v.string()),
  }),
}) {}

Deno.test("ValueObject.define creates class-based value objects with parsing helpers", () => {
  const email = new Email("  Alice@Example.com ");
  const parsed = Email.parse("bob@example.com");
  const safeParsed = Email.safeParse("carol@example.com");

  assertInstanceOf(email, Email);
  assertEquals(email.value, "alice@example.com");
  assertEquals(email.domain, "example.com");
  assertInstanceOf(parsed, Email);
  assertEquals(parsed.value, "bob@example.com");
  assertEquals(safeParsed.success, true);
  assertEquals(
    safeParsed.success && safeParsed.output.value,
    "carol@example.com",
  );
  assert(Email.schema !== undefined);
  assertEquals(Email.is("dave@example.com"), true);
  assertEquals(Email.is(parsed), true);
  assertEquals(Email.is("not-an-email"), false);
});

Deno.test("ValueObject instances support equality, serialization, and metadata lookup", () => {
  const first = Email.parse("ops@example.com");
  const second = Email.from("ops@example.com");
  const third = Email.parse("owner@example.com");
  const point = Coordinate.parse({ x: 10, y: 20 });
  const tags = TagList.parse(["ops", "support"]);
  const window = EventWindow.parse({
    startsAt: new Date("2024-01-01T00:00:00.000Z"),
    tags: ["launch"],
  });

  assert(first.equals(second));
  assertEquals(first.equals(third), false);
  assertEquals(first.equals(Username.parse("ops@example.com")), false);
  assertEquals(first.equals("ops@example.com"), true);
  assertEquals(first.toString(), "ops@example.com");
  assertEquals(first.unwrap(), "ops@example.com");
  assertEquals(point.toJSON(), "10,20");
  assertEquals(tags.equals(["ops", "support"]), true);
  assertEquals(tags.equals(["ops"]), false);
  assertEquals(
    window.equals({
      startsAt: new Date("2024-01-01T00:00:00.000Z"),
      tags: ["launch"],
    }),
    true,
  );
  assertEquals(
    window.equals({
      startsAt: new Date("2024-01-01T00:00:00.000Z"),
      tags: [],
    }),
    false,
  );
  assertEquals(
    window.equals({
      startsAt: new Date("2024-01-01T00:00:00.000Z"),
      tags: ["launch"],
      extra: true,
    }),
    false,
  );
  assert(isValueObjectClass(Email));
  assert(isValueObjectInstance(first));
  assertEquals(getValueObjectDefinition(Email).name, "Email");
  assertInstanceOf(parseValueObject(Email, "parsed@example.com"), Email);
});

Deno.test("ValueObject helpers cover default definitions and assertion helpers", () => {
  const assertCurioValueObject: typeof assertValueObject = assertValueObject;
  const AnonymousValue = ValueObject.define({
    schema: v.object({
      ok: v.boolean(),
    }),
  });

  const value = AnonymousValue.parse({ ok: true });

  assertEquals(AnonymousValue.name, "CurioValueObject");
  assert(value.equals({ ok: true }));
  assertThrows(
    () => assertCurioValueObject(AnonymousValue, { ok: "bad" }),
    SchemaValidationError,
    "Value does not satisfy CurioValueObject.",
  );
  assertCurioValueObject(Email, "owner@example.com");
  assertInstanceOf(value, AnonymousValue);
});

Deno.test("ValueObject parsing failures surface as schema validation errors", () => {
  assertThrows(
    () => Email.parse("broken"),
    SchemaValidationError,
    "Schema validation failed.",
  );

  const result = Email.safeParse("broken");
  assertEquals(result.success, false);
  assertInstanceOf(
    assertThrows(
      () => new Coordinate({ x: "bad", y: 1 }),
      SchemaValidationError,
    ),
    SchemaValidationError,
  );
});
