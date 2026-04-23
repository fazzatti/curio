import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  AuditEvent,
  Permission,
  Role,
  RolePermission,
  Session,
  UserRole,
} from "@/admin/models.ts";
import {
  findExistingSuperadmin,
  hasAdminPermission,
  loadRolePermissions,
  loadUserRoles,
  seedDefaultAdminData,
  seedPermissionDefinitions,
  seedRegisteredAdminPermissions,
  syncRolePermissions,
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

describe("admin RBAC helpers", () => {
  it("handles empty permission sources and empty relation lookups", async () => {
    const db = createAdminTestDatabase();

    await seedRegisteredAdminPermissions(db, {});
    assertEquals(await loadRolePermissions(db, ""), []);
    assertEquals(await loadUserRoles(db, "missing"), []);
    assertEquals(await findExistingSuperadmin(db), null);
    await seedDefaultAdminData(db);
    assertEquals(await findExistingSuperadmin(db), null);
    assertEquals(hasAdminPermission(null, "users:view"), false);
  });

  it("seeds registered permissions and syncs user/role assignments idempotently", async () => {
    const db = createAdminTestDatabase();
    await seedDefaultAdminData(db);

    const user = await db.User.create({
      email: "ada@example.com",
      passwordHash: "hashed",
    });
    const role = await db.Role.create({
      key: "support",
      label: "Support",
      description: null,
      bypass: false,
    });
    const permission = await db.Permission.create({
      key: "custom:view",
      label: "Custom view",
      resource: "views",
      action: "custom",
      description: null,
    });

    await syncUserRoles(db, user.id, [role.id]);
    await syncUserRoles(db, user.id, [role.id]);
    assertEquals(
      (await db.UserRole.findMany({ where: { userId: user.id } })).length,
      1,
    );
    await syncUserRoles(db, user.id, []);
    assertEquals(
      (await db.UserRole.findMany({ where: { userId: user.id } })).length,
      0,
    );

    await syncRolePermissions(db, role.id, [permission.id]);
    await syncRolePermissions(db, role.id, [permission.id]);
    assertEquals(
      (await db.RolePermission.findMany({ where: { roleId: role.id } })).length,
      1,
    );
    assertEquals(
      (await loadRolePermissions(db, role.id)).map((entry) => entry.id),
      [
        permission.id,
      ],
    );
    await syncRolePermissions(db, role.id, []);
    assertEquals(await loadRolePermissions(db, role.id), []);

    await seedRegisteredAdminPermissions(db, {
      views: {
        custom: {
          slug: "custom",
          permissionKey: "views:custom",
          permissionLabel: "Access Custom",
          permissionDescription: "Open custom view.",
        },
      },
      flows: {
        setup: {
          slug: "setup",
          permissionKey: "flows:setup",
          permissionLabel: "Access Setup",
          permissionDescription: "Access setup flow.",
        },
      },
      widgets: {
        stats: {
          key: "stats",
          permissionKey: "widgets:stats",
          permissionLabel: "Access Stats",
          permissionDescription: "View stats widget.",
        },
      },
    });

    assertEquals(
      (await db.Permission.findMany({
        where: {
          key: { in: ["views:custom", "flows:setup", "widgets:stats"] },
        },
        orderBy: [{ key: "asc" }],
      })).map((entry) => entry.key),
      ["flows:setup", "views:custom", "widgets:stats"],
    );
  });

  it("reuses existing permission definitions and honors explicit or bypass permissions", async () => {
    const db = createAdminTestDatabase();
    const existing = await db.Permission.create({
      key: "users:list",
      label: "Users list",
      resource: "users",
      action: "list",
      description: null,
    });

    const permissionIds = await seedPermissionDefinitions(db, [{
      key: "users:list",
      label: "Users list",
      resource: "users",
      action: "list",
      description: "Existing permission",
    }]);

    assertEquals(permissionIds.get("users:list"), existing.id);
    assertEquals(
      hasAdminPermission(
        {
          bypass: false,
          permissionKeys: new Set(["users:list"]),
        },
        "users:list",
      ),
      true,
    );
    assertEquals(
      hasAdminPermission(
        {
          bypass: true,
          permissionKeys: new Set(),
        },
        "widgets:stats",
      ),
      true,
    );
  });
});
