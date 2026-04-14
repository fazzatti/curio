/** @jsxImportSource preact */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { renderToString } from "preact-render-to-string";
import { Admin } from "@/admin/core/admin.tsx";
import {
  renderDetailHeaderActions,
  renderDetailPrimary,
  renderDetailSecondary,
  renderRelationSummaryCard,
} from "@/admin/rendering/details.tsx";
import type { AdminRuntimeLike } from "@/admin/core/types.ts";
import type {
  AdminActorContext,
  AdminAuditEventRecord,
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
    email: field.string().required().unique().sortable(),
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

const AccountModel = new Model({
  name: "Account",
  table: "accounts",
  uses: [Timestamps],
  fields: {
    publicKey: field.string().required().primaryKey().sortable(),
    kind: field.string().required(),
  },
  relations: {
    checks: relation.hasMany("AccountCheck").foreignKey("accountPublicKey")
      .references("publicKey"),
  },
});

class AccountEntity extends Entity {
  declare publicKey: string;
  declare kind: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const Account = AccountEntity.from(AccountModel);

const AccountCheckModel = new Model({
  name: "AccountCheck",
  table: "account_checks",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    accountPublicKey: field.string().required().sortable(),
    status: field.string().required(),
  },
  relations: {
    account: relation.belongsTo("Account").foreignKey("accountPublicKey"),
  },
});

class AccountCheckEntity extends Entity {
  declare id: string;
  declare accountPublicKey: string;
  declare status: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const AccountCheck = AccountCheckEntity.from(AccountCheckModel);

const createDetailsTestDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User,
      Account,
      AccountCheck,
      Role,
      Permission,
      UserRole,
      RolePermission,
      Session,
      AuditEvent,
    },
  });

const createDetailsAdmin = () => {
  const db = createDetailsTestDatabase();
  const admin = Admin.create({
    db,
    resources: {
      users: Admin.resource(User, {
        path: "users",
        label: "Users",
        actions: {
          update: true,
          delete: true,
          reset_password: true,
        },
        fieldWidgets: {
          email: {
            detail: ({ value }) => <strong>Primary {String(value)}</strong>,
          },
        },
      }),
      sessions: Admin.resource(Session, {
        path: "sessions",
        label: "Sessions",
        readOnly: true,
      }),
      audit: Admin.resource(AuditEvent, {
        path: "audit",
        label: "Audit",
        readOnly: true,
      }),
      accounts: Admin.resource(Account, {
        path: "accounts",
        label: "Accounts",
      }),
      accountChecks: Admin.resource(AccountCheck, {
        path: "account-checks",
        label: "Account checks",
      }),
    },
  });

  return { db, admin, runtime: admin as unknown as AdminRuntimeLike };
};

const createActor = (
  permissionKeys: string[],
  bypass = false,
): AdminActorContext => ({
  user: {
    id: "actor",
    email: "admin@example.com",
    passwordHash: "hash",
  } as AdminUserRecord,
  roles: [],
  permissions: [],
  session: {} as never,
  permissionKeys: new Set(permissionKeys),
  bypass,
});

describe("admin runtime detail helpers", () => {
  it("render header actions based on permissions", () => {
    const { admin, runtime } = createDetailsAdmin();
    const resource = admin.findResource("users");
    assert(resource);

    const fullActionsHtml = renderToString(
      <>
        {renderDetailHeaderActions(
          runtime,
          resource,
          createActor([
            "users:update",
            "users:delete",
            "users:reset_password",
          ]),
          "user-1",
        )}
      </>,
    );
    assertStringIncludes(fullActionsHtml, "/admin/resources/users/user-1/edit");
    assertStringIncludes(
      fullActionsHtml,
      "/admin/resources/users/user-1/reset-password",
    );
    assertStringIncludes(
      fullActionsHtml,
      "/admin/resources/users/user-1/delete",
    );

    const limitedActionsHtml = renderToString(
      <>
        {renderDetailHeaderActions(
          runtime,
          resource,
          createActor(["users:view"]),
          "user-1",
        )}
      </>,
    );
    assertEquals(limitedActionsHtml, "");
  });

  it("render primary and secondary detail sections with role, relation, audit, and payload data", async () => {
    const { db, admin, runtime } = createDetailsAdmin();
    const userResource = admin.findResource("users");
    const sessionResource = admin.findResource("sessions");
    const auditResource = admin.findResource("audit");
    assert(userResource);
    assert(sessionResource);
    assert(auditResource);

    const user = await db.User.create({
      email: "ada@example.com",
      passwordHash: "hash",
    });
    const adminRole = await db.Role.create({
      key: "admin",
      label: "Admin",
      description: null,
      bypass: false,
    });
    await db.UserRole.create({
      userId: user.id,
      roleId: adminRole.id,
    });

    const session = await db.Session.create({
      userId: user.id,
      tokenHash: "token-hash",
      ipAddress: "127.0.0.1",
      userAgent: "Unit Test",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const recentAuditEntry = await db.AuditEvent.create({
      actorUserId: user.id,
      eventType: "admin.users.update",
      resource: "users",
      recordId: user.id,
      summary: "Updated user profile.",
      payload: null,
      ipAddress: null,
      userAgent: null,
    });

    const auditRecord = await db.AuditEvent.create({
      actorUserId: user.id,
      eventType: "admin.users.create",
      resource: "users",
      recordId: user.id,
      summary: "Created user record.",
      payload: {
        reason: "manual",
      },
      ipAddress: "127.0.0.1",
      userAgent: "Unit Test",
    });

    const actor = createActor([
      "users:view",
      "sessions:list",
      "sessions:view",
      "audit:list",
    ]);

    const primaryHtml = renderToString(
      <>
        {await renderDetailPrimary(
          runtime,
          actor,
          userResource,
          user as unknown as RawRecord,
        )}
      </>,
    );
    assertStringIncludes(primaryHtml, "Roles");
    assertStringIncludes(primaryHtml, ">admin<");
    assertStringIncludes(primaryHtml, "Primary ada@example.com");

    const relationHtml = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          sessionResource,
          actor,
          session as unknown as RawRecord,
        )}
      </>,
    );
    assertStringIncludes(relationHtml, "Linked records");
    assertStringIncludes(relationHtml, "ada@example.com");
    assertStringIncludes(relationHtml, `/admin/resources/users/${user.id}`);

    const secondaryHtml = renderToString(
      <>
        {await renderDetailSecondary(
          runtime,
          userResource,
          actor,
          user as unknown as RawRecord,
          [recentAuditEntry as unknown as AdminAuditEventRecord],
        )}
      </>,
    );
    assertStringIncludes(secondaryHtml, "Recent history");
    assertStringIncludes(secondaryHtml, "Updated user profile.");
    assertStringIncludes(
      secondaryHtml,
      `/admin/resources/sessions?userId=${user.id}`,
    );

    const auditSecondaryHtml = renderToString(
      <>
        {await renderDetailSecondary(
          runtime,
          auditResource,
          actor,
          auditRecord as unknown as RawRecord,
          [],
        )}
      </>,
    );
    assertStringIncludes(auditSecondaryHtml, "Event payload");
    assertStringIncludes(
      auditSecondaryHtml,
      "&quot;reason&quot;: &quot;manual&quot;",
    );
    assertStringIncludes(auditSecondaryHtml, "Linked records");
    assertStringIncludes(auditSecondaryHtml, "ada@example.com");
  });

  it("skip relation summary items when permission, foreign key, or target record is missing", async () => {
    const { db, admin, runtime } = createDetailsAdmin();
    const sessionResource = admin.findResource("sessions");
    assert(sessionResource);

    const user = await db.User.create({
      email: "grace@example.com",
      passwordHash: "hash",
    });
    const session = await db.Session.create({
      userId: user.id,
      tokenHash: "token-hash",
      ipAddress: "127.0.0.1",
      userAgent: "Unit Test",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const withoutPermissionHtml = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          sessionResource,
          createActor([]),
          session as unknown as RawRecord,
        )}
      </>,
    );
    assertEquals(withoutPermissionHtml, "");

    const withoutForeignKeyHtml = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          sessionResource,
          createActor(["users:view"]),
          {
            ...(session as unknown as RawRecord),
            userId: null,
          },
        )}
      </>,
    );
    assertEquals(withoutForeignKeyHtml, "");

    const withoutTargetRecordHtml = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          sessionResource,
          createActor(["users:view"]),
          {
            ...(session as unknown as RawRecord),
            userId: "missing-user",
          },
        )}
      </>,
    );
    assertEquals(withoutTargetRecordHtml, "");
  });

  it("uses the related resource primary key when linking belongs-to records", async () => {
    const { db, admin, runtime } = createDetailsAdmin();
    const accountCheckResource = admin.findResource("account-checks");
    assert(accountCheckResource);

    const publicKey =
      "GCFX3U3Q3R7QTRQLEAQ76XDFWQNU4I4EAP5AT5QOQFOYQHRI6K4J6VCP";
    await db.Account.create({
      publicKey,
      kind: "opex",
    });
    const check = await db.AccountCheck.create({
      accountPublicKey: publicKey,
      status: "healthy",
    });

    const html = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          accountCheckResource,
          createActor(["accounts:view"]),
          check as unknown as RawRecord,
        )}
      </>,
    );

    assertStringIncludes(html, `/admin/resources/accounts/${publicKey}`);
  });

  it("renders has-many summaries with the custom foreign-key filter and skips blank belongs-to keys", async () => {
    const { db, admin, runtime } = createDetailsAdmin();
    const accountResource = admin.findResource("accounts");
    const accountCheckResource = admin.findResource("account-checks");
    assert(accountResource);
    assert(accountCheckResource);

    const account = await db.Account.create({
      publicKey: "GACCOUNT",
      kind: "opex",
    });
    await db.AccountCheck.create({
      accountPublicKey: account.publicKey,
      status: "ok",
    });

    const actor = createActor([
      "accounts:view",
      "accountChecks:list",
    ], true);

    const accountHtml = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          accountResource,
          actor,
          account as unknown as RawRecord,
        )}
      </>,
    );
    assertStringIncludes(accountHtml, "View account checks");
    assertStringIncludes(
      accountHtml,
      `/admin/resources/account-checks?accountPublicKey=${account.publicKey}`,
    );

    const blankForeignKeyHtml = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          accountCheckResource,
          actor,
          {
            id: "check-blank",
            accountPublicKey: "",
            status: "pending",
          } as RawRecord,
        )}
      </>,
    );
    assertEquals(blankForeignKeyHtml, "");
  });

  it("renders empty secondary sections when there is no relation, audit, or payload content", async () => {
    const { admin, runtime } = createDetailsAdmin();
    const sessionResource = admin.findResource("sessions");
    assert(sessionResource);

    const emptyHtml = renderToString(
      <>
        {await renderDetailSecondary(
          runtime,
          sessionResource,
          createActor([]),
          {
            id: "session-1",
            userId: "missing",
            tokenHash: "hash",
            ipAddress: null,
            userAgent: null,
            expiresAt: new Date("2026-01-01T00:00:00.000Z"),
            lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          [],
        )}
      </>,
    );

    assertEquals(emptyHtml, "");
  });
});


describe("admin runtime detail extra edge cases", () => {
  it("skips belongsTo if target record is missing from database", async () => {
    const { db, admin, runtime } = createDetailsAdmin();
    const accountCheckResource = admin.findResource("account-checks");
    assert(accountCheckResource);
    
    const check = await db.AccountCheck.create({
      accountPublicKey: "MISSING_KEY",
      status: "healthy",
    });

    const html = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          accountCheckResource,
          createActor(["accounts:view"]),
          check as unknown as RawRecord,
        )}
      </>,
    );
    
    assertEquals(html, "");
  });

  it("skips hasMany iteration if list permission is denied, and handles omitted foreignKey definitions safely", async () => {
    const { db, admin, runtime } = createDetailsAdmin();
    const accountResource = admin.findResource("accounts");
    assert(accountResource);

    const account = await db.Account.create({
      publicKey: "GACCOUNT_2",
      kind: "opex",
    });
    
    const actorWithoutList = createActor(["accounts:view"], false); 

    const html = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          accountResource,
          actorWithoutList,
          account as unknown as RawRecord,
        )}
      </>,
    );
    assert(!html.includes("View account checks"));
    
    const hackedResource = { ...accountResource };
    hackedResource.model = {
      ...accountResource.model,
      relations: {
        checks: relation.hasMany("AccountCheck") as unknown as typeof accountResource.model.relations.checks,
      },
    } as typeof accountResource.model;

    const hackedHtml = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          hackedResource,
          createActor(["accounts:view", "accountChecks:list"], true),
          account as unknown as RawRecord,
        )}
      </>,
    );
    
    assert(!hackedHtml.includes("View account checks"));
  });
});



describe("admin runtime detail extra edge cases 2", () => {
  it("skips belongsTo if foreignKey is completely omitted in definition", async () => {
    const { db, admin, runtime } = createDetailsAdmin();
    const accountCheckResource = admin.findResource("account-checks");
    assert(accountCheckResource);

    // Create hacked definition
    const hackedResource = { ...accountCheckResource };
    hackedResource.model = {
      ...accountCheckResource.model,
      relations: {
        account: relation.belongsTo("Account") as unknown as typeof accountCheckResource.model.relations.account,
      },
    };
    
    const check = await db.AccountCheck.create({
      accountPublicKey: "MISSING_KEY",
      status: "healthy",
    });

    const html = renderToString(
      <>
        {await renderRelationSummaryCard(
          runtime,
          hackedResource,
          createActor(["accounts:view"]),
          check as unknown as RawRecord,
        )}
      </>,
    );
    
    assertEquals(html, "");
  });
});
