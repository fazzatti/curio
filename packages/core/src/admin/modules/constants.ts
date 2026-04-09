import type {
  AdminPermissionDefinition,
  AdminSessionSettings,
} from "@/admin/modules/types.ts";

/** Built-in role keys seeded by Curio's default admin preset. */
export const DEFAULT_ROLE_KEYS = {
  superadmin: "superadmin",
  admin: "admin",
} as const;

/** Built-in permission records known by the first Curio admin slice. */
export const DEFAULT_PERMISSION_DEFINITIONS:
  readonly AdminPermissionDefinition[] = [
    {
      key: "users:list",
      label: "List users",
      resource: "users",
      action: "list",
      description: "View the users list in the admin.",
    },
    {
      key: "users:view",
      label: "View users",
      resource: "users",
      action: "view",
      description: "Open individual user records in the admin.",
    },
    {
      key: "users:create",
      label: "Create users",
      resource: "users",
      action: "create",
      description: "Create new users from the admin.",
    },
    {
      key: "users:update",
      label: "Update users",
      resource: "users",
      action: "update",
      description: "Edit existing users from the admin.",
    },
    {
      key: "users:delete",
      label: "Delete users",
      resource: "users",
      action: "delete",
      description: "Delete users from the admin.",
    },
    {
      key: "users:reset_password",
      label: "Reset user passwords",
      resource: "users",
      action: "reset_password",
      description: "Reset user passwords from the admin.",
    },
    {
      key: "roles:list",
      label: "List roles",
      resource: "roles",
      action: "list",
      description: "View the roles list in the admin.",
    },
    {
      key: "roles:view",
      label: "View roles",
      resource: "roles",
      action: "view",
      description: "Open individual roles in the admin.",
    },
    {
      key: "roles:create",
      label: "Create roles",
      resource: "roles",
      action: "create",
      description: "Create roles from the admin.",
    },
    {
      key: "roles:update",
      label: "Update roles",
      resource: "roles",
      action: "update",
      description: "Edit roles from the admin.",
    },
    {
      key: "roles:delete",
      label: "Delete roles",
      resource: "roles",
      action: "delete",
      description: "Delete roles from the admin.",
    },
    {
      key: "permissions:list",
      label: "List permissions",
      resource: "permissions",
      action: "list",
      description: "View the permissions list in the admin.",
    },
    {
      key: "permissions:view",
      label: "View permissions",
      resource: "permissions",
      action: "view",
      description: "Open individual permissions in the admin.",
    },
    {
      key: "permissions:create",
      label: "Create permissions",
      resource: "permissions",
      action: "create",
      description: "Create permissions from the admin.",
    },
    {
      key: "permissions:update",
      label: "Update permissions",
      resource: "permissions",
      action: "update",
      description: "Edit permissions from the admin.",
    },
    {
      key: "permissions:delete",
      label: "Delete permissions",
      resource: "permissions",
      action: "delete",
      description: "Delete permissions from the admin.",
    },
    {
      key: "sessions:list",
      label: "List sessions",
      resource: "sessions",
      action: "list",
      description: "View active admin sessions in the admin.",
    },
    {
      key: "sessions:view",
      label: "View sessions",
      resource: "sessions",
      action: "view",
      description: "Open individual sessions in the admin.",
    },
    {
      key: "audit:list",
      label: "List audit events",
      resource: "audit",
      action: "list",
      description: "View the audit stream in the admin.",
    },
    {
      key: "audit:view",
      label: "View audit events",
      resource: "audit",
      action: "view",
      description: "Open individual audit events in the admin.",
    },
    {
      key: "widgets:users",
      label: "Access Users",
      resource: "widgets",
      action: "users",
      description: "View the Users widget on the admin dashboard.",
    },
    {
      key: "widgets:roles",
      label: "Access Roles",
      resource: "widgets",
      action: "roles",
      description: "View the Roles widget on the admin dashboard.",
    },
    {
      key: "widgets:permissions",
      label: "Access Permissions",
      resource: "widgets",
      action: "permissions",
      description: "View the Permissions widget on the admin dashboard.",
    },
    {
      key: "widgets:sessions",
      label: "Access Sessions",
      resource: "widgets",
      action: "sessions",
      description: "View the Sessions widget on the admin dashboard.",
    },
    {
      key: "widgets:audit",
      label: "Access Audit",
      resource: "widgets",
      action: "audit",
      description: "View the Audit widget on the admin dashboard.",
    },
  ] as const;

/** Fixed default permission bundle granted to the built-in `admin` role. */
export const DEFAULT_ADMIN_ROLE_PERMISSION_KEYS: ReadonlySet<string> = new Set([
  "users:list",
  "users:view",
  "users:create",
  "users:update",
  "users:delete",
  "users:reset_password",
  "roles:list",
  "roles:view",
  "permissions:list",
  "permissions:view",
  "widgets:users",
  "widgets:roles",
  "widgets:permissions",
]);

/** Default cookie/session settings used by Curio's built-in admin sessions module. */
export const DEFAULT_SESSION_SETTINGS: AdminSessionSettings = {
  cookieName: "curio_admin_session",
  ttlMs: 1000 * 60 * 60 * 24 * 7,
  rolling: true,
  sameSite: "Strict",
};
