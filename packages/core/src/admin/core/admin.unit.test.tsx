/** @jsxImportSource preact */

import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import { Application } from "@oak/oak";
import type { ComponentChildren } from "preact";
import { hashPassword } from "@/auth/password.ts";
import type { AdminNavGroup, AdminNavItem } from "@/admin/components/types.ts";
import { Admin } from "@/admin/core/admin.tsx";
import {
  AuditEvent,
  Permission,
  Role,
  RolePermission,
  Session,
  UserRole,
} from "@/admin/models.ts";
import {
  authenticateAdminUser,
  DEFAULT_ROLE_KEYS,
  hasAdminPermission,
  loadUserRoles,
  resolveAdminSessionSettings,
  syncUserRoles,
} from "@/admin/modules.ts";
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

const createAdminTestDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User: UserEntity.from(UserModel),
      Role,
      Permission,
      UserRole,
      RolePermission,
      Session,
      AuditEvent,
    },
  });

const TransactionsView = (
  { data }: { data: { pending: number }; actor: unknown },
) => {
  return <div>Pending: {data.pending}</div>;
};

const ConfigureChannelsFlow = (
  { data, action }: {
    data: { configured: boolean };
    actor: unknown;
    action: string;
  },
) => {
  return (
    <form action={action} method="post">
      <div>Configured: {String(data.configured)}</div>
      <button type="submit">Run</button>
    </form>
  );
};

const TransactionsWidget = (
  { data }: {
    data: { pending: number };
    actor: unknown;
    title: string;
    href?: string;
    size: "sm" | "md" | "lg" | "full";
  },
) => {
  return <div>Pending: {data.pending}</div>;
};

const createRuntimeAdmin = () => {
  const db = createAdminTestDatabase();

  return {
    db,
    admin: Admin.create({
      db,
      presets: ["default"],
      branding: {
        name: "Runtime Admin",
        tagline: "Operator deck.",
      },
      views: {
        transactions: Admin.view({
          path: "transactions",
          label: "Transaction Queue",
          description: "Live transaction queue state.",
          nav: {
            group: "Transactions",
            groupOrder: 10,
            order: 5,
          },
          live: { mode: "poll", intervalMs: 5000 },
          render: TransactionsView,
          load: () => ({
            pending: 3,
          }),
        }),
      },
      flows: {
        configureChannels: Admin.flow({
          path: "configure-channels",
          label: "Configure Channels",
          description: "Provision channel account operations.",
          nav: {
            group: "Operations",
            groupOrder: 20,
            order: 10,
          },
          render: ConfigureChannelsFlow,
          load: () => ({
            configured: false,
          }),
          submit: () =>
            Promise.resolve({
              redirectTo: "/admin/flows/configure-channels",
              flash: {
                tone: "success",
                message: "Channels configured.",
              },
            }),
        }),
      },
      widgets: {
        transactions: Admin.widget({
          key: "transactions",
          title: "Transaction Queue",
          size: "lg",
          href: "/admin/views/transactions",
          live: { mode: "poll", intervalMs: 5000 },
          render: TransactionsWidget,
          load: () => ({
            pending: 3,
          }),
        }),
      },
    }),
  };
};

const createMountedAdmin = () => {
  const runtime = createRuntimeAdmin();
  const app = new Application();
  runtime.admin.mount(app);

  return {
    ...runtime,
    app,
  };
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

const createAdminUser = async (
  db: ReturnType<typeof createAdminTestDatabase>,
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

  return { user, role };
};

const createOakContext = (
  path = "/admin/resources/users/missing",
): Parameters<typeof Admin.create>[0] extends never ? never : {
  params: Record<string, string>;
  request: {
    url: URL;
    headers: Headers;
    body: {
      type: () => string;
      form: () => Promise<URLSearchParams>;
      formData: () => Promise<FormData>;
    };
    ip: string;
  };
  response: {
    status: number;
    headers: Headers;
    body: unknown;
  };
  cookies: {
    get: () => Promise<string | undefined>;
    set: () => Promise<void>;
    delete: () => Promise<void>;
  };
} => ({
  params: {},
  request: {
    url: new URL(`http://localhost${path}`),
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
});

Deno.test("Admin.create seeds custom flow, view, and widget permissions without auto-granting them", async () => {
  const { db, admin } = createRuntimeAdmin();

  await admin.prepareData();

  const permissions = await db.Permission.findMany({
    orderBy: [{ key: "asc" }],
  });
  const transactionsViewPermission = permissions.find((permission) =>
    permission.key === "views:transactions"
  );
  const configureChannelsFlowPermission = permissions.find((permission) =>
    permission.key === "flows:configure-channels"
  );
  const transactionsWidgetPermission = permissions.find((permission) =>
    permission.key === "widgets:transactions"
  );

  assert(transactionsViewPermission);
  assertEquals(transactionsViewPermission.label, "Access Transaction Queue");
  assertEquals(
    transactionsViewPermission.description,
    "Open the Transaction Queue view in the admin.",
  );

  assert(transactionsWidgetPermission);
  assertEquals(transactionsWidgetPermission.label, "Access Transaction Queue");
  assertEquals(
    transactionsWidgetPermission.description,
    "View the Transaction Queue widget on the admin dashboard.",
  );

  assert(configureChannelsFlowPermission);
  assertEquals(
    configureChannelsFlowPermission.label,
    "Access Configure Channels",
  );
  assertEquals(
    configureChannelsFlowPermission.description,
    "Access the Configure Channels flow in the admin.",
  );

  const adminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.admin },
  });
  const roleAssignments = await db.RolePermission.findMany({
    where: { roleId: adminRole.id },
  });
  const grantedPermissionIds = roleAssignments.map((assignment) =>
    assignment.permissionId
  );
  const grantedPermissions = grantedPermissionIds.length > 0
    ? await db.Permission.findMany({
      where: {
        id: { in: grantedPermissionIds },
      },
      orderBy: [{ key: "asc" }],
    })
    : [];

  assert(
    !grantedPermissions.some((permission) =>
      permission.key === "flows:configure-channels"
    ),
  );
  assert(
    !grantedPermissions.some((permission) =>
      permission.key === "views:transactions"
    ),
  );
  assert(
    !grantedPermissions.some((permission) =>
      permission.key === "widgets:transactions"
    ),
  );
  assert(
    grantedPermissions.some((permission) => permission.key === "widgets:users"),
  );
});

Deno.test("admin runtime keeps custom flows/views/widgets gated for admins and bypassed for superadmins", async () => {
  const { db, admin } = createRuntimeAdmin();
  const sessionSettings = resolveAdminSessionSettings({
    ttlMs: 1000 * 60 * 60,
  });

  await admin.prepareData();

  const adminUser = await db.User.create({
    email: "admin@example.com",
    passwordHash: await hashPassword("s3cret"),
  });
  const adminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.admin },
  });
  await syncUserRoles(db, adminUser.id, [adminRole.id]);

  const adminLogin = await authenticateAdminUser(
    db,
    adminUser.email,
    "s3cret",
    sessionSettings,
  );

  assert(adminLogin);
  assert(!hasAdminPermission(adminLogin.actor, "flows:configure-channels"));
  assert(!hasAdminPermission(adminLogin.actor, "views:transactions"));
  assert(!hasAdminPermission(adminLogin.actor, "widgets:transactions"));
  assert(hasAdminPermission(adminLogin.actor, "widgets:users"));

  const superadminUser = await db.User.create({
    email: "superadmin@example.com",
    passwordHash: await hashPassword("s3cret"),
  });
  const superadminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.superadmin },
  });
  await syncUserRoles(db, superadminUser.id, [superadminRole.id]);

  const superadminLogin = await authenticateAdminUser(
    db,
    superadminUser.email,
    "s3cret",
    sessionSettings,
  );

  assert(superadminLogin);
  assert(hasAdminPermission(superadminLogin.actor, "flows:configure-channels"));
  assert(hasAdminPermission(superadminLogin.actor, "views:transactions"));
  assert(hasAdminPermission(superadminLogin.actor, "widgets:transactions"));
});

Deno.test("admin runtime builds grouped navigation and namespaced paths", async () => {
  const { db, admin } = createRuntimeAdmin();
  const sessionSettings = resolveAdminSessionSettings({
    ttlMs: 1000 * 60 * 60,
  });

  await admin.prepareData();

  const adminUser = await db.User.create({
    email: "admin@example.com",
    passwordHash: await hashPassword("s3cret"),
  });
  const adminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.admin },
  });
  await syncUserRoles(db, adminUser.id, [adminRole.id]);

  const adminLogin = await authenticateAdminUser(
    db,
    adminUser.email,
    "s3cret",
    sessionSettings,
  );

  assert(adminLogin);

  const adminNavigation = admin.buildNavigation(adminLogin.actor, {
    kind: "resource",
    slug: "users",
  });

  assertEquals(admin.getResourcePath("users"), "/admin/resources/users");
  assertEquals(admin.getViewPath("transactions"), "/admin/views/transactions");
  assertEquals(
    admin.getFlowPath("configure-channels"),
    "/admin/flows/configure-channels",
  );
  assertEquals(admin.getDocumentTitle("Queue"), "Queue • Runtime Admin");
  assertEquals(adminNavigation.homeItem.label, "Dashboard");
  assertEquals(adminNavigation.homeItem.kind, "home");
  assertEquals(
    adminNavigation.groups.map((group: AdminNavGroup) => group.label),
    [
      "Resources",
    ],
  );
  assertEquals(
    adminNavigation.groups[0]?.items.map((item: AdminNavItem) => item.label),
    ["Permissions", "Roles", "Users"],
  );

  const superadminUser = await db.User.create({
    email: "superadmin@example.com",
    passwordHash: await hashPassword("s3cret"),
  });
  const superadminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.superadmin },
  });
  await syncUserRoles(db, superadminUser.id, [superadminRole.id]);

  const superadminLogin = await authenticateAdminUser(
    db,
    superadminUser.email,
    "s3cret",
    sessionSettings,
  );

  assert(superadminLogin);

  const superadminNavigation = admin.buildNavigation(superadminLogin.actor, {
    kind: "flow",
    slug: "configure-channels",
  });

  assertEquals(
    superadminNavigation.groups.map((group: AdminNavGroup) => group.label),
    [
      "Transactions",
      "Operations",
      "Resources",
    ],
  );
  assertEquals(superadminNavigation.groups[0]?.items, [{
    href: "/admin/views/transactions",
    label: "Transaction Queue",
    active: false,
    kind: "view",
  }]);
  assertEquals(superadminNavigation.groups[1]?.items, [{
    href: "/admin/flows/configure-channels",
    label: "Configure Channels",
    active: true,
    kind: "flow",
  }]);
  assertEquals(
    superadminNavigation.groups[2]?.items.map((item: AdminNavItem) =>
      item.label
    ),
    ["Audit", "Permissions", "Roles", "Sessions", "Users"],
  );
});

Deno.test("admin runtime renders forbidden, missing flow, and missing record pages directly", async () => {
  const { db, admin } = createRuntimeAdmin();
  const sessionSettings = resolveAdminSessionSettings({
    ttlMs: 1000 * 60 * 60,
  });

  await admin.prepareData();

  const superadminUser = await db.User.create({
    email: "superadmin@example.com",
    passwordHash: await hashPassword("s3cret"),
  });
  const superadminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.superadmin },
  });
  await syncUserRoles(db, superadminUser.id, [superadminRole.id]);

  const login = await authenticateAdminUser(
    db,
    superadminUser.email,
    "s3cret",
    sessionSettings,
  );
  assert(login);

  const resource = admin.findResource("users");
  assert(resource);

  const forbiddenContext = createOakContext("/admin/forbidden");
  admin.renderForbidden(forbiddenContext as never, login.actor);
  assertEquals(forbiddenContext.response.status, 403);
  assertStringIncludes(
    String(forbiddenContext.response.body),
    "You do not have permission to access this page.",
  );

  const missingFlowContext = createOakContext("/admin/flows/missing");
  admin.renderMissingFlow(missingFlowContext as never);
  assertEquals(missingFlowContext.response.status, 404);
  assertStringIncludes(
    String(missingFlowContext.response.body),
    "Admin flow not found.",
  );

  const missingRecordContext = createOakContext(
    "/admin/resources/users/missing",
  );
  admin.renderMissingRecord(
    missingRecordContext as never,
    login.actor,
    resource,
  );
  assertEquals(missingRecordContext.response.status, 404);
  assertStringIncludes(
    String(missingRecordContext.response.body),
    "This record could not be found.",
  );

  admin.components.Shell =
    ((props: { children?: ComponentChildren }) => (
      <div data-shell="custom">{props.children}</div>
    )) as never;

  const customForbiddenContext = createOakContext("/admin/custom-forbidden");
  admin.renderForbidden(customForbiddenContext as never, login.actor);
  assertStringIncludes(
    String(customForbiddenContext.response.body),
    'data-shell="custom"',
  );

  const customMissingRecordContext = createOakContext(
    "/admin/resources/users/custom-missing",
  );
  admin.renderMissingRecord(
    customMissingRecordContext as never,
    login.actor,
    resource,
  );
  assertStringIncludes(
    String(customMissingRecordContext.response.body),
    'data-shell="custom"',
  );
});

Deno.test("admin runtime SSR flow supports login, user CRUD, reset password, and delete", async () => {
  const { db, admin, app } = createMountedAdmin();

  await admin.prepareData();

  const { role: adminRole } = await createAdminUser(
    db,
    DEFAULT_ROLE_KEYS.admin,
  );

  const loginPageResponse = await requestAdmin(app, "/admin/login");
  assertEquals(loginPageResponse.status, 200);
  assertStringIncludes(await loginPageResponse.text(), "Welcome back");

  const loginResponse = await requestAdmin(app, "/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: createFormBody({
      email: "admin@example.com",
      password: "s3cret",
    }),
  });
  assertEquals(loginResponse.status, 303);
  assertEquals(loginResponse.headers.get("location"), "/admin");
  const sessionCookie = getSessionCookie(loginResponse);

  const dashboardResponse = await requestAdmin(app, "/admin", {
    headers: { cookie: sessionCookie },
  });
  assertEquals(dashboardResponse.status, 200);
  assertStringIncludes(await dashboardResponse.text(), "Control room");

  const listResponse = await requestAdmin(app, "/admin/resources/users", {
    headers: { cookie: sessionCookie },
  });
  assertEquals(listResponse.status, 200);
  assertStringIncludes(await listResponse.text(), "admin@example.com");

  const newFormResponse = await requestAdmin(
    app,
    "/admin/resources/users/new",
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(newFormResponse.status, 200);
  const newFormHtml = await newFormResponse.text();
  assertStringIncludes(newFormHtml, "Create user");
  assertStringIncludes(newFormHtml, "Roles");

  const createResponse = await requestAdmin(app, "/admin/resources/users/new", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: sessionCookie,
    },
    body: createFormBody({
      email: "operator@example.com",
      password: "initial-pass",
      roleIds: [adminRole.id],
    }),
  });
  assertEquals(createResponse.status, 303);
  const createdLocation = createResponse.headers.get("location");
  assertExists(createdLocation);
  assertStringIncludes(createdLocation, "/admin/resources/users/");
  assertStringIncludes(createdLocation, "flash=User+created.");

  const createdUser = await db.User.getOne({
    where: { email: "operator@example.com" },
  });
  const createdUserRoles = await loadUserRoles(db, createdUser.id);
  assertEquals(createdUserRoles.map((role) => role.key), [
    DEFAULT_ROLE_KEYS.admin,
  ]);

  const detailResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(detailResponse.status, 200);
  assertStringIncludes(await detailResponse.text(), "operator@example.com");

  const editFormResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}/edit`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(editFormResponse.status, 200);
  assertStringIncludes(await editFormResponse.text(), "Save user");

  const updateResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}/edit`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({
        email: "operator+updated@example.com",
        roleIds: [adminRole.id],
      }),
    },
  );
  assertEquals(updateResponse.status, 303);
  assertStringIncludes(
    updateResponse.headers.get("location") ?? "",
    `/admin/resources/users/${createdUser.id}`,
  );

  const updatedUser = await db.User.getById(createdUser.id);
  assertEquals(updatedUser.email, "operator+updated@example.com");

  const resetFormResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}/reset-password`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(resetFormResponse.status, 200);
  assertStringIncludes(await resetFormResponse.text(), "Save new password");

  const resetResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}/reset-password`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({
        password: "changed-pass",
        passwordConfirmation: "changed-pass",
      }),
    },
  );
  assertEquals(resetResponse.status, 303);

  const resetLogin = await authenticateAdminUser(
    db,
    "operator+updated@example.com",
    "changed-pass",
    resolveAdminSessionSettings({
      ttlMs: 1000 * 60 * 60,
    }),
  );
  assert(resetLogin);

  const deleteFormResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}/delete`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(deleteFormResponse.status, 200);
  assertStringIncludes(await deleteFormResponse.text(), "Delete permanently");

  const deleteWithoutConfirmationResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}/delete`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({ confirmDelete: "false" }),
    },
  );
  assertEquals(deleteWithoutConfirmationResponse.status, 200);
  assertExists(
    await db.User.findOne({
      where: { id: createdUser.id },
    }),
  );

  const deleteResponse = await requestAdmin(
    app,
    `/admin/resources/users/${createdUser.id}/delete`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({ confirmDelete: "true" }),
    },
  );
  assertEquals(deleteResponse.status, 303);
  assertEquals(
    await db.User.findOne({
      where: { id: createdUser.id },
    }),
    null,
  );
});

Deno.test("admin runtime SSR renders dashboard widgets and custom views for superadmins", async () => {
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

  const dashboardResponse = await requestAdmin(app, "/admin", {
    headers: { cookie: sessionCookie },
  });
  assertEquals(dashboardResponse.status, 200);
  const dashboardHtml = await dashboardResponse.text();
  assertStringIncludes(dashboardHtml, "Transaction Queue");
  assertStringIncludes(dashboardHtml, "Pending: 3");
  assertStringIncludes(
    dashboardHtml,
    'data-curio-admin-live-poll-interval="5000"',
  );

  const viewResponse = await requestAdmin(app, "/admin/views/transactions", {
    headers: { cookie: sessionCookie },
  });
  assertEquals(viewResponse.status, 200);
  const viewHtml = await viewResponse.text();
  assertStringIncludes(viewHtml, "Pending: 3");
  assertStringIncludes(viewHtml, 'data-curio-admin-live-poll-interval="5000"');
});

Deno.test("admin runtime SSR handles login failures, forbidden pages, missing routes, and logout", async () => {
  const { db, admin, app } = createMountedAdmin();

  await admin.prepareData();
  await createAdminUser(db, DEFAULT_ROLE_KEYS.admin);

  const failedLoginResponse = await requestAdmin(app, "/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: createFormBody({
      email: "admin@example.com",
      password: "wrong-password",
    }),
  });
  assertEquals(failedLoginResponse.status, 303);
  assertStringIncludes(
    failedLoginResponse.headers.get("location") ?? "",
    "/admin/login?error=",
  );

  const failedAudit = await db.AuditEvent.findOne({
    where: { eventType: "auth.login_failed" },
    orderBy: [{ createdAt: "desc" }],
  });
  assert(failedAudit);

  const loginResponse = await requestAdmin(app, "/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: createFormBody({
      email: "admin@example.com",
      password: "s3cret",
    }),
  });
  const sessionCookie = getSessionCookie(loginResponse);

  const forbiddenRoleCreateResponse = await requestAdmin(
    app,
    "/admin/resources/roles/new",
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(forbiddenRoleCreateResponse.status, 403);
  assertStringIncludes(
    await forbiddenRoleCreateResponse.text(),
    "You do not have permission to access this page.",
  );

  const forbiddenSessionsCreateResponse = await requestAdmin(
    app,
    "/admin/resources/sessions/new",
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(forbiddenSessionsCreateResponse.status, 403);

  const missingResourceResponse = await requestAdmin(
    app,
    "/admin/resources/unknown",
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(missingResourceResponse.status, 404);
  assertStringIncludes(
    await missingResourceResponse.text(),
    "Admin resource not found.",
  );

  const missingViewResponse = await requestAdmin(app, "/admin/views/missing", {
    headers: { cookie: sessionCookie },
  });
  assertEquals(missingViewResponse.status, 404);
  assertStringIncludes(
    await missingViewResponse.text(),
    "Admin view not found.",
  );

  const missingRecordResponse = await requestAdmin(
    app,
    "/admin/resources/users/missing-record",
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(missingRecordResponse.status, 404);
  assertStringIncludes(
    await missingRecordResponse.text(),
    "This record could not be found.",
  );

  const logoutResponse = await requestAdmin(app, "/admin/logout", {
    method: "POST",
    headers: { cookie: sessionCookie },
  });
  assertEquals(logoutResponse.status, 303);
  assertEquals(logoutResponse.headers.get("location"), "/admin/login");
});

Deno.test("admin runtime SSR supports superadmin role CRUD and read-only session/audit resources", async () => {
  const { db, admin, app } = createMountedAdmin();

  await admin.prepareData();
  const { user: superadminUser } = await createAdminUser(
    db,
    DEFAULT_ROLE_KEYS.superadmin,
  );

  const loginResponse = await requestAdmin(app, "/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: createFormBody({
      email: superadminUser.email,
      password: "s3cret",
    }),
  });
  const sessionCookie = getSessionCookie(loginResponse);

  const rolesListResponse = await requestAdmin(app, "/admin/resources/roles", {
    headers: { cookie: sessionCookie },
  });
  assertEquals(rolesListResponse.status, 200);
  assertStringIncludes(await rolesListResponse.text(), "superadmin");

  const newRoleFormResponse = await requestAdmin(
    app,
    "/admin/resources/roles/new",
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(newRoleFormResponse.status, 200);
  assertStringIncludes(await newRoleFormResponse.text(), "Permissions");

  const permissions = await db.Permission.findMany({
    where: {
      key: { in: ["users:list", "users:view"] },
    },
    orderBy: [{ key: "asc" }],
  });
  const permissionIds = permissions.map((permission) => permission.id);

  const createRoleResponse = await requestAdmin(
    app,
    "/admin/resources/roles/new",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({
        key: "support",
        label: "Support",
        description: "Support role",
        permissionIds,
      }),
    },
  );
  assertEquals(createRoleResponse.status, 303);
  const createdRole = await db.Role.getOne({
    where: { key: "support" },
  });
  const createdRolePermissions = await db.RolePermission.findMany({
    where: { roleId: createdRole.id },
  });
  assertEquals(createdRolePermissions.length, permissionIds.length);

  const roleDetailResponse = await requestAdmin(
    app,
    `/admin/resources/roles/${createdRole.id}`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(roleDetailResponse.status, 200);
  assertStringIncludes(await roleDetailResponse.text(), "Support");

  const editRoleFormResponse = await requestAdmin(
    app,
    `/admin/resources/roles/${createdRole.id}/edit`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(editRoleFormResponse.status, 200);
  assertStringIncludes(await editRoleFormResponse.text(), "Save role");

  const updateRoleResponse = await requestAdmin(
    app,
    `/admin/resources/roles/${createdRole.id}/edit`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({
        key: "support",
        label: "Support Team",
        description: "Updated support role",
        bypass: "true",
        permissionIds: [permissionIds[0]!],
      }),
    },
  );
  assertEquals(updateRoleResponse.status, 303);
  const updatedRole = await db.Role.getById(createdRole.id);
  assertEquals(updatedRole.label, "Support Team");
  assertEquals(updatedRole.bypass, true);

  const sessionsListResponse = await requestAdmin(
    app,
    "/admin/resources/sessions",
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(sessionsListResponse.status, 200);
  assertStringIncludes(await sessionsListResponse.text(), "Sessions");

  const sessionRecord = await db.Session.findOne({
    where: { userId: superadminUser.id },
    orderBy: [{ createdAt: "desc" }],
  });
  assert(sessionRecord);

  const sessionDetailResponse = await requestAdmin(
    app,
    `/admin/resources/sessions/${sessionRecord.id}`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(sessionDetailResponse.status, 200);
  assertStringIncludes(await sessionDetailResponse.text(), "Linked records");

  const auditListResponse = await requestAdmin(app, "/admin/resources/audit", {
    headers: { cookie: sessionCookie },
  });
  assertEquals(auditListResponse.status, 200);
  assertStringIncludes(await auditListResponse.text(), "Audit");

  const auditRecord = await db.AuditEvent.findOne({
    where: { eventType: "auth.login_succeeded" },
    orderBy: [{ createdAt: "desc" }],
  });
  assert(auditRecord);

  const auditDetailResponse = await requestAdmin(
    app,
    `/admin/resources/audit/${auditRecord.id}`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(auditDetailResponse.status, 200);
  const auditDetailHtml = await auditDetailResponse.text();
  assertStringIncludes(auditDetailHtml, "auth.login_succeeded");
  assertStringIncludes(auditDetailHtml, "Linked records");

  const deleteRoleFormResponse = await requestAdmin(
    app,
    `/admin/resources/roles/${createdRole.id}/delete`,
    {
      headers: { cookie: sessionCookie },
    },
  );
  assertEquals(deleteRoleFormResponse.status, 200);
  assertStringIncludes(
    await deleteRoleFormResponse.text(),
    "Delete permanently",
  );

  const deleteRoleResponse = await requestAdmin(
    app,
    `/admin/resources/roles/${createdRole.id}/delete`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      },
      body: createFormBody({ confirmDelete: "true" }),
    },
  );
  assertEquals(deleteRoleResponse.status, 303);
  assertEquals(
    await db.Role.findOne({
      where: { id: createdRole.id },
    }),
    null,
  );
});
