import type {
  AdminAuditEventRecord,
  AdminDatabase,
  AdminPermissionRecord,
  AdminRolePermissionRecord,
  AdminRoleRecord,
  AdminSessionRecord,
  AdminUserRecord,
  AdminUserRoleRecord,
  RepositoryLike,
} from "@/admin/modules/types.ts";

export const getUserRepo = (
  db: AdminDatabase,
): RepositoryLike<AdminUserRecord, {
  id?: string;
  email: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}> => {
  return db.User as unknown as RepositoryLike<AdminUserRecord, {
    id?: string;
    email: string;
    passwordHash: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};

export const getRoleRepo = (
  db: AdminDatabase,
): RepositoryLike<AdminRoleRecord, {
  id?: string;
  key: string;
  label: string;
  description?: string | null;
  bypass?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}> => {
  return db.Role as unknown as RepositoryLike<AdminRoleRecord, {
    id?: string;
    key: string;
    label: string;
    description?: string | null;
    bypass?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};

export const getPermissionRepo = (
  db: AdminDatabase,
): RepositoryLike<AdminPermissionRecord, {
  id?: string;
  key: string;
  label: string;
  resource: string;
  action: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}> => {
  return db.Permission as unknown as RepositoryLike<AdminPermissionRecord, {
    id?: string;
    key: string;
    label: string;
    resource: string;
    action: string;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};

export const getUserRoleRepo = (
  db: AdminDatabase,
): RepositoryLike<AdminUserRoleRecord, {
  id?: string;
  userId: string;
  roleId: string;
  createdAt?: Date;
  updatedAt?: Date;
}> => {
  return db.UserRole as unknown as RepositoryLike<AdminUserRoleRecord, {
    id?: string;
    userId: string;
    roleId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};

export const getRolePermissionRepo = (
  db: AdminDatabase,
): RepositoryLike<AdminRolePermissionRecord, {
  id?: string;
  roleId: string;
  permissionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}> => {
  return db.RolePermission as unknown as RepositoryLike<
    AdminRolePermissionRecord,
    {
      id?: string;
      roleId: string;
      permissionId: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  >;
};

export const getSessionRepo = (
  db: AdminDatabase,
): RepositoryLike<AdminSessionRecord, {
  id?: string;
  userId: string;
  tokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  lastSeenAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}> => {
  return db.Session as unknown as RepositoryLike<AdminSessionRecord, {
    id?: string;
    userId: string;
    tokenHash: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    expiresAt: Date;
    lastSeenAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};

export const getAuditRepo = (
  db: AdminDatabase,
): RepositoryLike<AdminAuditEventRecord, {
  id?: string;
  actorUserId?: string | null;
  eventType: string;
  resource?: string | null;
  recordId?: string | null;
  summary: string;
  payload?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}> => {
  return db.AuditEvent as unknown as RepositoryLike<AdminAuditEventRecord, {
    id?: string;
    actorUserId?: string | null;
    eventType: string;
    resource?: string | null;
    recordId?: string | null;
    summary: string;
    payload?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};
