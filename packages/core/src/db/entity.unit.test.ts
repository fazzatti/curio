import {
  assert,
  assertEquals,
  assertInstanceOf,
} from "@std/assert";
import { createDefaultEntityClass, Entity, hydrateEntityInstance } from "@/db/entity.ts";
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

  get emailDomain() {
    return this.email.split("@")[1];
  }

  hasExampleDomain() {
    return this.emailDomain === "example.com";
  }
}

const BoundUserEntity = UserEntity.from(UserModel);

const ProfileModel = new Model({
  name: "Profile",
  table: "profiles",
  uses: [UuidPrimaryKey],
  fields: {
    bio: field.text(),
  },
});

// @ts-expect-error Entity declares `email`, which ProfileModel does not provide.
UserEntity.from(ProfileModel);

Deno.test("Entity.from binds custom classes and keeps methods/getters", () => {
  const user = hydrateEntityInstance(BoundUserEntity, {
    id: "usr_1",
    email: "ada@example.com",
    passwordHash: "hashed",
    apiToken: "secret-token",
  });

  assertInstanceOf(user, BoundUserEntity);
  assertEquals(user.emailDomain, "example.com");
  assert(user.hasExampleDomain());
});

Deno.test("Entity toJSON hides hidden fields and redacts obfuscated ones", () => {
  const user = hydrateEntityInstance(BoundUserEntity, {
    id: "usr_1",
    email: "ada@example.com",
    passwordHash: "hashed",
    apiToken: "secret-token",
  });

  assertEquals(user.toJSON(), {
    id: "usr_1",
    email: "ada@example.com",
    apiToken: "<redacted>",
  });
});

Deno.test("createDefaultEntityClass hydrates plain model entities safely", () => {
  const DefaultUserEntity = createDefaultEntityClass(UserModel);
  const user = hydrateEntityInstance(DefaultUserEntity, {
    id: "usr_2",
    email: "grace@example.com",
    passwordHash: "hashed",
    apiToken: "secret-token",
  });

  assertInstanceOf(user, DefaultUserEntity);
  assertEquals(user.toJSON(), {
    id: "usr_2",
    email: "grace@example.com",
    apiToken: "<redacted>",
  });
});
