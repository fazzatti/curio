import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { Database } from "@/db/database.ts";
import { Entity } from "@/db/entity.ts";
import {
  NotFoundError,
  ReservedTableKeyError,
  TableRegistrationNameMismatchError,
  UnknownRelationTargetError,
  UniqueConstraintViolationError,
} from "@/db/errors.ts";
import { field } from "@/db/field.ts";
import { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
import { Model } from "@/db/model.ts";
import { relation } from "@/db/relation.ts";
import type { DatabaseAdapter, TableRegistry } from "@/db/types.ts";
import { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";

const validationAdapter = {
  parse<TOutput>(schema: unknown, input: unknown): TOutput {
    if (typeof schema !== "function") {
      throw new Error("Function schema expected.");
    }

    return (schema as (input: unknown) => TOutput)(input);
  },
};

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    email: field.string().required().unique(),
    passwordHash: field.string().required().hidden(),
    isActive: field.boolean().default(true),
  },
  relations: {
    sessions: relation.hasMany("Session").foreignKey("userId"),
  },
  defaultOrder: [
    { email: "asc" },
  ],
  validation: {
    create(input: unknown) {
      const typedInput = input as Record<string, unknown>;

      if (
        typeof typedInput.email !== "string" ||
        !typedInput.email.includes("@")
      ) {
        throw new Error("Invalid email.");
      }

      return typedInput;
    },
    update(input: unknown) {
      const typedInput = input as Record<string, unknown>;

      if (
        "email" in typedInput &&
        typeof typedInput.email === "string" &&
        !typedInput.email.includes("@")
      ) {
        throw new Error("Invalid email.");
      }

      return typedInput;
    },
  },
});

class UserEntity extends Entity {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  get emailDomain() {
    return this.email.split("@")[1];
  }
}

const SessionModel = new Model({
  name: "Session",
  table: "sessions",
  uses: [UuidPrimaryKey],
  fields: {
    userId: field.uuid().required(),
    token: field.string().required().unique(),
  },
  relations: {
    user: relation.belongsTo("User").foreignKey("userId"),
  },
});

const createTestDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    schemaAdapter: validationAdapter,
    tables: {
      User: UserEntity.from(UserModel),
      Session: SessionModel,
    },
  });

Deno.test("Database.create exposes direct repositories and generic repo access", async () => {
  const db = createTestDatabase();

  const createdUser = await db.User.create({
    email: "ada@example.com",
    passwordHash: "hashed",
  });

  const fetchedUser = await db.repo("User").getById(createdUser.id);

  assertEquals(fetchedUser.email, "ada@example.com");
  assertEquals(fetchedUser.emailDomain, "example.com");
  assertEquals(createdUser.isActive, true);
  assertInstanceOf(createdUser.createdAt, Date);
  assertInstanceOf(createdUser.updatedAt, Date);
});

Deno.test("Database repositories support includes for belongsTo and hasMany", async () => {
  const db = createTestDatabase();

  const user = await db.User.create({
    email: "ada@example.com",
    passwordHash: "hashed",
  });

  const session = await db.Session.create({
    userId: user.id,
    token: "token-1",
  });

  const userWithSessions = await db.User.getById(user.id, {
    include: {
      sessions: true,
    },
  });
  const sessionWithUser = await db.Session.getById(session.id, {
    include: {
      user: true,
    },
  });
  const loadedSessions = (userWithSessions as unknown as {
    sessions: Array<{ token: string }>;
  }).sessions;
  const loadedUser = (sessionWithUser as unknown as {
    user?: { email: string } | null;
  }).user;

  assertEquals(loadedSessions.length, 1);
  assertEquals(loadedSessions[0].token, "token-1");
  assertEquals(loadedUser?.email, "ada@example.com");
});

Deno.test("Database repositories support filters, ordering, pagination, and singular lookups", async () => {
  const db = createTestDatabase();

  await db.User.create({
    email: "zoe@example.com",
    passwordHash: "hashed-a",
  });
  await db.User.create({
    email: "ada@example.com",
    passwordHash: "hashed-b",
  });
  await db.User.create({
    email: "bea@example.com",
    passwordHash: "hashed-c",
  });

  const orderedUsers = await db.User.findMany({
    orderBy: [{ email: "asc" }],
    limit: 2,
    offset: 1,
  });
  const oneUser = await db.User.findOne({
    where: {
      OR: [
        { email: { startsWith: "ada" } },
        { email: { startsWith: "bea" } },
      ],
    },
    orderBy: [{ email: "asc" }],
  });

  assertEquals(orderedUsers.map((user) => user.email), [
    "bea@example.com",
    "zoe@example.com",
  ]);
  assertEquals(oneUser?.email, "ada@example.com");
});

Deno.test("Database repositories support extended scalar operators and enforce uniqueness on update", async () => {
  const db = createTestDatabase();

  const ada = await db.User.create({
    email: "ada@example.com",
    passwordHash: "hashed-a",
    isActive: true,
  });
  const bea = await db.User.create({
    email: "bea@example.com",
    passwordHash: "hashed-b",
    isActive: false,
  });
  await db.User.create({
    email: "zoe@example.com",
    passwordHash: "hashed-c",
    isActive: true,
  });

  assertEquals(
    (await db.User.findMany({
      where: { email: { eq: "ada@example.com" } },
    })).map((user) => user.email),
    ["ada@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { ne: "ada@example.com" } },
      orderBy: [{ email: "asc" }],
    })).map((user) => user.email),
    ["bea@example.com", "zoe@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { in: ["ada@example.com", "zoe@example.com"] } },
      orderBy: [{ email: "asc" }],
    })).map((user) => user.email),
    ["ada@example.com", "zoe@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { notIn: ["ada@example.com"] } },
      orderBy: [{ email: "asc" }],
    })).map((user) => user.email),
    ["bea@example.com", "zoe@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { gt: "bea@example.com" } },
    })).map((user) => user.email),
    ["zoe@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { gte: "bea@example.com" } },
      orderBy: [{ email: "asc" }],
    })).map((user) => user.email),
    ["bea@example.com", "zoe@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { lt: "bea@example.com" } },
    })).map((user) => user.email),
    ["ada@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { lte: "bea@example.com" } },
      orderBy: [{ email: "asc" }],
    })).map((user) => user.email),
    ["ada@example.com", "bea@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { passwordHash: { isNull: false } },
    })).length,
    3,
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { contains: "@example.com" } },
    })).length,
    3,
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { startsWith: "ad" } },
    })).map((user) => user.email),
    ["ada@example.com"],
  );
  assertEquals(
    (await db.User.findMany({
      where: { email: { endsWith: ".com" } },
    })).length,
    3,
  );
  assertEquals(
    (await db.User.findMany({
      where: {
        NOT: [{ email: { startsWith: "ad" } }],
      },
      orderBy: [{ email: "asc" }],
    })).map((user) => user.email),
    ["bea@example.com", "zoe@example.com"],
  );

  await assertRejects(
    () =>
      db.User.updateById(bea.id, {
        email: ada.email,
      }),
    UniqueConstraintViolationError,
  );
});

Deno.test("Database repositories validate by default and allow explicit bypass", async () => {
  const db = createTestDatabase();

  await assertRejects(
    () =>
      db.User.create({
        email: "invalid-email",
        passwordHash: "hashed",
      }),
    Error,
    "Invalid email.",
  );

  const createdUser = await db.User.create(
    {
      email: "invalid-email",
      passwordHash: "hashed",
    },
    { validate: false },
  );

  assertEquals(createdUser.email, "invalid-email");
});

Deno.test("Database singular get methods throw for missing rows while find methods return null", async () => {
  const db = createTestDatabase();

  const missingUser = await db.User.findById("missing");

  assertEquals(missingUser, null);

  await assertRejects(
    () => db.User.getById("missing"),
    NotFoundError,
  );
});

Deno.test("Database transactions commit on success and roll back on failure", async () => {
  const db = createTestDatabase();

  const committedUserId = await db.transaction(async (tx) => {
    const user = await tx.User.create({
      email: "commit@example.com",
      passwordHash: "hashed",
    });

    await tx.Session.create({
      userId: user.id,
      token: "commit-token",
    });

    return user.id;
  });

  await assertRejects(
    () =>
      db.transaction(async (tx) => {
        await tx.User.create({
          email: "rollback@example.com",
          passwordHash: "hashed",
        });

        throw new Error("Abort transaction.");
      }),
    Error,
    "Abort transaction.",
  );

  const committedUser = await db.User.findById(committedUserId, {
    include: {
      sessions: true,
    },
  });
  const rolledBackUser = await db.User.findOne({
    where: {
      email: "rollback@example.com",
    },
  });
  const committedSessions = (committedUser as unknown as {
    sessions?: Array<unknown>;
  } | null)?.sessions;

  assertEquals(committedSessions?.length, 1);
  assertEquals(rolledBackUser, null);
});

Deno.test("Database.create validates table registration keys and relation targets", () => {
  const BrokenSessionModel = new Model({
    name: "BrokenSession",
    table: "broken_sessions",
    uses: [UuidPrimaryKey],
    fields: {
      userId: field.uuid().required(),
    },
    relations: {
      user: relation.belongsTo("MissingUser").foreignKey("userId"),
    },
  });

  assertThrows(
    () =>
      Database.create({
        adapter: memoryDatabaseAdapter(),
        schemaAdapter: validationAdapter,
        tables: {
          BrokenSession: BrokenSessionModel,
        },
      }),
    UnknownRelationTargetError,
  );
});

Deno.test("Database.create throws for reserved keys, name mismatches, and missing relation targets", () => {
  assertThrows(
    () =>
      Database.create({
        adapter: memoryDatabaseAdapter(),
        schemaAdapter: validationAdapter,
        tables: {
          repo: UserEntity.from(UserModel),
        },
      }),
    ReservedTableKeyError,
  );

  assertThrows(
    () =>
      Database.create({
        adapter: memoryDatabaseAdapter(),
        schemaAdapter: validationAdapter,
        tables: {
          WrongUser: UserEntity.from(UserModel),
        },
      }),
    TableRegistrationNameMismatchError,
  );
});

Deno.test("Database uses the default schema adapter configured at the database level", async () => {
  const db = createTestDatabase();

  await assertRejects(
    () =>
      db.User.create({
        email: "not-an-email",
        passwordHash: "hashed",
      }),
    Error,
    "Invalid email.",
  );
});

Deno.test("Database throws when model validation is present but no schema adapter is configured", async () => {
  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User: UserEntity.from(UserModel),
      Session: SessionModel,
    },
  });

  await assertRejects(
    () =>
      db.User.create({
        email: "ada@example.com",
        passwordHash: "hashed",
      }),
    TypeError,
    "Model create validation requires a schema adapter.",
  );
});

Deno.test("Database fails when the default schema adapter cannot parse a model schema", async () => {
  const IncompatibleModel = new Model({
    name: "Config",
    table: "configs",
    uses: [UuidPrimaryKey],
    fields: {
      key: field.string().required(),
    },
    validation: {
      create: "not-a-function-schema",
    },
  });

  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    schemaAdapter: validationAdapter,
    tables: {
      Config: IncompatibleModel,
    },
  });

  await assertRejects(
    () =>
      db.Config.create({
        key: "value",
      }),
    Error,
    "Function schema expected.",
  );
});

Deno.test("Model-level validation adapter overrides the database default adapter", async () => {
  const overrideAdapter = {
    parse<TOutput>(schema: unknown, input: unknown): TOutput {
      if (schema !== "override-schema") {
        throw new Error("Unexpected override schema.");
      }

      const typedInput = input as Record<string, unknown>;

      if (typedInput.slug !== "allowed") {
        throw new Error("Override adapter rejected slug.");
      }

      return typedInput as TOutput;
    },
  };

  const OverrideModel = new Model({
    name: "OverrideRecord",
    table: "override_records",
    uses: [UuidPrimaryKey],
    fields: {
      slug: field.string().required(),
    },
    validation: {
      create: {
        schema: "override-schema",
        adapter: overrideAdapter,
      },
    },
  });

  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    schemaAdapter: validationAdapter,
    tables: {
      OverrideRecord: OverrideModel,
    },
  });

  await assertRejects(
    () =>
      db.OverrideRecord.create({
        slug: "denied",
      }),
    Error,
    "Override adapter rejected slug.",
  );

  const created = await db.OverrideRecord.create({
    slug: "allowed",
  });

  assertEquals(created.slug, "allowed");
});


Deno.test("Database relation loader gracefully handles inherently null foreign keys", async () => {
  const OptionalModel = new Model({
    name: "OptSession",
    table: "opt_sessions",
    uses: [UuidPrimaryKey],
    fields: { userId: field.uuid().nullable() },
    relations: { user: relation.belongsTo("OptSession").foreignKey("userId") },
  });

  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    schemaAdapter: validationAdapter,
    tables: { OptSession: OptionalModel },
  });

  const sess = await db.OptSession.create({ userId: null }, { validate: false });
  const sessWithUser = await db.OptSession.findById(sess.id, { include: { user: true } });

  const loaded = sessWithUser as ({ user: unknown } | null);
  assertEquals(loaded?.user, null);
});

Deno.test("Database relation loader gracefully handles undefined foreign keys", async () => {
  const OptionalModel = new Model({
    name: "OptSession2",
    table: "opt_sessions2",
    uses: [UuidPrimaryKey],
    fields: { userId: field.uuid().nullable() },
    relations: { user: relation.belongsTo("OptSession2").foreignKey("userId") },
  });

  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    schemaAdapter: validationAdapter,
    tables: { OptSession2: OptionalModel },
  });

  const sess = await db.OptSession2.create({ }, { validate: false });
  const sessWithUser = await db.OptSession2.findById(sess.id, { include: { user: true } });

  const loaded = sessWithUser as ({ user: unknown } | null);
  assertEquals(loaded?.user, null);
});

Deno.test("Database missing branches explicitly covered", () => {
  assertThrows(
    () => {
      Database.create({
        adapter: null as unknown as DatabaseAdapter,
        schemaAdapter: null as never,
        tables: {} as TableRegistry,
      });
    },
    TypeError,
  );
});
