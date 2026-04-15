# Template

The canonical project template lives at `packages/init/template/default/`.

Optional scaffold fragments live under `packages/init/template/features/` and
are appended when the CLI selects them during an interactive run. The current
feature fragment is `template/features/vscode/`.

It is the canonical reference for the generated Curio project shape.

## Why The Template Matters

Changing files in the template changes what new `@curio/init` runs produce.

That means the template is:

- the source of truth for the generated app shape
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
- editor-specific README guidance

The generated app should point at published JSR import paths by default. In the
workspace, scaffold tests patch those imports to the local core source so the
template can be validated before publish.

## Publish Artifacts

The published init package consumes JSON template bundles generated from the
editable template directories:

- `template/default.bundle.json`
- `template/vscode.bundle.json`

Regenerate them with:

```sh
deno run -A ./packages/init/scripts/sync-template-bundle.ts
```

## Generated App Layout

The default template contains:

- `src/http/api/`: public API routes
- `src/http/admin/`: admin mount
- `src/db/`: DB assembly and tables
- `src/config/`: environment loading and config
- `src/cli/admin/create.ts`: first superadmin bootstrap
- `src/tools/logger/`: default logging helpers

The generated `deno.json` also includes tasks for:

- `start`
- `dev`
- `check`
- `db:up`
- `db:down`
- `db:reset`
- `db:logs`
- `admin:create`

The generated README also includes a first-time configuration section that
highlights the `admin:create` bootstrap flow for the first `superadmin`.

## Current Runtime Choices

The default template is intentionally opinionated:

- Oak for HTTP
- Valibot for schema validation
- Drizzle plus Postgres for persistence
- Curio admin mounted directly in the backend

These are the Curio happy-path defaults. They do not mean the core package
itself is locked forever to those exact integrations.
