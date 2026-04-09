import { assertEquals, assertNotEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { AuditEvent, Permission, Role, RolePermission, Session, UserRole } from "@/admin/models.ts";
import {
  loadRecentAuditEventsForRecord,
  recordAdminAuditEvent,
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
}

const createAuditTestDatabase = () =>
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

describe("admin audit helpers", () => {
  it("stores explicit optional audit fields and loads recent records in descending order", async () => {
    const db = createAuditTestDatabase();
    const user = await db.User.create({
      email: "ada@example.com",
      passwordHash: "hash",
    });

    const first = await recordAdminAuditEvent(db, {
      actorUserId: user.id,
      eventType: "admin.users.create",
      resource: "users",
      recordId: "user-1",
      summary: "Created user user-1.",
      payload: { source: "manual" },
      ipAddress: "127.0.0.1",
      userAgent: "Unit Test",
    });
    await new Promise((resolve) => setTimeout(resolve, 1));
    const second = await recordAdminAuditEvent(db, {
      eventType: "admin.users.update",
      resource: "users",
      recordId: "user-1",
      summary: "Updated user user-1.",
    });
    const third = await recordAdminAuditEvent(db, {
      eventType: "admin.auth.login",
      summary: "Signed in.",
    });

    assertNotEquals(first.id, second.id);
    assertEquals(first.payload, { source: "manual" });
    assertEquals(first.ipAddress, "127.0.0.1");
    assertEquals(first.userAgent, "Unit Test");
    assertEquals(second.actorUserId, null);
    assertEquals(second.payload, null);
    assertEquals(second.ipAddress, null);
    assertEquals(second.userAgent, null);
    assertEquals(third.resource, null);
    assertEquals(third.recordId, null);

    const recent = await loadRecentAuditEventsForRecord(db, "users", "user-1", 1);
    assertEquals(recent.length, 1);
    assertEquals(recent[0]?.eventType, "admin.users.update");

    const defaultLimited = await loadRecentAuditEventsForRecord(
      db,
      "users",
      "user-1",
    );
    assertEquals(defaultLimited.length, 2);
  });
});
