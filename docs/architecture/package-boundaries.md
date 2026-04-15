# Package Boundaries

Package boundaries matter in Curio because the reusable framework package and
the scaffolding CLI are deliberately not the same product.

## `packages/core` / `@curio/core`

`packages/core` publishes `@curio/core`, the reusable framework package.

It is the place for:

- stable framework contracts
- HTTP primitives
- DB primitives
- admin runtime
- focused admin modules
- opt-in integrations like Drizzle and OpenAPI

It should not depend on `packages/init`.

## `packages/init` / `@curio/init`

`packages/init` publishes `@curio/init`, the scaffolding CLI.

It is the place for:

- argument parsing
- template selection
- file copying
- placeholder replacement
- scaffold-oriented tests

It should not pretend to be a runtime framework package.

## Template Boundary

Inside `packages/init`, the template is a separate concern from the CLI code.

- `src/`: code that generates a project
- `template/default/`: the generated project itself
- `template/features/`: optional scaffold fragments layered on top of the
  canonical template

When deciding where a file belongs, use this rule:

- if the file generates a project, it belongs in `src/`
- if the file is part of the generated project, it belongs in `template/`

## Admin Boundary

Inside `@curio/core`, the admin surface is also intentionally split:

- `@curio/core/admin`: runtime, config types, built-in admin models
- `@curio/core/admin/modules/*`: focused Curio-shipped modules layered on top

That split prevents opinionated admin helpers from bloating the runtime
entrypoint.

## Public Surface Rule

If an abstraction is not yet intended to be stable, it should stay internal.

That is why Curio avoids leaking:

- testing internals
- metadata symbols
- implementation-only helpers
- transport-specific defaults from adapter-agnostic entrypoints
