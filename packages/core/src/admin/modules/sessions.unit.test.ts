import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { hashPassword } from "@/auth/password.ts";
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
  createAdminSession,
  destroyAdminSession,
  resolveAdminActor,
  resolveAdminSessionSettings,
  seedDefaultAdminData,
  DEFAULT_ROLE_KEYS,
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

describe("admin sessions module", () => {
  it("creates and destroys admin sessions across missing-token edge cases", async () => {
    const db = createAdminTestDatabase();
    const settings = resolveAdminSessionSettings({
      ttlMs: 60_000,
      rolling: false,
    });

    await seedDefaultAdminData(db);

    const user = await db.User.create({
      email: "admin@example.com",
      passwordHash: await hashPassword("s3cret"),
    });

    await destroyAdminSession(db, null);
    await destroyAdminSession(db, undefined);
    await destroyAdminSession(db, "missing");

    const { token, session } = await createAdminSession(
      db,
      {
        userId: user.id,
        ipAddress: "203.0.113.10",
        userAgent: "Unit Test",
      },
      settings,
    );

    assert(token);
    assertEquals(session.userId, user.id);
    assertEquals(session.ipAddress, "203.0.113.10");
    assertEquals(session.userAgent, "Unit Test");

    await destroyAdminSession(db, token);
    assertEquals(
      await db.Session.findOne({ where: { id: session.id } }),
      null,
    );
  });

  it("resolves admin actors for rolling and non-rolling sessions and cleans up invalid ones", async () => {
    const db = createAdminTestDatabase();
    const rollingSettings = resolveAdminSessionSettings({
      ttlMs: 60_000,
      rolling: true,
    });
    const fixedSettings = resolveAdminSessionSettings({
      ttlMs: 60_000,
      rolling: false,
    });

    await seedDefaultAdminData(db);

    const adminUser = await db.User.create({
      email: "admin@example.com",
      passwordHash: await hashPassword("s3cret"),
    });
    const adminRole = await db.Role.getOne({
      where: { key: DEFAULT_ROLE_KEYS.admin },
    });
    await syncUserRoles(db, adminUser.id, [adminRole.id]);

    assertEquals(await resolveAdminActor(db, null, rollingSettings), null);
    assertEquals(await resolveAdminActor(db, "missing", rollingSettings), null);

    const { token: rollingToken } = await createAdminSession(
      db,
      { userId: adminUser.id },
      rollingSettings,
    );
    const rollingSessionBefore = await db.Session.getOne({
      where: { userId: adminUser.id },
      orderBy: [{ createdAt: "desc" }],
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    const rollingActor = await resolveAdminActor(db, rollingToken, rollingSettings);
    assert(rollingActor);
    assertEquals(rollingActor.user.email, "admin@example.com");
    assertEquals(rollingActor.bypass, false);
    assert(rollingActor.permissionKeys.has("users:list"));
    assertNotEquals(
      rollingActor.session.expiresAt.getTime(),
      rollingSessionBefore.expiresAt.getTime(),
    );

    const { token: fixedToken, session: fixedSessionBefore } = await createAdminSession(
      db,
      { userId: adminUser.id },
      fixedSettings,
    );
    const fixedActor = await resolveAdminActor(db, fixedToken, fixedSettings);
    assert(fixedActor);
    assertEquals(
      fixedActor.session.expiresAt.getTime(),
      fixedSessionBefore.expiresAt.getTime(),
    );

    const plainUser = await db.User.create({
      email: "plain@example.com",
      passwordHash: await hashPassword("s3cret"),
    });
    const { token: noPermissionToken, session: noPermissionSession } =
      await createAdminSession(
        db,
        { userId: plainUser.id },
        rollingSettings,
      );
    assertEquals(
      await resolveAdminActor(db, noPermissionToken, rollingSettings),
      null,
    );
    assertEquals(
      (await db.Session.findOne({ where: { id: noPermissionSession.id } }))?.id,
      noPermissionSession.id,
    );

    const { token: expiredToken, session: createdExpiredSession } =
      await createAdminSession(
        db,
        { userId: adminUser.id },
        rollingSettings,
      );
    const expiredSession = await db.Session.updateById(createdExpiredSession.id, {
      expiresAt: new Date(Date.now() - 1000),
      lastSeenAt: new Date(Date.now() - 2000),
    });
    assertEquals(await resolveAdminActor(db, expiredToken, rollingSettings), null);
    assertEquals(
      await db.Session.findOne({ where: { id: expiredSession.id } }),
      null,
    );

    const orphanUser = await db.User.create({
      email: "orphan@example.com",
      passwordHash: await hashPassword("s3cret"),
    });
    const { token: orphanToken, session: orphanSession } = await createAdminSession(
      db,
      { userId: orphanUser.id },
      rollingSettings,
    );
    await db.User.deleteById(orphanUser.id);
    assertEquals(await resolveAdminActor(db, orphanToken, rollingSettings), null);
    assertEquals(
      await db.Session.findOne({ where: { id: orphanSession.id } }),
      null,
    );
  });

  it("authenticates only valid admin users and destroys sessions when actor resolution fails", async () => {
    const db = createAdminTestDatabase();
    const settings = resolveAdminSessionSettings({
      ttlMs: 60_000,
      rolling: true,
    });

    await seedDefaultAdminData(db);

    assertEquals(
      await authenticateAdminUser(db, "   ", "s3cret", settings),
      null,
    );
    assertEquals(
      await authenticateAdminUser(db, "missing@example.com", "s3cret", settings),
      null,
    );

    const user = await db.User.create({
      email: "admin@example.com",
      passwordHash: await hashPassword("s3cret"),
    });
    const adminRole = await db.Role.getOne({
      where: { key: DEFAULT_ROLE_KEYS.admin },
    });
    await syncUserRoles(db, user.id, [adminRole.id]);

    assertEquals(
      await authenticateAdminUser(db, user.email, "wrong", settings),
      null,
    );

    const authenticated = await authenticateAdminUser(
      db,
      "ADMIN@example.com",
      "s3cret",
      settings,
      {
        ipAddress: "198.51.100.5",
        userAgent: "Unit Test Agent",
      },
    );
    assert(authenticated);
    assertEquals(authenticated.actor.user.id, user.id);

    const noRoleUser = await db.User.create({
      email: "viewer@example.com",
      passwordHash: await hashPassword("s3cret"),
    });
    assertEquals(
      await authenticateAdminUser(db, noRoleUser.email, "s3cret", settings),
      null,
    );
    assertEquals(
      await db.Session.findOne({
        where: { userId: noRoleUser.id },
        orderBy: [{ createdAt: "desc" }],
      }),
      null,
    );
  });
});
