/**
 * Built-in admin session module helpers.
 *
 * @module
 *
 * @remarks
 * This entrypoint exposes Curio's default session settings plus the helpers
 * used to authenticate, resolve, and revoke admin sessions.
 */
import { verifyPassword } from "@/auth/password.ts";
import {
  DEFAULT_ROLE_KEYS,
  DEFAULT_SESSION_SETTINGS as CORE_DEFAULT_SESSION_SETTINGS,
} from "@/admin/modules/constants.ts";
import { createOpaqueToken, sha256Hex } from "@/admin/modules/crypto.ts";
import {
  getPermissionRepo,
  getRolePermissionRepo,
  getSessionRepo,
  getUserRepo,
} from "@/admin/modules/repositories.ts";
import { loadUserRoles } from "@/admin/modules/rbac.ts";
import type {
  AdminActorContext,
  AdminDatabase,
  AdminPermissionRecord,
  AdminRoleRecord,
  AdminSessionRecord,
  AdminSessionSettings,
  AdminUserRecord,
} from "@/admin/modules/types.ts";

/** Session settings shape used by Curio's admin session helpers. */
export type { AdminSessionSettings } from "@/admin/modules/types.ts";

/** Built-in session defaults shipped with Curio's admin session module. */
export const DEFAULT_SESSION_SETTINGS: AdminSessionSettings =
  CORE_DEFAULT_SESSION_SETTINGS;

/** Merges session overrides with Curio's built-in admin session defaults. */
export const resolveAdminSessionSettings = (
  overrides?: Partial<AdminSessionSettings>,
): AdminSessionSettings => ({
  ...DEFAULT_SESSION_SETTINGS,
  ...overrides,
});

/**
 * Creates a new admin session and returns the opaque browser token.
 *
 * @remarks
 * The raw token is never stored directly. Curio stores only its hash in the
 * session repository and returns the opaque token for cookie storage.
 */
export const createAdminSession = async (
  db: AdminDatabase,
  input: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
  settings: AdminSessionSettings,
): Promise<{ token: string; session: AdminSessionRecord }> => {
  const token = createOpaqueToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.ttlMs);
  const session = await getSessionRepo(db).create({
    userId: input.userId,
    tokenHash,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    expiresAt,
    lastSeenAt: now,
  });

  return { token, session };
};

/**
 * Destroys an admin session identified by the opaque browser token.
 *
 * @remarks
 * Missing or unknown tokens are ignored.
 */
export const destroyAdminSession = async (
  db: AdminDatabase,
  token: string | null | undefined,
): Promise<void> => {
  if (!token) {
    return;
  }

  const tokenHash = await sha256Hex(token);
  const session = await getSessionRepo(db).findOne({
    where: { tokenHash },
  });

  if (!session) {
    return;
  }

  await getSessionRepo(db).deleteById(session.id);
};

/**
 * Resolves the current admin actor from an opaque session token.
 *
 * @remarks
 * Expired or orphaned sessions are cleaned up automatically. When rolling
 * sessions are enabled, successful resolution also extends the session TTL.
 */
export const resolveAdminActor = async (
  db: AdminDatabase,
  token: string | null | undefined,
  settings: AdminSessionSettings,
): Promise<
  AdminActorContext<
    AdminUserRecord,
    AdminRoleRecord,
    AdminPermissionRecord,
    AdminSessionRecord
  > | null
> => {
  if (!token) {
    return null;
  }

  const tokenHash = await sha256Hex(token);
  const sessionRepo = getSessionRepo(db);
  const session = await sessionRepo.findOne({
    where: { tokenHash },
  });

  if (!session) {
    return null;
  }

  const now = new Date();

  if (session.expiresAt.getTime() <= now.getTime()) {
    await sessionRepo.deleteById(session.id);
    return null;
  }

  const user = await getUserRepo(db).findById(session.userId);

  if (!user) {
    await sessionRepo.deleteById(session.id);
    return null;
  }

  const roles = await loadUserRoles(db, user.id);
  const bypass = roles.some((role) =>
    role.bypass || role.key === DEFAULT_ROLE_KEYS.superadmin
  );

  const roleIds = roles.map((role) => role.id);
  const rolePermissions = roleIds.length === 0
    ? []
    : await getRolePermissionRepo(db).findMany({
      where: {
        roleId: { in: roleIds },
      },
    });
  const permissionIds = [
    ...new Set(rolePermissions.map((entry) => entry.permissionId)),
  ];
  const permissions = permissionIds.length === 0
    ? []
    : await getPermissionRepo(db).findMany({
      where: {
        id: { in: permissionIds },
      },
      orderBy: [{ key: "asc" }],
    });
  const permissionKeys = new Set(
    permissions.map((permission) => permission.key),
  );

  if (!bypass && permissionKeys.size === 0) {
    return null;
  }

  if (settings.rolling) {
    await sessionRepo.updateById(session.id, {
      expiresAt: new Date(now.getTime() + settings.ttlMs),
      lastSeenAt: now,
      updatedAt: now,
    });
  }

  const nextSession = await sessionRepo.getById(session.id);

  return {
    user,
    roles,
    permissions,
    session: nextSession,
    permissionKeys,
    bypass,
  };
};

/**
 * Authenticates an admin user and creates a fresh admin session.
 *
 * @returns A token plus resolved admin actor on success, otherwise `null`.
 */
export const authenticateAdminUser = async (
  db: AdminDatabase,
  email: string,
  password: string,
  settings: AdminSessionSettings,
  input: {
    ipAddress?: string | null;
    userAgent?: string | null;
  } = {},
): Promise<
  {
    token: string;
    actor: AdminActorContext<
      AdminUserRecord,
      AdminRoleRecord,
      AdminPermissionRecord,
      AdminSessionRecord
    >;
  } | null
> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return null;
  }

  const user = await getUserRepo(db).findOne({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  const { token } = await createAdminSession(
    db,
    {
      userId: user.id,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    settings,
  );
  const actor = await resolveAdminActor(db, token, settings);

  if (!actor) {
    await destroyAdminSession(db, token);
    return null;
  }

  return {
    token,
    actor,
  };
};
