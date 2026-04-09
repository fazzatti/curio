import type { Entity } from "@/db/entity.ts";
import type { RawRecord } from "@/db/types.ts";

/** Explicit permission record seeded by Curio admin presets or runtime surfaces. */
export type AdminPermissionDefinition = {
  key: string;
  label: string;
  resource: string;
  action: string;
  description: string;
};

/** Permission-like metadata derived from registered admin views, flows, and widgets. */
export type RegisteredAdminPermissionSource = {
  views?: Record<string, {
    permissionKey: string;
    permissionLabel: string;
    permissionDescription: string;
    slug: string;
  }>;
  flows?: Record<string, {
    permissionKey: string;
    permissionLabel: string;
    permissionDescription: string;
    slug: string;
  }>;
  widgets?: Record<string, {
    permissionKey: string;
    permissionLabel: string;
    permissionDescription: string;
    key: string;
  }>;
};

/** Session settings accepted by Curio admin. */
export type AdminSessionSettings = {
  cookieName: string;
  ttlMs: number;
  rolling: boolean;
  sameSite: "Strict" | "Lax";
};

/** Runtime auth snapshot resolved for an admin request. */
export type AdminActorContext<
  TUser extends Entity = Entity,
  TRole extends Entity = Entity,
  TPermission extends Entity = Entity,
  TSession extends Entity = Entity,
> = {
  user: TUser;
  roles: TRole[];
  permissions: TPermission[];
  session: TSession;
  permissionKeys: Set<string>;
  bypass: boolean;
};

/** Minimal admin database contract expected by Curio's built-in admin modules. */
export type AdminDatabase = Record<string, unknown> & {
  User: unknown;
  Role: unknown;
  Permission: unknown;
  UserRole: unknown;
  RolePermission: unknown;
  Session: unknown;
  AuditEvent: unknown;
  transaction<TResult>(
    operation: (database: unknown) => Promise<TResult>,
  ): Promise<TResult>;
};

/** Minimal user entity shape expected by Curio's built-in admin modules. */
export type AdminUserRecord = Entity & {
  id: string;
  email: string;
  passwordHash: string;
};

/** Minimal role entity shape expected by Curio's built-in admin modules. */
export type AdminRoleRecord = Entity & {
  id: string;
  key: string;
  label: string;
  bypass: boolean;
};

/** Minimal permission entity shape expected by Curio's built-in admin modules. */
export type AdminPermissionRecord = Entity & {
  id: string;
  key: string;
  label: string;
  resource: string;
  action: string;
  description: string | null;
};

/** Minimal user-role join shape expected by Curio's built-in admin modules. */
export type AdminUserRoleRecord = Entity & {
  id: string;
  userId: string;
  roleId: string;
};

/** Minimal role-permission join shape expected by Curio's built-in admin modules. */
export type AdminRolePermissionRecord = Entity & {
  id: string;
  roleId: string;
  permissionId: string;
};

/** Minimal session entity shape expected by Curio's built-in admin modules. */
export type AdminSessionRecord = Entity & {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  updatedAt: Date;
};

/** Minimal audit-event shape expected by Curio's built-in admin modules. */
export type AdminAuditEventRecord = Entity & {
  id: string;
  actorUserId: string | null;
  eventType: string;
  resource: string | null;
  recordId: string | null;
  summary: string;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

/** Narrow repository contract consumed by Curio's built-in admin modules. */
export type RepositoryLike<
  TEntity extends Entity,
  TInput extends RawRecord = RawRecord,
> = {
  findById(id: string): Promise<TEntity | null>;
  getById(id: string): Promise<TEntity>;
  findOne(options?: {
    where?: RawRecord;
    orderBy?: Array<Record<string, "asc" | "desc">>;
  }): Promise<TEntity | null>;
  findMany(options?: {
    where?: RawRecord;
    orderBy?: Array<Record<string, "asc" | "desc">>;
    limit?: number;
    offset?: number;
  }): Promise<TEntity[]>;
  create(input: TInput): Promise<TEntity>;
  updateById(id: string, input: Partial<TInput>): Promise<TEntity>;
  deleteById(id: string): Promise<TEntity>;
};
