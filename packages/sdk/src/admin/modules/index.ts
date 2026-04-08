export {
  DEFAULT_ADMIN_ROLE_PERMISSION_KEYS,
  DEFAULT_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_KEYS,
} from "@/admin/modules/constants.ts";
export {
  loadRecentAuditEventsForRecord,
  recordAdminAuditEvent,
} from "@/admin/modules/audit.ts";
export {
  authenticateAdminUser,
  createAdminSession,
  DEFAULT_SESSION_SETTINGS,
  destroyAdminSession,
  resolveAdminActor,
  resolveAdminSessionSettings,
} from "@/admin/modules/sessions.ts";
export {
  findExistingSuperadmin,
  hasAdminPermission,
  loadRolePermissions,
  loadUserRoles,
  seedDefaultAdminData,
  seedPermissionDefinitions,
  seedRegisteredAdminPermissions,
  syncRolePermissions,
  syncUserRoles,
} from "@/admin/modules/rbac.ts";
export type {
  AdminActorContext,
  AdminAuditEventRecord,
  AdminDatabase,
  AdminPermissionDefinition,
  AdminPermissionRecord,
  AdminRolePermissionRecord,
  AdminRoleRecord,
  AdminSessionRecord,
  AdminSessionSettings,
  AdminUserRecord,
  AdminUserRoleRecord,
  RegisteredAdminPermissionSource,
} from "@/admin/modules/types.ts";
