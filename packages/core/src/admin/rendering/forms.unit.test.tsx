/** @jsxImportSource preact */

import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { renderToString } from "preact-render-to-string";
import { Admin } from "@/admin/core/admin.tsx";
import {
  buildGenericInput,
  createRecord,
  deleteRecord,
  renderCreateForm,
  renderDeleteForm,
  renderEditForm,
  renderForm,
  renderResetPasswordForm,
  updateRecord,
} from "@/admin/rendering/forms.tsx";
import type {
  AdminRuntimeLike,
  OakRouterContext,
} from "@/admin/core/types.ts";
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
import type { RawRecord } from "@/db/types.ts";
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

const NoteModel = new Model({
  name: "Note",
  table: "notes",
  fields: {
    id: field.id(),
    title: field.string().required(),
    apiEnabled: field.boolean(),
  },
});

const Note = Entity.from(NoteModel);

const ApiClientModel = new Model({
  name: "ApiClient",
  table: "api_clients",
  fields: {
    publicKey: field.string().required().primaryKey().default(
      () => "client-primary",
    ),
    label: field.string().required(),
  },
});

const ApiClient = Entity.from(ApiClientModel);

const HookNoteModel = new Model({
  name: "HookNote",
  table: "hook_notes",
  fields: {
    id: field.id(),
    title: field.string().required(),
    notes: field.text().nullable(),
  },
});

const HookNote = Entity.from(HookNoteModel);

const createFormsTestDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User,
      Note,
      ApiClient,
      HookNote,
      Role,
      Permission,
      UserRole,
      RolePermission,
      Session,
      AuditEvent,
    },
  });

const createFormsAdmin = () => {
  const db = createFormsTestDatabase();
  const admin = Admin.create({
    db,
    resources: {
      users: Admin.resource(User, {
        path: "users",
        label: "Users",
        actions: {
          create: true,
          update: true,
          delete: true,
          reset_password: true,
        },
      }),
      roles: Admin.resource(Role, {
        path: "roles",
        label: "Roles",
      }),
      notes: Admin.resource(Note, {
        path: "notes",
        label: "Notes",
      }),
      apiClients: Admin.resource(ApiClient, {
        path: "api-clients",
        label: "API Clients",
      }),
      permissions: Admin.resource(Permission, {
        path: "permissions",
        label: "Permissions",
        fieldWidgets: {
          label: {
            form: ({ inputName, value }) => (
              <textarea name={inputName} data-widget="label-override">
                {String(value ?? "")}
              </textarea>
            ),
          },
        },
      }),
      sessions: Admin.resource(Session, {
        path: "sessions",
        label: "Sessions",
        actions: {
          delete: true,
        },
      }),
    },
  });

  return { db, admin, runtime: admin as unknown as AdminRuntimeLike };
};

const createHookFormsAdmin = () => {
  const db = createFormsTestDatabase();
  let createdInput: RawRecord | undefined;
  let updatedInput: RawRecord | undefined;

  const admin = Admin.create({
    db,
    components: {
      FormPage: ({ form }) => <div data-form-page="admin">{form}</div>,
    },
    resources: {
      hookNotes: Admin.resource(HookNote, {
        path: "hook-notes",
        label: "Hook notes",
        components: {
          FormPage: ({ form }) => <div data-form-page="resource">{form}</div>,
        },
        hooks: {
          create: async ({ db, input }) => {
            createdInput = input as RawRecord;

            if (input.title === "Missing") {
              return "missing-hook-note";
            }

            const created = await (
              db as unknown as ReturnType<typeof createFormsTestDatabase>
            ).HookNote.create({
              id: crypto.randomUUID(),
              ...(input as RawRecord),
            });

            return created.id;
          },
          update: async ({ db, id, input }) => {
            updatedInput = input as RawRecord;
            await (
              db as unknown as ReturnType<typeof createFormsTestDatabase>
            ).HookNote.updateById(id, input as RawRecord);
          },
        },
      }),
      notes: Admin.resource(Note, {
        path: "notes",
        label: "Notes",
      }),
    },
  });

  return {
    db,
    admin,
    runtime: admin as unknown as AdminRuntimeLike,
    getCreatedInput: () => createdInput,
    getUpdatedInput: () => updatedInput,
  };
};

const createActor = async (db: ReturnType<typeof createFormsTestDatabase>) => {
  const actorUser = await db.User.create({
    email: "admin@example.com",
    passwordHash: "hashed",
  });

  const actor: AdminActorContext = {
    user: actorUser as unknown as AdminUserRecord,
    roles: [],
    permissions: [],
    session: {} as never,
    permissionKeys: new Set([
      "users:create",
      "users:update",
      "users:delete",
      "users:reset_password",
      "roles:create",
      "roles:update",
      "roles:delete",
      "permissions:create",
      "permissions:update",
      "permissions:delete",
    ]),
    bypass: true,
  };

  return { actorUser, actor };
};

const createMockContext = (): OakRouterContext => ({
  params: {},
  request: {
    url: new URL("http://localhost/admin"),
    headers: new Headers({
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "Unit Test Agent",
    }),
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

describe("admin runtime form helpers", () => {
  it("render generic, role, reset-password, and delete forms", async () => {
    const { db, admin, runtime } = createFormsAdmin();
    const permissionResource = admin.findResource("permissions");
    const roleResource = admin.findResource("roles");
    const userResource = admin.findResource("users");
    assert(permissionResource);
    assert(roleResource);
    assert(userResource);

    const auditListPermission = await db.Permission.create({
      key: "audit:list",
      label: "Audit list",
      resource: "audit",
      action: "list",
      description: "Read audit events",
    });
    const usersViewPermission = await db.Permission.create({
      key: "users:view",
      label: "Users view",
      resource: "users",
      action: "view",
      description: "Read users",
    });
    await db.Permission.create({
      key: "users:update",
      label: "Users update",
      resource: "users",
      action: "update",
      description: null,
    });
    const role = await db.Role.create({
      key: "support",
      label: "Support",
      description: "Support team",
      bypass: false,
    });
    await db.RolePermission.create({
      roleId: role.id,
      permissionId: auditListPermission.id,
    });

    const { actor } = await createActor(db);

    const genericFormHtml = renderToString(
      <>{await renderForm(runtime, actor, permissionResource, "create")}</>,
    );
    assertStringIncludes(genericFormHtml, 'name="key"');
    assertStringIncludes(genericFormHtml, 'name="label"');
    assertStringIncludes(genericFormHtml, 'data-widget="label-override"');
    assertStringIncludes(genericFormHtml, "Create");

    const genericEditFormHtml = renderToString(
      <>
        {await renderForm(
          runtime,
          actor,
          permissionResource,
          "edit",
          auditListPermission as unknown as RawRecord,
        )}
      </>,
    );
    assertStringIncludes(genericEditFormHtml, "Save changes");

    const roleFormHtml = renderToString(
      <>
        {await renderForm(
          runtime,
          actor,
          roleResource,
          "edit",
          role as unknown as RawRecord,
        )}
      </>,
    );
    assertStringIncludes(roleFormHtml, 'name="permissionIds"');
    assertStringIncludes(roleFormHtml, "Audit list");
    assertStringIncludes(roleFormHtml, "Users view");
    assertStringIncludes(roleFormHtml, "Save role");
    assertStringIncludes(roleFormHtml, "Bypass granular permission checks");

    const createRoleHtml = renderToString(
      <>{await renderForm(runtime, actor, roleResource, "create")}</>,
    );
    assertStringIncludes(createRoleHtml, "Create role");
    assertStringIncludes(createRoleHtml, 'name="permissionIds"');

    const submittedRoleHtml = renderToString(
      <>
        {await renderForm(
          runtime,
          actor,
          roleResource,
          "edit",
          role as unknown as RawRecord,
          new URLSearchParams({
            key: "support",
            label: "Support",
            description: "Updated description",
            bypass: "true",
            permissionIds: auditListPermission.id,
          }),
        )}
      </>,
    );
    assertStringIncludes(submittedRoleHtml, "Updated description");
    assertStringIncludes(submittedRoleHtml, "checked");

    const resetPasswordHtml = renderToString(
      <>{renderResetPasswordForm(runtime, userResource, "user-1")}</>,
    );
    assertStringIncludes(resetPasswordHtml, "New password");
    assertStringIncludes(resetPasswordHtml, "Confirm password");
    assertStringIncludes(
      resetPasswordHtml,
      `/admin/resources/users/user-1`,
    );

    const deleteFormHtml = renderToString(
      <>{renderDeleteForm(runtime, permissionResource, "permission-1")}</>,
    );
    assertStringIncludes(deleteFormHtml, "Delete permanently");
    assertStringIncludes(
      deleteFormHtml,
      "I understand this deletion is permanent.",
    );

    const createContext = createMockContext();
    await renderCreateForm(
      runtime,
      createContext,
      actor,
      userResource,
      "Create failed.",
    );
    assertStringIncludes(String(createContext.response.body), "Create failed.");

    const existingUser = await db.User.create({
      email: "edit@example.com",
      passwordHash: "hash",
    });
    const editContext = createMockContext();
    await renderEditForm(
      runtime,
      editContext,
      actor,
      userResource,
      existingUser as unknown as RawRecord,
      "Edit failed.",
    );
    assertStringIncludes(String(editContext.response.body), "Edit failed.");
  });

  it("build generic inputs and perform generic create, update, and delete flows with audit logging", async () => {
    const { db, admin, runtime } = createFormsAdmin();
    const permissionResource = admin.findResource("permissions");
    const noteResource = admin.findResource("notes");
    const apiClientResource = admin.findResource("api-clients");
    assert(permissionResource);
    assert(noteResource);
    assert(apiClientResource);
    const { actor } = await createActor(db);
    const ctx = createMockContext();

    const genericInput = buildGenericInput(
      permissionResource,
      new URLSearchParams({
        key: "reports:view",
        label: "Reports view",
        resource: "reports",
        action: "view",
        description: "",
      }),
    );
    assertEquals(genericInput, {
      key: "reports:view",
      label: "Reports view",
      resource: "reports",
      action: "view",
      description: null,
    });

    const booleanInput = buildGenericInput(
      noteResource,
      new URLSearchParams({
        title: "Channel note",
      }),
    );
    assertEquals(booleanInput, {
      title: "Channel note",
      apiEnabled: false,
    });

    const createdPermissionId = await createRecord(
      runtime,
      permissionResource,
      actor,
      new URLSearchParams({
        key: "reports:view",
        label: "Reports view",
        resource: "reports",
        action: "view",
        description: "Can read reports",
      }),
      ctx,
    );
    const createdPermission = await db.Permission.getById(createdPermissionId);
    assertEquals(createdPermission.label, "Reports view");

    await updateRecord(
      runtime,
      permissionResource,
      actor,
      createdPermission.id,
      new URLSearchParams({
        key: "reports:view",
        label: "Reports access",
        resource: "reports",
        action: "view",
        description: "",
      }),
      ctx,
    );
    const updatedPermission = await db.Permission.getById(createdPermission.id);
    assertEquals(updatedPermission.label, "Reports access");
    assertEquals(updatedPermission.description, null);

    const note = await db.Note.create({
      id: "note-1",
      title: "Needs review",
      apiEnabled: true,
    });
    await updateRecord(
      runtime,
      noteResource,
      actor,
      note.id,
      new URLSearchParams({
        title: "Approved",
      }),
      ctx,
    );
    const updatedNote = await db.Note.getById(note.id);
    assertEquals(updatedNote.title, "Approved");
    assertEquals(updatedNote.apiEnabled, false);

    const createdClientId = await createRecord(
      runtime,
      apiClientResource,
      actor,
      new URLSearchParams({
        label: "Primary client",
      }),
      ctx,
    );
    assertEquals(createdClientId, "client-primary");
    assertEquals(
      (await db.ApiClient.getById(createdClientId)).label,
      "Primary client",
    );

    const role = await db.Role.create({
      key: "support",
      label: "Support",
      description: null,
      bypass: false,
    });
    const assignment = await db.RolePermission.create({
      roleId: role.id,
      permissionId: createdPermission.id,
    });

    await deleteRecord(
      runtime,
      permissionResource,
      actor,
      createdPermission.id,
      ctx,
    );
    assertEquals(await db.Permission.findById(createdPermission.id), null);
    assertEquals(await db.RolePermission.findById(assignment.id), null);

    const auditEvents = await db.AuditEvent.findMany({
      where: {
        resource: "permissions",
      },
      orderBy: [{ createdAt: "asc" }],
    });
    assertEquals(auditEvents.length, 3);
    assertStringIncludes(auditEvents[0]?.summary ?? "", "Created permission");
    assertStringIncludes(auditEvents[1]?.summary ?? "", "Updated permission");
    assertStringIncludes(auditEvents[2]?.summary ?? "", "Deleted permission");
    assertEquals(auditEvents[0]?.ipAddress, "203.0.113.10");
    assertEquals(auditEvents[0]?.userAgent, "Unit Test Agent");
    assertExists(updatedPermission.updatedAt);
  });

  it("validate role inputs and clean role/session assignments during deletes", async () => {
    const { db, admin, runtime } = createFormsAdmin();
    const roleResource = admin.findResource("roles");
    const sessionResource = admin.findResource("sessions");
    assert(roleResource);
    assert(sessionResource);
    const { actor } = await createActor(db);
    const ctx = createMockContext();

    let createError: Error | undefined;
    try {
      await createRecord(
        runtime,
        roleResource,
        actor,
        new URLSearchParams({
          key: "",
          label: "",
        }),
        ctx,
      );
    } catch (error) {
      createError = error as Error;
    }
    assertEquals(createError?.message, "Key and label are required.");

    const role = await db.Role.create({
      key: "support",
      label: "Support",
      description: null,
      bypass: false,
    });

    let updateError: Error | undefined;
    try {
      await updateRecord(
        runtime,
        roleResource,
        actor,
        role.id,
        new URLSearchParams({
          key: "",
          label: "",
        }),
        ctx,
      );
    } catch (error) {
      updateError = error as Error;
    }
    assertEquals(updateError?.message, "Key and label are required.");

    const permission = await db.Permission.create({
      key: "users:view",
      label: "Users view",
      resource: "users",
      action: "view",
      description: null,
    });
    const user = await db.User.create({
      email: "member@example.com",
      passwordHash: "hash",
    });
    const rolePermission = await db.RolePermission.create({
      roleId: role.id,
      permissionId: permission.id,
    });
    const userRole = await db.UserRole.create({
      userId: user.id,
      roleId: role.id,
    });

    await deleteRecord(runtime, roleResource, actor, role.id, ctx);
    assertEquals(await db.Role.findById(role.id), null);
    assertEquals(await db.RolePermission.findById(rolePermission.id), null);
    assertEquals(await db.UserRole.findById(userRole.id), null);

    const session = await db.Session.create({
      userId: user.id,
      tokenHash: "token-hash",
      ipAddress: null,
      userAgent: null,
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await deleteRecord(runtime, sessionResource, actor, session.id, ctx);
    assertEquals(await db.Session.findById(session.id), null);
  });

  it("creates and updates roles with bypass and permission assignments", async () => {
    const { db, admin, runtime } = createFormsAdmin();
    const roleResource = admin.findResource("roles");
    assert(roleResource);
    const { actor } = await createActor(db);
    const ctx = createMockContext();

    const permission = await db.Permission.create({
      key: "users:view",
      label: "Users view",
      resource: "users",
      action: "view",
      description: null,
    });

    const roleId = await createRecord(
      runtime,
      roleResource,
      actor,
      new URLSearchParams({
        key: "manager",
        label: "Manager",
        bypass: "true",
        permissionIds: permission.id,
      }),
      ctx,
    );
    const createdRole = await db.Role.getById(roleId);
    assertEquals(createdRole.bypass, true);
    assertEquals(
      (await db.RolePermission.findMany({ where: { roleId } })).map((entry) =>
        entry.permissionId
      ),
      [permission.id],
    );

    await updateRecord(
      runtime,
      roleResource,
      actor,
      roleId,
      new URLSearchParams({
        key: "manager",
        label: "Manager",
      }),
      ctx,
    );
    const updatedRole = await db.Role.getById(roleId);
    assertEquals(updatedRole.bypass, false);
    assertEquals(await db.RolePermission.findMany({ where: { roleId } }), []);
  });

  it("renders user forms from submitted values and handles user create/update plus generic updates without timestamps", async () => {
    const { db, admin, runtime } = createFormsAdmin();
    const userResource = admin.findResource("users");
    const noteResource = admin.findResource("notes");
    assert(userResource);
    assert(noteResource);
    const { actor } = await createActor(db);
    const ctx = createMockContext();

    const role = await db.Role.create({
      key: "support",
      label: "Support",
      description: null,
      bypass: false,
    });

    const createUserHtml = renderToString(
      <>
        {await renderForm(
          runtime,
          actor,
          userResource,
          "create",
          undefined,
          new URLSearchParams({
            email: "new@example.com",
            roleIds: role.id,
          }),
        )}
      </>,
    );
    assertStringIncludes(createUserHtml, 'value="new@example.com"');

    const createdUserId = await createRecord(
      runtime,
      userResource,
      actor,
      new URLSearchParams({
        email: "member@example.com",
        password: "s3cret",
        roleIds: role.id,
      }),
      ctx,
    );
    const createdUser = await db.User.getById(createdUserId);
    assertEquals(createdUser.email, "member@example.com");
    assertEquals(
      (await db.UserRole.findMany({ where: { userId: createdUserId } })).map((
        entry,
      ) => entry.roleId),
      [role.id],
    );

    await updateRecord(
      runtime,
      userResource,
      actor,
      createdUserId,
      new URLSearchParams({
        email: "member+updated@example.com",
      }),
      ctx,
    );
    const updatedUser = await db.User.getById(createdUserId);
    assertEquals(updatedUser.email, "member+updated@example.com");
    assertEquals(
      await db.UserRole.findMany({ where: { userId: createdUserId } }),
      [],
    );

    const note = await db.Note.create({
      id: "note-1",
      title: "Initial",
    });
    await updateRecord(
      runtime,
      noteResource,
      actor,
      note.id,
      new URLSearchParams({
        title: "Updated",
      }),
      ctx,
    );
    assertEquals((await db.Note.getById(note.id)).title, "Updated");
  });

  it("uses resource and admin form page overrides and executes generic create/update hooks", async () => {
    const {
      db,
      admin,
      runtime,
      getCreatedInput,
      getUpdatedInput,
    } = createHookFormsAdmin();
    const hookResource = admin.findResource("hook-notes");
    const noteResource = admin.findResource("notes");
    assert(hookResource);
    assert(noteResource);
    const { actor } = await createActor(db);
    const ctx = createMockContext();

    const createContext = createMockContext();
    await renderCreateForm(runtime, createContext, actor, hookResource);
    assertStringIncludes(String(createContext.response.body), 'data-form-page="resource"');

    const adminCreateContext = createMockContext();
    await renderCreateForm(runtime, adminCreateContext, actor, noteResource);
    assertStringIncludes(
      String(adminCreateContext.response.body),
      'data-form-page="admin"',
    );

    const existingNote = await db.Note.create({
      id: "plain-note",
      title: "Plain note",
    });
    const editContext = createMockContext();
    await renderEditForm(
      runtime,
      editContext,
      actor,
      noteResource,
      existingNote as unknown as RawRecord,
    );
    assertStringIncludes(String(editContext.response.body), 'data-form-page="admin"');

    const hookRecordForEdit = await db.HookNote.create({
      id: "hook-note-edit",
      title: "Hook edit",
      notes: "Hook edit",
    });
    const hookEditContext = createMockContext();
    await renderEditForm(
      runtime,
      hookEditContext,
      actor,
      hookResource,
      hookRecordForEdit as unknown as RawRecord,
    );
    assertStringIncludes(
      String(hookEditContext.response.body),
      'data-form-page="resource"',
    );

    const noteFormHtml = renderToString(
      <>
        {await renderForm(
          runtime,
          actor,
          noteResource,
          "edit",
          existingNote as unknown as RawRecord,
          new URLSearchParams({ title: "Submitted value" }),
        )}
      </>,
    );
    assertStringIncludes(noteFormHtml, 'value="Submitted value"');

    const createdId = await createRecord(
      runtime,
      hookResource,
      actor,
      new URLSearchParams({
        title: "Hooked note",
        notes: "Created through hook",
      }),
      ctx,
    );
    assertEquals(createdId.length > 0, true);
    assertEquals(getCreatedInput(), {
      title: "Hooked note",
      notes: "Created through hook",
    });
    assertEquals(
      (await db.HookNote.getById(createdId)).title,
      "Hooked note",
    );

    const hookRecord = await db.HookNote.create({
      id: "hook-note-1",
      title: "Before",
      notes: "Before",
    });
    await updateRecord(
      runtime,
      hookResource,
      actor,
      hookRecord.id,
      new URLSearchParams({
        title: "After",
        notes: "Updated through hook",
      }),
      ctx,
    );
    assertEquals(getUpdatedInput(), {
      title: "After",
      notes: "Updated through hook",
    });
    assertEquals((await db.HookNote.getById(hookRecord.id)).title, "After");

    let createError: Error | undefined;
    try {
      await createRecord(
        runtime,
        hookResource,
        actor,
        new URLSearchParams({
          title: "Missing",
          notes: "This record is not persisted",
        }),
        ctx,
      );
    } catch (error) {
      createError = error as Error;
    }

    assertEquals(
      createError?.message,
      "Created hooknote could not be reloaded.",
    );
  });
});
