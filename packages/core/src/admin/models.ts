import type { BoundEntityClass } from "@/db/entity.ts";
import { Entity } from "@/db/entity.ts";
import { field } from "@/db/field.ts";
import { Model } from "@/db/model.ts";
import { relation } from "@/db/relation.ts";
import { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";

/**
 * Role persistence model used by Curio admin RBAC.
 *
 * @remarks
 * `bypass` marks roles such as `superadmin` that skip granular permission
 * checks in the admin authorization layer.
 */
const createRoleModel = (): Model => new Model({
  name: "Role",
  table: "roles",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    key: field.string().required().unique().searchable().sortable(),
    label: field.string().required().searchable().sortable(),
    description: field.text().nullable().default(null),
    bypass: field.boolean().required().default(false).sortable(),
  },
  relations: {
    userRoles: relation.hasMany("UserRole").foreignKey("roleId"),
    rolePermissions: relation.hasMany("RolePermission").foreignKey("roleId"),
  },
  defaultOrder: [{ key: "asc" }],
  labels: {
    singular: "Role",
    plural: "Roles",
  },
});

/** Role persistence model used by Curio admin RBAC. */
export const RoleModel: ReturnType<typeof createRoleModel> = createRoleModel();

/** Hydrated role entity returned by Curio repositories. */
export class RoleEntity extends Entity {
  declare id: string;
  declare key: string;
  declare label: string;
  declare description: string | null;
  declare bypass: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

/** Bound role entity registration for `Database.create(...)`. */
export const Role: BoundEntityClass<typeof RoleModel, RoleEntity> =
  Entity.from(RoleModel) as unknown as BoundEntityClass<
    typeof RoleModel,
    RoleEntity
  >;

/**
 * Permission persistence model used by Curio admin RBAC.
 *
 * @remarks
 * Permissions are stored explicitly rather than inferred at runtime so the
 * admin layer has an auditable source of truth for role grants.
 */
const createPermissionModel = (): Model => new Model({
  name: "Permission",
  table: "permissions",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    key: field.string().required().unique().searchable().sortable(),
    label: field.string().required().searchable().sortable(),
    resource: field.string().required().searchable().sortable(),
    action: field.string().required().searchable().sortable(),
    description: field.text().nullable().default(null),
  },
  relations: {
    rolePermissions: relation.hasMany("RolePermission").foreignKey(
      "permissionId",
    ),
  },
  defaultOrder: [{ key: "asc" }],
  labels: {
    singular: "Permission",
    plural: "Permissions",
  },
});

/** Permission persistence model used by Curio admin RBAC. */
export const PermissionModel: ReturnType<typeof createPermissionModel> =
  createPermissionModel();

/** Hydrated permission entity returned by Curio repositories. */
export class PermissionEntity extends Entity {
  declare id: string;
  declare key: string;
  declare label: string;
  declare resource: string;
  declare action: string;
  declare description: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

/** Bound permission entity registration for `Database.create(...)`. */
export const Permission: BoundEntityClass<
  typeof PermissionModel,
  PermissionEntity
> = Entity.from(PermissionModel) as unknown as BoundEntityClass<
  typeof PermissionModel,
  PermissionEntity
>;

/**
 * User-role join model used by Curio admin RBAC.
 *
 * @remarks
 * The first admin slice uses normalized joins rather than a single role enum
 * on the user row so users can hold multiple roles.
 */
const createUserRoleModel = (): Model => new Model({
  name: "UserRole",
  table: "user_roles",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    userId: field.uuid().required().sortable(),
    roleId: field.uuid().required().sortable(),
  },
  relations: {
    user: relation.belongsTo("User").foreignKey("userId"),
    role: relation.belongsTo("Role").foreignKey("roleId"),
  },
  defaultOrder: [{ createdAt: "desc" }],
  labels: {
    singular: "User role",
    plural: "User roles",
  },
});

/** User-role join model used by Curio admin RBAC. */
export const UserRoleModel: ReturnType<typeof createUserRoleModel> =
  createUserRoleModel();

/** Hydrated user-role entity returned by Curio repositories. */
export class UserRoleEntity extends Entity {
  declare id: string;
  declare userId: string;
  declare roleId: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

/** Bound user-role entity registration for `Database.create(...)`. */
export const UserRole: BoundEntityClass<typeof UserRoleModel, UserRoleEntity> =
  Entity.from(UserRoleModel) as unknown as BoundEntityClass<
    typeof UserRoleModel,
    UserRoleEntity
  >;

/** Role-permission join model used by Curio admin RBAC. */
const createRolePermissionModel = (): Model => new Model({
  name: "RolePermission",
  table: "role_permissions",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    roleId: field.uuid().required().sortable(),
    permissionId: field.uuid().required().sortable(),
  },
  relations: {
    role: relation.belongsTo("Role").foreignKey("roleId"),
    permission: relation.belongsTo("Permission").foreignKey("permissionId"),
  },
  defaultOrder: [{ createdAt: "desc" }],
  labels: {
    singular: "Role permission",
    plural: "Role permissions",
  },
});

/** Role-permission join model used by Curio admin RBAC. */
export const RolePermissionModel: ReturnType<typeof createRolePermissionModel> =
  createRolePermissionModel();

/** Hydrated role-permission entity returned by Curio repositories. */
export class RolePermissionEntity extends Entity {
  declare id: string;
  declare roleId: string;
  declare permissionId: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

/** Bound role-permission entity registration for `Database.create(...)`. */
export const RolePermission: BoundEntityClass<
  typeof RolePermissionModel,
  RolePermissionEntity
> = Entity.from(RolePermissionModel) as unknown as BoundEntityClass<
  typeof RolePermissionModel,
  RolePermissionEntity
>;

/**
 * Session persistence model used by Curio admin auth.
 *
 * @remarks
 * Raw session tokens are never stored directly. The admin auth layer stores a
 * hash in `tokenHash` and keeps the opaque token only in the browser cookie.
 */
const createSessionModel = (): Model => new Model({
  name: "Session",
  table: "sessions",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    userId: field.uuid().required().sortable(),
    tokenHash: field.string().required().unique().hidden().searchable(false),
    ipAddress: field.string().nullable().default(null).searchable(false),
    userAgent: field.text().nullable().default(null).searchable(false),
    expiresAt: field.datetime().required().sortable(),
    lastSeenAt: field.datetime().required().sortable(),
  },
  relations: {
    user: relation.belongsTo("User").foreignKey("userId"),
  },
  defaultOrder: [{ createdAt: "desc" }],
  labels: {
    singular: "Session",
    plural: "Sessions",
  },
});

/** Session persistence model used by Curio admin auth. */
export const SessionModel: ReturnType<typeof createSessionModel> =
  createSessionModel();

/** Hydrated session entity returned by Curio repositories. */
export class SessionEntity extends Entity {
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare expiresAt: Date;
  declare lastSeenAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

/** Bound session entity registration for `Database.create(...)`. */
export const Session: BoundEntityClass<typeof SessionModel, SessionEntity> =
  Entity.from(SessionModel) as unknown as BoundEntityClass<
    typeof SessionModel,
    SessionEntity
  >;

/**
 * Append-only audit event model used by Curio admin.
 *
 * @remarks
 * The first audit slice captures auth and CRUD/admin action history. Records
 * are immutable and exposed read-only in the admin UI.
 */
const createAuditEventModel = (): Model => new Model({
  name: "AuditEvent",
  table: "audit_events",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    actorUserId: field.uuid().nullable().default(null).sortable(),
    eventType: field.string().required().searchable().sortable(),
    resource: field.string().nullable().default(null).searchable().sortable(),
    recordId: field.string().nullable().default(null).sortable(),
    summary: field.text().required().searchable(),
    payload: field.json<Record<string, unknown>>().nullable().default(null),
    ipAddress: field.string().nullable().default(null).searchable(false),
    userAgent: field.text().nullable().default(null).searchable(false),
  },
  relations: {
    actor: relation.belongsTo("User").foreignKey("actorUserId"),
  },
  defaultOrder: [{ createdAt: "desc" }],
  labels: {
    singular: "Audit event",
    plural: "Audit events",
  },
});

/** Append-only audit event model used by Curio admin. */
export const AuditEventModel: ReturnType<typeof createAuditEventModel> =
  createAuditEventModel();

/** Hydrated audit event entity returned by Curio repositories. */
export class AuditEventEntity extends Entity {
  declare id: string;
  declare actorUserId: string | null;
  declare eventType: string;
  declare resource: string | null;
  declare recordId: string | null;
  declare summary: string;
  declare payload: Record<string, unknown> | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

/** Bound audit-event entity registration for `Database.create(...)`. */
export const AuditEvent: BoundEntityClass<
  typeof AuditEventModel,
  AuditEventEntity
> = Entity.from(AuditEventModel) as unknown as BoundEntityClass<
  typeof AuditEventModel,
  AuditEventEntity
>;
