export { User, UserEntity, UserModel } from "@/db/tables/user.ts";

export {
  AuditEvent,
  AuditEventEntity,
  AuditEventModel,
  Permission,
  PermissionEntity,
  PermissionModel,
  Role,
  RoleEntity,
  RoleModel,
  RolePermission,
  RolePermissionEntity,
  RolePermissionModel,
  Session,
  SessionEntity,
  SessionModel,
  UserRole,
  UserRoleEntity,
  UserRoleModel,
} from "@curio/sdk/admin";

import { User } from "@/db/tables/user.ts";
import {
  AuditEvent,
  Permission,
  Role,
  RolePermission,
  Session,
  UserRole,
} from "@curio/sdk/admin";

/** Full backend table registry consumed by `Database.create(...)`. */
export const databaseTables = {
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  Session,
  AuditEvent,
} as const;
