/** @jsxImportSource preact */

import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Application } from "@oak/oak";
import { Admin } from "@/admin/core/admin.tsx";
import type {
  AdminActorContext,
  AdminUserRecord,
} from "@/admin/modules/types.ts";
import {
  AuditEvent,
  Permission,
  Role,
  RolePermission,
  Session,
  UserRole,
} from "@/admin/models.ts";
import { Database } from "@/db/database.ts";
import { Entity } from "@/db/entity.ts";
import { field } from "@/db/field.ts";
import { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
import { Model } from "@/db/model.ts";
import { relation } from "@/db/relation.ts";
import { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    email: field.string().required().unique(),
    passwordHash: field.string().required().hidden(),
  },
  relations: {
    userRoles: relation.hasMany("UserRole").foreignKey("userId"),
    sessions: relation.hasMany("Session").foreignKey("userId"),
    auditEvents: relation.hasMany("AuditEvent").foreignKey("actorUserId"),
  },
});

class UserEntity extends Entity {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const User = UserEntity.from(UserModel);

const createAdminRuntime = () => {
  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User,
      Role,
      Permission,
      UserRole,
      RolePermission,
      Session,
      AuditEvent,
    },
  });

  const admin = Admin.create({
    db,
    resources: {
      users: Admin.resource(User, {
        path: "users",
        label: "Users",
      }),
    },
    views: {
      static: Admin.view({
        path: "static",
        label: "Static",
        nav: { visible: false },
        render: () => <div>Static view</div>,
      }),
    },
    flows: {
      setup: Admin.flow({
        path: "setup",
        label: "Setup",
        nav: { visible: false },
        render: ({ action }) => (
          <form action={action} method="post">Setup flow</form>
        ),
      }),
    },
    widgets: {
      simple: Admin.widget({
        key: "simple",
        title: "Simple",
        render: ({ title }) => <div>{title}</div>,
      }),
    },
  });

  return { db, admin };
};

const createActor = (permissionKeys: string[]): AdminActorContext => ({
  user: {
    id: "actor",
    email: "admin@example.com",
    passwordHash: "hash",
  } as AdminUserRecord,
  roles: [],
  permissions: [],
  session: {} as never,
  permissionKeys: new Set(permissionKeys),
  bypass: false,
});

const createContext = () => ({
  params: {},
  request: {
    url: new URL("http://localhost/admin"),
    headers: new Headers(),
    body: {
      type: () => "form",
      form: async () => new URLSearchParams(),
      formData: async () => new FormData(),
    },
    ip: "127.0.0.1",
  },
  response: {
    status: 200,
    headers: new Headers(),
    body: null,
  },
  cookies: {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
  },
});

describe("admin runtime core helpers", () => {
  it("exposes preset and static lookup helpers", () => {
    const preset = Admin.preset({
      resources: {},
      views: {},
      flows: {},
      widgets: {},
    });
    const { admin } = createAdminRuntime();

    assertEquals(preset.resources, {});
    assertEquals(admin.findResource(), undefined);
    assertEquals(admin.findView(), undefined);
    assertEquals(admin.findFlow(), undefined);
    assertEquals(admin.getDashboardPath(), "/admin");
    assertEquals(admin.getLoginPath(), "/admin/login");
    assertEquals(admin.getLogoutPath(), "/admin/logout");
    assertEquals(admin.getResourcePath("users"), "/admin/resources/users");
    assertEquals(
      admin.getResourceCreatePath("users"),
      "/admin/resources/users/new",
    );
    assertEquals(
      admin.getResourceDetailPath("users", "1"),
      "/admin/resources/users/1",
    );
    assertEquals(
      admin.getResourceEditPath("users", "1"),
      "/admin/resources/users/1/edit",
    );
    assertEquals(
      admin.getResourceDeletePath("users", "1"),
      "/admin/resources/users/1/delete",
    );
    assertEquals(
      admin.getResourceResetPasswordPath("users", "1"),
      "/admin/resources/users/1/reset-password",
    );
    assertEquals(admin.getViewPath("static"), "/admin/views/static");
    assertEquals(admin.getFlowPath("setup"), "/admin/flows/setup");
  });

  it("serves bundled assets and counts records/widgets", async () => {
    const { db, admin } = createAdminRuntime();
    await db.User.create({
      email: "ada@example.com",
      passwordHash: "hash",
    });

    const users = admin.findResource("users");
    assert(users);
    assertEquals(await admin.countResourceRecords(users), 1);

    const widgets = await admin.getDashboardWidgets(
      createActor(["widgets:simple"]),
      createContext(),
    );
    assertEquals(widgets.length, 1);
    assertEquals(widgets[0]?.data, undefined);

    const app = new Application();
    admin.mount(app);

    const cssResponse = await app.handle(
      new Request("http://localhost/admin/assets/admin.css"),
    );
    assertExists(cssResponse);
    assertEquals(cssResponse.status, 200);
    assertStringIncludes(await cssResponse.text(), "[data-curio-admin-shell]");

    const jsResponse = await app.handle(
      new Request("http://localhost/admin/assets/admin.js"),
    );
    assertExists(jsResponse);
    assertEquals(jsResponse.status, 200);
    assertStringIncludes(await jsResponse.text(), "data-curio-password-toggle");
  });

  it("redirects unauthenticated actor checks to the login page", async () => {
    const { admin } = createAdminRuntime();
    const ctx = createContext();

    const actor = await admin.getActorOrRedirect(ctx);

    assertEquals(actor, null);
    assertEquals(ctx.response.status, 303);
    assertEquals(ctx.response.headers.get("location"), "/admin/login");
  });
});
