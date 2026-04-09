# Auth

`@curio/core/auth` is intentionally narrow.

It currently exposes only password hashing helpers and the password hasher
contract used by Curio-generated apps.

## Public API

- `hashPassword(...)`
- `verifyPassword(...)`
- `passwordHasher`
- `PasswordHasher`

## Example

```ts
import { hashPassword, verifyPassword } from "@curio/core/auth";

const passwordHash = await hashPassword("correct horse battery staple");
const isValid = await verifyPassword(
  "correct horse battery staple",
  passwordHash,
);
```

## Why It Stays Small

Auth is a broad domain. Curio does not currently try to publish a complete auth
framework under this entrypoint.

The admin login flow is built by combining:

- `@curio/core/auth` for password verification
- `@curio/core/admin/modules/sessions` for session lifecycle
- `@curio/core/admin/modules/rbac` for role and permission checks

That keeps the public auth surface stable and easy to understand.
