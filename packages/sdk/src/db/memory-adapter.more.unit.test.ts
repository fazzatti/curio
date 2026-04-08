import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Database } from "@/db/database.ts";
import { field } from "@/db/field.ts";
import { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
import { Model } from "@/db/model.ts";
import { UuidPrimaryKey } from "@/db/variant.ts";

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey],
  fields: {
    email: field.string().required().unique(),
    displayName: field.string().required(),
  },
});

const createDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User: UserModel,
    },
  });

describe("memory adapter extra coverage", () => {
  it("skips uniqueness checks for fields omitted from partial updates", async () => {
    const db = createDatabase();
    const user = await db.User.create({
      email: "ada@example.com",
      displayName: "Ada",
    });

    const updated = await db.User.updateById(user.id, {
      displayName: "Ada Lovelace",
    });

    assertEquals(updated?.email, "ada@example.com");
    assertEquals(updated?.displayName, "Ada Lovelace");
  });
});
