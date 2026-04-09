// deno-coverage-ignore-start
export {
  DEFAULT_ADMIN_ROLE_PERMISSION_KEYS,
  DEFAULT_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_KEYS,
} from "@/admin/modules/constants.ts";
import {
  DEFAULT_ADMIN_ROLE_PERMISSION_KEYS,
  DEFAULT_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_KEYS,
} from "@/admin/modules/constants.ts";
import {
  getPermissionRepo,
  getRolePermissionRepo,
  getRoleRepo,
  getUserRepo,
  getUserRoleRepo,
} from "@/admin/modules/repositories.ts";
import type {
  AdminActorContext,
  AdminDatabase,
  AdminPermissionDefinition,
  AdminPermissionRecord,
  AdminRoleRecord,
  AdminUserRecord,
  RegisteredAdminPermissionSource,
} from "@/admin/modules/types.ts";
// deno-coverage-ignore-stop

/**
 * Upserts permission records and returns the resolved IDs keyed by permission key.
 */
export const seedPermissionDefinitions = async (
  db: AdminDatabase,
  definitions: readonly AdminPermissionDefinition[],
): Promise<Map<string, string>> => {
  const permissionRepo = getPermissionRepo(db);
  const permissionIdsByKey = new Map<string, string>();

  for (const definition of definitions) {
    const permission = await permissionRepo.findOne({
      where: { key: definition.key },
    }) ?? await permissionRepo.create({
      key: definition.key,
      label: definition.label,
      resource: definition.resource,
      action: definition.action,
      description: definition.description,
    });

    permissionIdsByKey.set(permission.key, permission.id);
  }

  return permissionIdsByKey;
};

/** Seeds Curio's built-in roles, permissions, and default admin grants. */
export const seedDefaultAdminData = async (
  db: AdminDatabase,
): Promise<void> => {
  await db.transaction(async (database) => {
    const tx = database as AdminDatabase;
    const roleRepo = getRoleRepo(tx);
    const rolePermissionRepo = getRolePermissionRepo(tx);

    const superadminRole = await roleRepo.findOne({
      where: { key: DEFAULT_ROLE_KEYS.superadmin },
    }) ?? await roleRepo.create({
      key: DEFAULT_ROLE_KEYS.superadmin,
      label: "Superadmin",
      description: "Bypasses all admin permission checks.",
      bypass: true,
    });

    const adminRole = await roleRepo.findOne({
      where: { key: DEFAULT_ROLE_KEYS.admin },
    }) ?? await roleRepo.create({
      key: DEFAULT_ROLE_KEYS.admin,
      label: "Admin",
      description: "Built-in admin role focused on user management.",
      bypass: false,
    });

    void superadminRole;

    const permissionIdsByKey = await seedPermissionDefinitions(
      tx,
      DEFAULT_PERMISSION_DEFINITIONS,
    );

    const adminPermissionIds = Array.from(DEFAULT_ADMIN_ROLE_PERMISSION_KEYS)
      .map((permissionKey) => permissionIdsByKey.get(permissionKey))
      .filter((permissionId): permissionId is string => Boolean(permissionId));

    for (const permissionId of adminPermissionIds) {
      const existingJoin = await rolePermissionRepo.findOne({
        where: {
          roleId: adminRole.id,
          permissionId,
        },
      });

      if (!existingJoin) {
        await rolePermissionRepo.create({
          roleId: adminRole.id,
          permissionId,
        });
      }
    }
  });
};

/**
 * Upserts permissions derived from registered admin views, flows, and widgets.
 */
export const seedRegisteredAdminPermissions = async (
  db: AdminDatabase,
  source: RegisteredAdminPermissionSource,
): Promise<void> => {
  const definitions: AdminPermissionDefinition[] = [];

  for (const view of Object.values(source.views ?? {})) {
    definitions.push({
      key: view.permissionKey,
      label: view.permissionLabel,
      resource: "views",
      action: view.slug,
      description: view.permissionDescription,
    });
  }

  for (const flow of Object.values(source.flows ?? {})) {
    definitions.push({
      key: flow.permissionKey,
      label: flow.permissionLabel,
      resource: "flows",
      action: flow.slug,
      description: flow.permissionDescription,
    });
  }

  for (const widget of Object.values(source.widgets ?? {})) {
    definitions.push({
      key: widget.permissionKey,
      label: widget.permissionLabel,
      resource: "widgets",
      action: widget.key,
      description: widget.permissionDescription,
    });
  }

  if (definitions.length === 0) {
    return;
  }

  await seedPermissionDefinitions(db, definitions);
};

/** Loads every role currently assigned to a user. */
export const loadUserRoles = async (
  db: AdminDatabase,
  userId: string,
): Promise<AdminRoleRecord[]> => {
  if (!userId.trim()) {
    return [];
  }

  const userRoleRepo = getUserRoleRepo(db);
  const roleRepo = getRoleRepo(db);
  const roleAssignments = await userRoleRepo.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (roleAssignments.length === 0) {
    return [];
  }

  const roleIds = roleAssignments.map((assignment) => assignment.roleId);

  return await roleRepo.findMany({
    where: {
      id: { in: roleIds },
    },
      orderBy: [{ key: "asc" }],
  });
};

/** Loads every permission currently granted to a role. */
export const loadRolePermissions = async (
  db: AdminDatabase,
  roleId: string,
): Promise<AdminPermissionRecord[]> => {
  if (!roleId.trim()) {
    return [];
  }

  const rolePermissionRepo = getRolePermissionRepo(db);
  const permissionRepo = getPermissionRepo(db);
  const roleAssignments = await rolePermissionRepo.findMany({
    where: { roleId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (roleAssignments.length === 0) {
    return [];
  }

  const permissionIds = roleAssignments.map((assignment) =>
    assignment.permissionId
  );

  return await permissionRepo.findMany({
    where: {
      id: { in: permissionIds },
    },
      orderBy: [{ key: "asc" }],
  });
};

/** Reconciles a user's role assignments against the provided role IDs. */
export const syncUserRoles = async (
  db: AdminDatabase,
  userId: string,
  roleIds: string[],
): Promise<void> => {
  const userRoleRepo = getUserRoleRepo(db);
  const existing = await userRoleRepo.findMany({
    where: { userId },
  });
  const nextRoleIdSet = new Set(roleIds);

  for (const assignment of existing) {
    if (!nextRoleIdSet.has(assignment.roleId)) {
      await userRoleRepo.deleteById(assignment.id);
    }
  }

  const existingRoleIdSet = new Set(
    existing.map((assignment) => assignment.roleId),
  );

  for (const roleId of nextRoleIdSet) {
    if (!existingRoleIdSet.has(roleId)) {
      await userRoleRepo.create({
        userId,
        roleId,
      });
    }
  }
};

/** Reconciles a role's permission assignments against the provided permission IDs. */
export const syncRolePermissions = async (
  db: AdminDatabase,
  roleId: string,
  permissionIds: string[],
): Promise<void> => {
  const rolePermissionRepo = getRolePermissionRepo(db);
  const existing = await rolePermissionRepo.findMany({
    where: { roleId },
  });
  const nextPermissionIdSet = new Set(permissionIds);

  for (const assignment of existing) {
    if (!nextPermissionIdSet.has(assignment.permissionId)) {
      await rolePermissionRepo.deleteById(assignment.id);
    }
  }

  const existingPermissionIdSet = new Set(
    existing.map((assignment) => assignment.permissionId),
  );

  for (const permissionId of nextPermissionIdSet) {
    if (!existingPermissionIdSet.has(permissionId)) {
      await rolePermissionRepo.create({
        roleId,
        permissionId,
      });
    }
  }
};

/** Finds the first user currently assigned the built-in `superadmin` role. */
export const findExistingSuperadmin = async (
  db: AdminDatabase,
): Promise<AdminUserRecord | null> => {
  const roleRepo = getRoleRepo(db);
  const userRoleRepo = getUserRoleRepo(db);
  const userRepo = getUserRepo(db);
  const superadminRole = await roleRepo.findOne({
    where: { key: DEFAULT_ROLE_KEYS.superadmin },
  });

  if (!superadminRole) {
    return null;
  }

  const assignment = await userRoleRepo.findOne({
    where: { roleId: superadminRole.id },
  });

  if (!assignment) {
    return null;
  }

  return await userRepo.findById(assignment.userId);
};

/** Checks whether an admin actor may access a specific permission key. */
export const hasAdminPermission = (
  actor: Pick<AdminActorContext, "bypass" | "permissionKeys"> | null,
  permissionKey: string,
): boolean => {
  if (!actor) {
    return false;
  }

  return actor.bypass || actor.permissionKeys.has(permissionKey);
};
