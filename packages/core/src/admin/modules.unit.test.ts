import { assert, assertEquals, assertNotEquals } from "@std/assert";
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
  DEFAULT_ROLE_KEYS,
  findExistingSuperadmin,
  hasAdminPermission,
  loadRecentAuditEventsForRecord,
  loadUserRoles,
  recordAdminAuditEvent,
  resolveAdminActor,
  resolveAdminSessionSettings,
  seedDefaultAdminData,
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

Deno.test("seedDefaultAdminData creates the built-in roles and permissions idempotently", async () => {
  const db = createAdminTestDatabase();

  await seedDefaultAdminData(db);
  await seedDefaultAdminData(db);

  const roles = await db.Role.findMany({
    orderBy: [{ key: "asc" }],
  });
  const permissions = await db.Permission.findMany({
    orderBy: [{ key: "asc" }],
  });
  const adminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.admin },
  });
  const adminRolePermissions = await db.RolePermission.findMany({
    where: { roleId: adminRole.id },
  });

  assertEquals(roles.map((role) => role.key), ["admin", "superadmin"]);
  assertEquals(permissions.length, 25);
  assertEquals(adminRolePermissions.length, 13);
});

Deno.test("admin auth resolves roles, permissions, and a rolling session", async () => {
  const db = createAdminTestDatabase();
  const sessionSettings = resolveAdminSessionSettings({
    ttlMs: 1000 * 60 * 60,
  });

  await seedDefaultAdminData(db);

  const user = await db.User.create({
    email: "admin@example.com",
    passwordHash: await hashPassword("s3cret"),
  });
  const adminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.admin },
  });

  await syncUserRoles(db, user.id, [adminRole.id]);

  const loginResult = await authenticateAdminUser(
    db,
    user.email,
    "s3cret",
    sessionSettings,
  );

  assert(loginResult);
  assert(hasAdminPermission(loginResult.actor, "users:list"));
  assert(!hasAdminPermission(loginResult.actor, "audit:list"));

  const session = await db.Session.findOne({
    where: { userId: user.id },
  });

  assert(session);

  const resolvedActor = await resolveAdminActor(
    db,
    loginResult.token,
    sessionSettings,
  );

  assert(resolvedActor);
  assertEquals(resolvedActor.user.email, "admin@example.com");
  assertEquals((await loadUserRoles(db, user.id)).map((role) => role.key), [
    "admin",
  ]);
});

Deno.test("loadUserRoles returns an empty list for blank ids", async () => {
  const db = createAdminTestDatabase();

  await seedDefaultAdminData(db);

  assertEquals(await loadUserRoles(db, ""), []);
});

Deno.test("audit helpers record immutable events and superadmin discovery uses role joins", async () => {
  const db = createAdminTestDatabase();

  await seedDefaultAdminData(db);

  const user = await db.User.create({
    email: "superadmin@example.com",
    passwordHash: await hashPassword("s3cret"),
  });
  const superadminRole = await db.Role.getOne({
    where: { key: DEFAULT_ROLE_KEYS.superadmin },
  });

  await syncUserRoles(db, user.id, [superadminRole.id]);

  const discoveredSuperadmin = await findExistingSuperadmin(db);

  assert(discoveredSuperadmin);
  assertEquals(discoveredSuperadmin.email, "superadmin@example.com");

  const firstEvent = await recordAdminAuditEvent(db, {
    actorUserId: user.id,
    eventType: "admin.users.create",
    resource: "users",
    recordId: "user_1",
    summary: "Created user user_1.",
  });
  const secondEvent = await recordAdminAuditEvent(db, {
    actorUserId: user.id,
    eventType: "admin.users.update",
    resource: "users",
    recordId: "user_1",
    summary: "Updated user user_1.",
  });
  const recentEvents = await loadRecentAuditEventsForRecord(
    db,
    "users",
    "user_1",
  );

  assertNotEquals(firstEvent.id, secondEvent.id);
  assertEquals(recentEvents.length, 2);
  assertEquals(
    new Set(recentEvents.map((event) => event.eventType)),
    new Set(["admin.users.create", "admin.users.update"]),
  );
});
