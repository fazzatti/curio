# Curio Init

`@curio/init` is Curio's project bootstrap tool.

Run it like this:

```sh
deno run -Ar jsr:@curio/init my-app
```

The package is intentionally separate from `@curio/core`:

- `@curio/core` is the reusable framework
- `@curio/init` assembles a new app from the default template

## Package Layout

`packages/init` now has two responsibilities:

- `src/`: scaffold CLI code
- `template/default/`: the canonical project template copied into new projects

The template is the source of truth for what newly generated projects look like.
Changing files under `template/default/` changes the scaffold output.

## Local Development

From `packages/init/`:

```sh
deno task check
deno task test
deno task coverage
deno task init
```

From the repo root:

```sh
deno task check:init
deno task test:init
deno task coverage:init
deno task init -- my-app
```

## Testing Strategy

The init package is validated by:

- checking the CLI package itself
- scaffolding a fresh project into a temp directory
- patching the generated project's core imports to local workspace paths
- running the generated project's `deno task check`

That keeps the scaffold testable before `@curio/core` is published.
