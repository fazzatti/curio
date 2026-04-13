import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Admin } from "@/admin/core/admin.tsx";
import type {
  AdminActorContext,
  AdminUserRecord,
} from "@/admin/modules/types.ts";
import {
  Permission,
  Role,
  RolePermission,
  Session,
  UserRole,
} from "@/admin/models.ts";
import { resolveAdminConfiguration } from "@/admin/config/presets.ts";
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
    userRoles: relation.hasMany("UserRole").foreignKey("userId"),
  },
});

class UserEntity extends Entity {
  declare id: string;
  declare email: string;
}

const User = UserEntity.from(UserModel);

const createPresetTestDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User,
      Role,
      Permission,
      UserRole,
      RolePermission,
      Session,
    },
  });

const createActor = (): AdminActorContext => ({
  user: {
    id: "actor",
    email: "admin@example.com",
    passwordHash: "hash",
  } as AdminUserRecord,
  roles: [],
  permissions: [],
  session: {} as never,
  permissionKeys: new Set(["widgets:people"]),
  bypass: false,
});

describe("admin runtime presets", () => {
  it("accept custom preset objects and merge their resources and widgets", async () => {
    const db = createPresetTestDatabase();
    const admin = Admin.create({
      db,
      presets: [
        Admin.preset({
          name: "custom",
          resources: {
            users: Admin.resource(User, {
              path: "people",
              label: "People",
            }),
          },
          flows: {
            setup: Admin.flow({
              path: "setup",
              label: "Setup",
              render: () => "setup",
            }),
          },
          widgets: {
            people: Admin.widget({
              key: "people",
              title: "People",
              render: ({ title }) => title,
            }),
          },
        }),
      ],
    });

    assertEquals(admin.findResource("people")?.slug, "people");
    assertEquals(admin.findFlow("setup")?.slug, "setup");
    assertEquals(
      (await admin.getDashboardWidgets(
        createActor(),
        {
          params: {},
          request: {
            url: new URL("http://localhost/admin"),
            headers: new Headers(),
            body: {
              type: () => "form",
              form: () => Promise.resolve(new URLSearchParams()),
              formData: () => Promise.resolve(new FormData()),
            },
            ip: "127.0.0.1",
          },
          response: {
            status: 200,
            headers: new Headers(),
            body: null,
          },
          cookies: {
            get: () => Promise.resolve(undefined),
            set: () => Promise.resolve(undefined),
            delete: () => Promise.resolve(undefined),
          },
        },
      )).length,
      1,
    );
  });

  it("resolves the built-in default preset with namespaced resource links", () => {
    const db = createPresetTestDatabase();
    const configuration = resolveAdminConfiguration({
      db,
      basePath: "/console",
      presets: ["default"],
    });

    assertEquals(Object.keys(configuration.resources).sort(), [
      "permissions",
      "roles",
      "sessions",
      "users",
    ]);
    assertEquals(Object.keys(configuration.widgets).sort(), [
      "permissions",
      "roles",
      "sessions",
      "users",
    ]);
    assertEquals(configuration.widgets.users?.href, "/console/resources/users");
    assertEquals(configuration.seeders.length, 1);
  });

  it("merges preset field widgets, components, and unnamed preset seeders", async () => {
    const db = createPresetTestDatabase();
    const seeded: string[] = [];
    const configuration = resolveAdminConfiguration({
      db,
      presets: [
        Admin.preset({
          fieldWidgets: {
            email: {
              list: () => "email-widget",
            },
          },
          components: {
            Shell: (() => null) as never,
          },
          seed: () => {
            seeded.push("preset");
            return Promise.resolve();
          },
        }),
      ],
      fieldWidgets: {
        "kind:string": {
          detail: () => "kind-widget",
        },
      },
      components: {
        LoginPage: (() => null) as never,
      },
    });

    assertEquals(typeof configuration.fieldWidgets.email?.list, "function");
    assertEquals(
      typeof configuration.fieldWidgets["kind:string"]?.detail,
      "function",
    );
    assertEquals(typeof configuration.components.Shell, "function");
    assertEquals(typeof configuration.components.LoginPage, "function");
    await configuration.seeders[0]?.({ db });
    assertEquals(seeded, ["preset"]);
  });

  it("reject conflicting registrations from presets and create input", () => {
    const db = createPresetTestDatabase();

    assertThrows(
      () =>
        Admin.create({
          db,
          presets: [
            Admin.preset({
              name: "preset-a",
              resources: {
                users: Admin.resource(User, {
                  path: "users",
                  label: "Users",
                }),
              },
            }),
          ],
          resources: {
            users: Admin.resource(User, {
              path: "users-again",
              label: "Users Again",
            }),
          },
        }),
      Error,
      'Conflicting admin resource registration "users"',
    );
  });

  it("reject conflicting normalized paths for resources", () => {
    const db = createPresetTestDatabase();

    assertThrows(
      () =>
        Admin.create({
          db,
          resources: {
            users: Admin.resource(User, {
              path: "shared",
              label: "Users",
            }),
            usersDuplicate: Admin.resource(User, {
              path: "shared",
              label: "Users Duplicate",
            }),
          },
        }),
      Error,
      'Conflicting admin resource path "shared".',
    );
  });

  it("falls back to the registration key when a resource path is omitted", () => {
    const db = createPresetTestDatabase();
    const admin = Admin.create({
      db,
      resources: {
        users: Admin.resource(User, {
          label: "Users",
        }),
      },
    });

    assertEquals(admin.findResource("users")?.slug, "users");
  });

  it("rejects conflicting normalized paths for views, flows, and widgets", () => {
    const db = createPresetTestDatabase();

    assertThrows(
      () =>
        Admin.create({
          db,
          flows: {
            setup: Admin.flow({
              path: "shared",
              label: "Setup",
              render: () => "one",
            }),
            rotate: Admin.flow({
              path: "shared",
              label: "Rotate",
              render: () => "two",
            }),
          },
        }),
      Error,
      'Conflicting admin flow path "shared".',
    );

    assertThrows(
      () =>
        Admin.create({
          db,
          views: {
            operations: Admin.view({
              path: "shared",
              label: "Operations",
              render: () => "one",
            }),
            reports: Admin.view({
              path: "shared",
              label: "Reports",
              render: () => "two",
            }),
          },
        }),
      Error,
      'Conflicting admin view path "shared".',
    );

    assertThrows(
      () =>
        Admin.create({
          db,
          widgets: {
            one: Admin.widget({
              key: "shared",
              title: "One",
              render: () => "one",
            }),
            two: Admin.widget({
              key: "shared",
              title: "Two",
              render: () => "two",
            }),
          },
        }),
      Error,
      'Conflicting admin widget path "shared".',
    );
  });
});
