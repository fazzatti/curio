/**
 * Server-rendered Curio admin entrypoint.
 *
 * @remarks
 * Import from `@curio/core/admin` when you want the admin runtime, its config
 * types, and the built-in admin models. Curio-shipped modules that layer on
 * top of the runtime live under `@curio/core/admin/modules/*`.
 */
export { Admin } from "@/admin/core/admin.tsx";
export type {
  AdminComponentOverrides,
  AdminCreateInput,
  AdminDashboardWidgetConfig,
  AdminDashboardWidgetRegistration,
  AdminFieldAccessConfig,
  AdminFieldWidgetOverride,
  AdminFilterConfig,
  AdminFlowConfig,
  AdminFlowRegistration,
  AdminFlowRenderProps,
  AdminFlowSubmitArgs,
  AdminFlowSubmitResult,
  AdminPresetConfig,
  AdminPresetInput,
  AdminResourceConfig,
  AdminResourceRegistration,
  AdminViewConfig,
  AdminViewRegistration,
  AdminWidgetRendererProps,
} from "@/admin/core/types.ts";
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
} from "@/admin/models.ts";
