# Admin

The Curio admin is one of the framework's core product surfaces.

It is intentionally:

- server-rendered
- mounted directly in the backend
- integrated with Curio repositories
- opinionated about operational workflows

It is not designed as a separate SPA frontend.

## Public Runtime Surface

`@curio/sdk/admin` contains:

- the `Admin` runtime
- admin config types
- built-in admin models

It does not contain the focused RBAC, session, or audit helper modules. Those
live under `@curio/sdk/admin/modules/*`.

## Minimal Mount

```ts
import { Admin } from "@curio/sdk/admin";
import { db } from "@/db/index.ts";

export const admin = Admin.create({
  db,
  presets: ["default"],
  branding: {
    name: "My App Admin",
    tagline: "Control room.",
  },
});
```

The generated template mounts the admin at `/admin`.

## Runtime Model

The admin runtime assembles:

- resources
- views
- flows
- widgets
- presets
- components and rendering overrides
- actor and permission checks

### Resources

Resources model CRUD-oriented admin entities backed by repositories.

Typical responsibilities:

- labels
- fields
- filters
- list/detail/form behavior
- action gating
- navigation visibility

### Views

Views are read-oriented admin pages that are not bound to a single CRUD
resource.

Use views for:

- dashboards
- reports
- status screens
- read-heavy operational pages

### Flows

Flows are custom admin workflows with request handling and submission logic.

Use flows when you need:

- approvals
- multi-step actions
- account or credential management
- operational tasks that are not clean CRUD

### Widgets

Widgets feed the dashboard and other admin surfaces with compact operational
blocks.

## Built-In Admin Models

The admin package includes the built-in models used by Curio's admin modules:

- `Role`
- `Permission`
- `RolePermission`
- `UserRole`
- `Session`
- `AuditEvent`

These models exist on the runtime side because they are foundational admin data
types, not just convenience helpers.

## Presets

Presets group together Curio-shipped admin configuration. The generated
template uses:

```ts
presets: ["default"]
```

The default preset wires the built-in admin resources and pages needed for the
starter admin experience.

## Important Admin Rules

- the admin talks to repositories directly, not through public API routes
- the admin remains backend-mounted and server-rendered
- permission checks should fail closed
- custom pages should integrate with the runtime instead of bypassing it
- opinionated modules should stay separate from the runtime core

## Related Docs

- [Admin Modules](admin-modules.md)
- [Architecture: Package Boundaries](../architecture/package-boundaries.md)
- [Architecture: Extension Points](../architecture/extension-points.md)
