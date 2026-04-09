import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Database } from "@/db/database.ts";
import { Entity } from "@/db/entity.ts";
import { field } from "@/db/field.ts";
import { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
import { Model } from "@/db/model.ts";
import { relation } from "@/db/relation.ts";
import { UuidPrimaryKey } from "@/db/variant.ts";

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey],
  fields: {
    email: field.string().required(),
  },
  relations: {
    sessions: relation.hasMany("Session").foreignKey("userId"),
  },
});

class UserEntity extends Entity {
  declare id: string;
  declare email: string;
}

const SessionModel = new Model({
  name: "Session",
  table: "sessions",
  uses: [UuidPrimaryKey],
  fields: {
    userId: field.uuid().required(),
    token: field.string().required(),
  },
  relations: {
    user: relation.belongsTo("User").foreignKey("userId"),
  },
});

const createDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User: UserEntity.from(UserModel),
      Session: SessionModel,
    },
  });

describe("database runtime extra coverage", () => {
  it("prepares explicitly and supports nested transactions", async () => {
    const db = createDatabase();
    await db.prepare();

    const email = await db.transaction(async (tx) =>
      await tx.transaction(async (nested) => {
        const user = await nested.User.create({
          email: "ada@example.com",
        });
        return user.email;
      })
    );

    assertEquals(email, "ada@example.com");
  });

  it("ignores disabled and unknown include entries while loading relations", async () => {
    const db = createDatabase();
    const user = await db.User.create({
      email: "ada@example.com",
    });
    await db.Session.create({
      userId: user.id,
      token: "token-1",
    });

    const loadedUser = await db.User.getById(user.id, {
      include: {
        sessions: false,
        missing: true,
      } as never,
    });
    const loadedSession = await db.Session.getOne({
      where: { userId: user.id },
      include: {
        user: false,
        missing: true,
      } as never,
    });

    assertEquals(
      (loadedUser as unknown as Record<string, unknown>).sessions,
      undefined,
    );
    assertEquals(
      (loadedSession as unknown as Record<string, unknown>).user,
      undefined,
    );
  });
});
