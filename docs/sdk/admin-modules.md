# Admin Modules

Curio separates the admin runtime from Curio-shipped modules layered on top of
it.

This keeps `@curio/sdk/admin` focused on the runtime while leaving opinionated
behavior in focused subpaths.

## Public Module Paths

- `@curio/sdk/admin/modules/rbac`
- `@curio/sdk/admin/modules/sessions`
- `@curio/sdk/admin/modules/audit`

There is intentionally no aggregate `@curio/sdk/admin/modules` barrel.

## Why Modules Exist

Modules represent Curio-shipped building blocks that should be:

- easy to plug into the admin runtime
- useful out of the box
- composable with minimal configuration
- narrow enough to evolve independently

This structure leaves room for future Curio-shipped modules without turning the
admin entrypoint into a dumping ground.

## RBAC Module

`@curio/sdk/admin/modules/rbac` provides:

- built-in role keys
- built-in permission definitions
- default admin grants
- seeding helpers
- role and permission loading helpers

Common entrypoints:

- `seedDefaultAdminData(...)`
- `seedRegisteredAdminPermissions(...)`
- `loadUserRoles(...)`
- `loadRolePermissions(...)`

The default template uses `seedDefaultAdminData(...)` while preparing the
database.

## Sessions Module

`@curio/sdk/admin/modules/sessions` provides:

- session settings defaults
- session creation and destruction
- admin actor resolution
- admin authentication against stored password hashes

Common entrypoints:

- `resolveAdminSessionSettings(...)`
- `createAdminSession(...)`
- `destroyAdminSession(...)`
- `resolveAdminActor(...)`
- `authenticateAdminUser(...)`

## Audit Module

`@curio/sdk/admin/modules/audit` provides:

- append-only audit event recording
- recent audit lookup helpers for resource pages

Common entrypoints:

- `recordAdminAuditEvent(...)`
- `loadRecentAuditEventsForRecord(...)`

## Module Design Rules

As Curio adds more modules, they should follow the same constraints:

- additive rather than invasive
- namespaced and conflict-aware
- composable with other modules
- useful with minimal configuration
- separate from the admin runtime core

If two modules would introduce conflicting resource keys, permission keys, or
runtime behaviors, Curio should reject that explicitly rather than silently
merging them.
