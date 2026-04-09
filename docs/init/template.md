# Template

The default template lives at `packages/init/template/default/`.

It is the canonical reference for the generated Curio app shape.

## Why The Template Matters

Changing files in the template changes what new `@curio/init` runs produce.

That means the template is:

- the source of truth for the starter app shape
- the basis for scaffold tests
- the concrete example of Curio's intended happy path

There is intentionally no separate hand-maintained example app outside the
template.

## Placeholder Replacement

During scaffolding, init replaces placeholders such as:

- project name
- project slug
- database identifier
- core package import specifiers

The generated app should point at published JSR import paths by default. In the
workspace, scaffold tests patch those imports to the local core source so the
template can be validated before publish.

## Generated App Layout

The default template contains:

- `src/http/api/`: public API routes
- `src/http/admin/`: admin mount
- `src/db/`: DB assembly and tables
- `src/config/`: environment loading and config
- `src/cli/admin/create.ts`: first superadmin bootstrap
- `src/tools/logger/`: starter logging helpers

The generated `deno.json` also includes tasks for:

- `start`
- `dev`
- `check`
- `db:up`
- `db:down`
- `db:reset`
- `db:logs`
- `admin:create`

## Current Runtime Choices

The default template is intentionally opinionated:

- Oak for HTTP
- Valibot for schema validation
- Drizzle plus Postgres for persistence
- Curio admin mounted directly in the backend

These are the Curio happy-path defaults. They do not mean the core package itself is
locked forever to those exact integrations.
