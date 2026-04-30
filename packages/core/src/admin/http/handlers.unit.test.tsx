/** @jsxImportSource preact */

import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Application } from "@oak/oak";
import { hashPassword } from "@/auth/password.ts";
import { Admin } from "@/admin/core/admin.tsx";
import {
  handleCreate,
  handleDashboard,
  handleDeleteForm,
  handleDetail,
  handleList,
  handleLoginPage,
  handleLoginSubmit,
  handleLogout,
  handleResetPassword,
  handleResetPasswordForm,
  handleUpdate,
} from "@/admin/http/handlers.tsx";
import type { OakRouterContext } from "@/admin/core/types.ts";
import {
  AuditEvent,
  Permission,
  Role,
  RolePermission,
  Session,
  UserRole,
} from "@/admin/models.ts";
import { DEFAULT_ROLE_KEYS, syncUserRoles } from "@/admin/modules.ts";
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

const createMountedAdmin = () => {
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
    presets: ["default"],
    views: {
      static: Admin.view({
        path: "static",
        label: "Static",
        render: () => <div>Static view</div>,
      }),
    },
    flows: {
      setup: Admin.flow({
        path: "setup",
        label: "Setup",
        description: "Run the setup flow.",
        render: ({ action, error, form }) => (
          <form action={action} method="post">
            {error ? <div>{error}</div> : null}
            <input
              name="confirm"
              value={typeof form?.get === "function"
                ? String(form.get("confirm") ?? "")
                : ""}
            />
            <button type="submit">Run setup</button>
          </form>
        ),
        submit: ({ form }) => {
          const confirm = "get" in form ? form.get("confirm") : null;

          if (String(confirm ?? "") !== "yes") {
            throw new Error("Confirm setup.");
          }

          return Promise.resolve({
            flash: {
              tone: "success",
              message: "Setup complete.",
            },
          });
        },
      }),
    },
  });

  const app = new Application();
  admin.mount(app);

  return { db, admin, app };
};

const requestAdmin = async (
  app: Application,
  path: string,
  init?: RequestInit,
) => {
  const response = await app.handle(
    new Request(`http://localhost${path}`, init),
  );
  assertExists(response);
  return response;
};

const createFormBody = (
  values: Record<string, string | Array<string>>,
): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }

      continue;
    }

    params.set(key, value);
  }

  return params.toString();
};

const getSessionCookie = (response: Response): string => {
  const setCookieHeader = response.headers.get("set-cookie");
  assertExists(setCookieHeader);
  return setCookieHeader.split(";")[0] ?? "";
};

const createDirectContext = (
  params: Record<string, string>,
  formValues: Record<string, string> = {},
): OakRouterContext => ({
  params,
  request: {
    url: new URL("http://localhost/admin"),
    headers: new Headers(),
    body: {
      type: () => "form",
      form: () => Promise.resolve(new URLSearchParams(formValues)),
      formData: () => {
        const data = new FormData();

        for (const [key, value] of Object.entries(formValues)) {
          data.set(key, value);
        }

        return Promise.resolve(data);
      },
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
});

const createAdminUser = async (
  db: ReturnType<typeof createMountedAdmin>["db"],
  roleKey: string,
) => {
  const user = await db.User.create({
    email: `${roleKey}@example.com`,
    passwordHash: await hashPassword("s3cret"),
  });
  const role = await db.Role.getOne({
    where: { key: roleKey },
  });
  await syncUserRoles(db, user.id, [role.id]);
  return user;
};

describe("admin runtime handlers", () => {
  it("redirects authenticated login pages and unauthenticated protected routes", async () => {
    const { db, admin, app } = createMountedAdmin();
    await admin.prepareData();
    await createAdminUser(db, DEFAULT_ROLE_KEYS.superadmin);

    const loginResponse = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: "superadmin@example.com",
        password: "s3cret",
      }),
    });
    const sessionCookie = getSessionCookie(loginResponse);

    const authenticatedLoginPage = await requestAdmin(app, "/admin/login", {
      headers: { cookie: sessionCookie },
    });
    assertEquals(authenticatedLoginPage.status, 303);
    assertEquals(authenticatedLoginPage.headers.get("location"), "/admin");

    for (
      const [path, method] of [
        ["/admin", "GET"],
        ["/admin/resources/users", "GET"],
        ["/admin/resources/users/user-1/edit", "GET"],
        ["/admin/resources/users/user-1/delete", "POST"],
        ["/admin/views/static", "GET"],
        ["/admin/flows/setup", "GET"],
        ["/admin/flows/setup", "POST"],
      ] as const
    ) {
      const response = await requestAdmin(app, path, {
        method,
        headers: method === "POST"
          ? { "content-type": "application/x-www-form-urlencoded" }
          : undefined,
        body: method === "POST"
          ? createFormBody({ confirmDelete: "true" })
          : undefined,
      });

      assertEquals(response.status, 303);
      assertEquals(response.headers.get("location"), "/admin/login");
    }
  });

  it("renders missing-resource branches across resource routes", async () => {
    const { db, admin, app } = createMountedAdmin();
    await admin.prepareData();
    await createAdminUser(db, DEFAULT_ROLE_KEYS.superadmin);

    const loginResponse = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: "superadmin@example.com",
        password: "s3cret",
      }),
    });
    const sessionCookie = getSessionCookie(loginResponse);

    for (
      const [path, method] of [
        ["/admin/resources/missing", "GET"],
        ["/admin/resources/missing/new", "GET"],
        ["/admin/resources/missing/new", "POST"],
        ["/admin/resources/missing/id", "GET"],
        ["/admin/resources/missing/id/edit", "GET"],
        ["/admin/resources/missing/id/edit", "POST"],
        ["/admin/resources/missing/id/delete", "GET"],
        ["/admin/resources/missing/id/delete", "POST"],
        ["/admin/resources/missing/id/reset-password", "GET"],
        ["/admin/resources/missing/id/reset-password", "POST"],
      ] as const
    ) {
      const response = await requestAdmin(app, path, {
        method,
        headers: {
          cookie: sessionCookie,
          ...(method === "POST"
            ? { "content-type": "application/x-www-form-urlencoded" }
            : {}),
        },
        body: method === "POST"
          ? createFormBody({ email: "ada@example.com" })
          : undefined,
      });

      assertEquals(response.status, 404);
      assertStringIncludes(await response.text(), "Admin resource not found.");
    }
  });

  it("renders login failure redirects, login pages, logout, dashboard, and list pages", async () => {
    const { db, admin, app } = createMountedAdmin();
    await admin.prepareData();
    const superadmin = await createAdminUser(db, DEFAULT_ROLE_KEYS.superadmin);

    const failedLoginWithEmail = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: "superadmin@example.com",
        password: "wrong",
      }),
    });
    assertEquals(failedLoginWithEmail.status, 303);
    assertStringIncludes(
      failedLoginWithEmail.headers.get("location") ?? "",
      "/admin/login?error=Invalid+credentials+or+missing+admin+access.&email=superadmin%40example.com",
    );

    const failedLoginWithoutEmail = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: "",
        password: "wrong",
      }),
    });
    assertEquals(failedLoginWithoutEmail.status, 303);
    assertEquals(
      failedLoginWithoutEmail.headers.get("location"),
      "/admin/login?error=Invalid+credentials+or+missing+admin+access.",
    );

    const loginPageResponse = await requestAdmin(
      app,
      "/admin/login?error=Denied&email=ada%40example.com",
    );
    assertEquals(loginPageResponse.status, 200);
    const loginPageHtml = await loginPageResponse.text();
    assertStringIncludes(loginPageHtml, "Denied");
    assertStringIncludes(loginPageHtml, 'value="ada@example.com"');

    const successLogin = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: superadmin.email,
        password: "s3cret",
      }),
    });
    const sessionCookie = getSessionCookie(successLogin);

    const dashboardResponse = await requestAdmin(app, "/admin", {
      headers: { cookie: sessionCookie },
    });
    assertEquals(dashboardResponse.status, 200);
    assertStringIncludes(await dashboardResponse.text(), "Control room");

    const listResponse = await requestAdmin(app, "/admin/resources/users", {
      headers: { cookie: sessionCookie },
    });
    assertEquals(listResponse.status, 200);
    assertStringIncludes(await listResponse.text(), "Users");

    const logoutResponse = await requestAdmin(app, "/admin/logout", {
      method: "POST",
      headers: {
        cookie: sessionCookie,
      },
    });
    assertEquals(logoutResponse.status, 303);
    assertEquals(logoutResponse.headers.get("location"), "/admin/login");
  });

  it("renders validation and missing-record branches for create, update, reset, delete, and static views", async () => {
    const { db, admin, app } = createMountedAdmin();
    await admin.prepareData();
    await createAdminUser(db, DEFAULT_ROLE_KEYS.superadmin);

    const user = await db.User.create({
      email: "ada@example.com",
      passwordHash: await hashPassword("s3cret"),
    });

    const loginResponse = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: "superadmin@example.com",
        password: "s3cret",
      }),
    });
    const sessionCookie = getSessionCookie(loginResponse);

    const createErrorResponse = await requestAdmin(
      app,
      "/admin/resources/users/new",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: sessionCookie,
        },
        body: createFormBody({
          email: "",
          password: "",
        }),
      },
    );
    assertEquals(createErrorResponse.status, 200);
    assertStringIncludes(
      await createErrorResponse.text(),
      "Email and password are required.",
    );

    const updateErrorResponse = await requestAdmin(
      app,
      `/admin/resources/users/${user.id}/edit`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: sessionCookie,
        },
        body: createFormBody({
          email: "",
        }),
      },
    );
    assertEquals(updateErrorResponse.status, 200);
    assertStringIncludes(
      await updateErrorResponse.text(),
      "Email is required.",
    );

    const detailResponse = await requestAdmin(
      app,
      `/admin/resources/users/${user.id}`,
      {
        headers: { cookie: sessionCookie },
      },
    );
    assertEquals(detailResponse.status, 200);
    const detailHtml = await detailResponse.text();
    assertStringIncludes(detailHtml, ">User</h1>");
    assertStringIncludes(detailHtml, "ada@example.com");

    const missingEditResponse = await requestAdmin(
      app,
      "/admin/resources/users/missing/edit",
      {
        headers: { cookie: sessionCookie },
      },
    );
    assertEquals(missingEditResponse.status, 404);
    assertStringIncludes(
      await missingEditResponse.text(),
      "This record could not be found.",
    );

    const missingUpdateResponse = await requestAdmin(
      app,
      "/admin/resources/users/missing/edit",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: sessionCookie,
        },
        body: createFormBody({
          email: "next@example.com",
        }),
      },
    );
    assertEquals(missingUpdateResponse.status, 404);
    assertStringIncludes(
      await missingUpdateResponse.text(),
      "This record could not be found.",
    );

    const missingResetFormResponse = await requestAdmin(
      app,
      "/admin/resources/users/missing/reset-password",
      {
        headers: { cookie: sessionCookie },
      },
    );
    assertEquals(missingResetFormResponse.status, 404);

    const resetMismatchResponse = await requestAdmin(
      app,
      `/admin/resources/users/${user.id}/reset-password`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: sessionCookie,
        },
        body: createFormBody({
          password: "first",
          passwordConfirmation: "second",
        }),
      },
    );
    assertEquals(resetMismatchResponse.status, 200);
    assertStringIncludes(
      await resetMismatchResponse.text(),
      "Save new password",
    );

    const missingDeleteFormResponse = await requestAdmin(
      app,
      "/admin/resources/users/missing/delete",
      {
        headers: { cookie: sessionCookie },
      },
    );
    assertEquals(missingDeleteFormResponse.status, 404);

    const staticViewResponse = await requestAdmin(app, "/admin/views/static", {
      headers: { cookie: sessionCookie },
    });
    assertEquals(staticViewResponse.status, 200);
    assertStringIncludes(await staticViewResponse.text(), "Static view");

    const flowResponse = await requestAdmin(app, "/admin/flows/setup", {
      headers: { cookie: sessionCookie },
    });
    assertEquals(flowResponse.status, 200);
    assertStringIncludes(await flowResponse.text(), "Run setup");

    const invalidFlowSubmit = await requestAdmin(app, "/admin/flows/setup", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({
        confirm: "no",
      }),
    });
    assertEquals(invalidFlowSubmit.status, 200);
    const invalidFlowHtml = await invalidFlowSubmit.text();
    assertStringIncludes(invalidFlowHtml, "Confirm setup.");
    assertEquals(
      invalidFlowHtml.includes('data-curio-admin-flash" data-tone="error"'),
      false,
    );

    const validFlowSubmit = await requestAdmin(app, "/admin/flows/setup", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({
        confirm: "yes",
      }),
    });
    assertEquals(validFlowSubmit.status, 303);
    assertEquals(
      validFlowSubmit.headers.get("location"),
      "/admin/flows/setup?flash=Setup+complete.&tone=success",
    );
  });

  it("renders forbidden branches for read-only resource actions", async () => {
    const { db, admin, app } = createMountedAdmin();
    await admin.prepareData();
    await createAdminUser(db, DEFAULT_ROLE_KEYS.superadmin);

    const loginResponse = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: "superadmin@example.com",
        password: "s3cret",
      }),
    });
    const sessionCookie = getSessionCookie(loginResponse);

    for (
      const [path, method] of [
        ["/admin/resources/sessions/new", "GET"],
        ["/admin/resources/sessions/new", "POST"],
        ["/admin/resources/sessions/missing/edit", "GET"],
        ["/admin/resources/sessions/missing/edit", "POST"],
        ["/admin/resources/sessions/missing/delete", "GET"],
        ["/admin/resources/sessions/missing/delete", "POST"],
      ] as const
    ) {
      const response = await requestAdmin(app, path, {
        method,
        headers: {
          cookie: sessionCookie,
          ...(method === "POST"
            ? { "content-type": "application/x-www-form-urlencoded" }
            : {}),
        },
        body: method === "POST"
          ? createFormBody({ confirmDelete: "true" })
          : undefined,
      });

      assertEquals(response.status, 403);
      assertStringIncludes(
        await response.text(),
        "You do not have permission to access this page.",
      );
    }
  });

  it("returns early when protected handlers cannot resolve an actor", async () => {
    const { admin } = createMountedAdmin();
    const resource = admin.findResource("users");
    assert(resource);

    const runtime = {
      ...admin,
      findResource: () => resource,
      getActorOrRedirect: () => Promise.resolve(null),
    };

    await handleDetail(
      runtime as unknown as Parameters<typeof handleDetail>[0],
      createDirectContext({ resource: "users", id: "user-1" }),
    );
    await handleCreate(
      runtime as unknown as Parameters<typeof handleCreate>[0],
      createDirectContext({ resource: "users" }, { email: "ada@example.com" }),
    );
    await handleUpdate(
      runtime as unknown as Parameters<typeof handleUpdate>[0],
      createDirectContext(
        { resource: "users", id: "user-1" },
        { email: "ada@example.com" },
      ),
    );
    await handleDeleteForm(
      runtime as unknown as Parameters<typeof handleDeleteForm>[0],
      createDirectContext({ resource: "users", id: "user-1" }),
    );
    await handleResetPasswordForm(
      runtime as unknown as Parameters<typeof handleResetPasswordForm>[0],
      createDirectContext({ resource: "users", id: "user-1" }),
    );
    await handleResetPassword(
      runtime as unknown as Parameters<typeof handleResetPassword>[0],
      createDirectContext(
        { resource: "users", id: "user-1" },
        { password: "next", passwordConfirmation: "next" },
      ),
    );
  });

  it("forbids password resets when the users resource disables the action", async () => {
    const { admin } = createMountedAdmin();
    const usersResource = admin.findResource("users");
    assert(usersResource);

    const disabledResource = {
      ...usersResource,
      actions: {
        ...usersResource.actions,
        reset_password: false,
      },
    };
    const actor = {
      user: {
        id: "actor",
        email: "admin@example.com",
        passwordHash: "hash",
      },
      roles: [],
      permissions: [],
      session: {} as never,
      permissionKeys: new Set(["users:reset_password"]),
      bypass: false,
    };
    let forbiddenCalls = 0;
    const runtime = {
      ...admin,
      findResource: () => disabledResource,
      getActorOrRedirect: () => Promise.resolve(actor),
      renderForbidden() {
        forbiddenCalls += 1;
      },
    };

    await handleResetPassword(
      runtime as unknown as Parameters<typeof handleResetPassword>[0],
      createDirectContext(
        { resource: "users", id: "user-1" },
        { password: "next", passwordConfirmation: "next" },
      ),
    );

    assertEquals(forbiddenCalls, 1);
  });

  it("renders login, logout, dashboard, and list handlers directly", async () => {
    const { db, admin } = createMountedAdmin();
    await admin.prepareData();
    const superadmin = await createAdminUser(db, DEFAULT_ROLE_KEYS.superadmin);

    const loginContext = createDirectContext({});
    loginContext.request.url = new URL(
      "http://localhost/admin/login?error=Denied&email=ada%40example.com",
    );
    await handleLoginPage(admin as never, loginContext);
    assertStringIncludes(String(loginContext.response.body), "Denied");

    const submitContext = createDirectContext({}, {
      email: superadmin.email,
      password: "wrong",
    });
    await handleLoginSubmit(admin as never, submitContext);
    assertEquals(submitContext.response.status, 303);

    const deletedCookies: string[] = [];
    const logoutContext = createDirectContext({});
    logoutContext.cookies = {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(undefined),
      delete: (name) => {
        deletedCookies.push(name);
        return Promise.resolve();
      },
    };
    await handleLogout(admin as never, logoutContext);
    assertEquals(deletedCookies.length, 1);

    const actor = {
      user: {
        id: superadmin.id,
        email: superadmin.email,
        passwordHash: superadmin.passwordHash,
      },
      roles: [],
      permissions: [],
      session: {} as never,
      permissionKeys: new Set(["users:list", "widgets:users"]),
      bypass: true,
    };
    const runtime = admin as typeof admin & {
      getActorOrRedirect: typeof admin.getActorOrRedirect;
    };
    runtime.getActorOrRedirect = () => Promise.resolve(actor as never);

    const dashboardContext = createDirectContext({});
    await handleDashboard(runtime as never, dashboardContext);
    assertStringIncludes(
      String(dashboardContext.response.body),
      "Control room",
    );

    const listContext = createDirectContext({ resource: "users" });
    await handleList(runtime as never, listContext);
    assertStringIncludes(String(listContext.response.body), "Users");
  });

  it("resets passwords and revokes the target user's active sessions", async () => {
    const { db, admin, app } = createMountedAdmin();
    await admin.prepareData();
    await createAdminUser(db, DEFAULT_ROLE_KEYS.superadmin);

    const user = await db.User.create({
      email: "ada@example.com",
      passwordHash: await hashPassword("old-password"),
    });
    const session = await db.Session.create({
      userId: user.id,
      tokenHash: "target-session",
      ipAddress: "127.0.0.1",
      userAgent: "Unit Test",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const loginResponse = await requestAdmin(app, "/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: createFormBody({
        email: "superadmin@example.com",
        password: "s3cret",
      }),
    });
    const sessionCookie = getSessionCookie(loginResponse);

    const response = await requestAdmin(
      app,
      `/admin/resources/users/${user.id}/reset-password`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: sessionCookie,
        },
        body: createFormBody({
          password: "new-password",
          passwordConfirmation: "new-password",
        }),
      },
    );

    assertEquals(response.status, 303);
    assertEquals(await db.Session.findById(session.id), null);
  });
});
