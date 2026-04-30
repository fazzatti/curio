import { assertEquals, assertInstanceOf } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  createDefaultEntityClass,
  Entity,
  getEntityBinding,
  hydrateEntityInstance,
  isBoundEntityClass,
} from "@/db/entity.ts";
import { field } from "@/db/field.ts";
import { Model } from "@/db/model.ts";
import { UuidPrimaryKey } from "@/db/variant.ts";

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey],
  fields: {
    email: field.string().required(),
    passwordHash: field.string().required().hidden(),
    apiToken: field.string().obfuscate(),
  },
});

class UserEntity extends Entity {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare apiToken: string;
}

const BoundUserEntity = UserEntity.from(UserModel);

describe("db entities", () => {
  it("exposes entity bindings and bound-class checks", () => {
    assertEquals(getEntityBinding(BoundUserEntity)?.model, UserModel);
    assertEquals(isBoundEntityClass(BoundUserEntity), true);
    assertEquals(isBoundEntityClass(UserEntity), false);
    assertEquals(isBoundEntityClass({}), false);
  });

  it("hydrates loaded relations and falls back to plain object serialization when unbound", () => {
    const user = hydrateEntityInstance(
      BoundUserEntity,
      {
        id: "usr_1",
        email: "ada@example.com",
        passwordHash: "hashed",
        apiToken: "secret",
      },
      {
        profile: { bio: "Hello" },
      },
    );

    assertInstanceOf(user, BoundUserEntity);
    assertEquals(
      (user as unknown as { profile: { bio: string } }).profile.bio,
      "Hello",
    );

    class PlainEntity extends Entity {
      declare custom: string;
    }

    const plain = new PlainEntity();
    plain.custom = "value";

    assertEquals(plain.toJSON(), { custom: "value" });
  });

  it("creates default entity classes that remain bound to their model", () => {
    const DefaultUserEntity = createDefaultEntityClass(UserModel);

    assertEquals(getEntityBinding(DefaultUserEntity)?.model, UserModel);
    assertEquals(isBoundEntityClass(DefaultUserEntity), true);
  });
});
