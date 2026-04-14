# Curio Init

<p>
  <a href="https://jsr.io/@curio/init">
    <img src="https://jsr.io/badges/@curio/init" alt="@curio/init on JSR" />
  </a>
  <a href="https://jsr.io/@curio/init">
    <img src="https://jsr.io/badges/@curio/init/total-downloads" alt="@curio/init total downloads" />
  </a>
</p>

`@curio/init` is Curio's project bootstrap tool.

[Workspace Docs](https://fifo-docs.gitbook.io/curio/init) |
[Architecture Notes](https://fifo-docs.gitbook.io/curio/architecture/overview)

Run it like this:

```sh
deno run -Ar jsr:@curio/init my-app
```

When the command runs in an interactive terminal, it asks which IDE you use:

- `VS Code`: adds `.vscode/settings.json`, `.vscode/extensions.json`, and a Deno
  workspace note in the generated README
- `Other`: skips editor-specific files and keeps the scaffold generic

The package is intentionally separate from `@curio/core`:

- `@curio/core` is the reusable framework
- `@curio/init` assembles a new app from the default template

## Package Layout

`packages/init` now has two responsibilities:

- `src/`: scaffold CLI code
- `template/default/`: the canonical project template copied into new projects
- `template/features/`: optional template fragments that the CLI can append
  based on interactive choices

The template is the source of truth for what newly generated projects look like.
Changing files under `template/default/` changes the scaffold output.

`template/default.bundle.json` and `template/vscode.bundle.json` are the
publish-time artifacts consumed by the runtime package on JSR. If you change the
editable template directories, regenerate the bundles before publishing:

```sh
deno run -A ./scripts/sync-template-bundle.ts
```

## Local Development

From `packages/init/`:

```sh
deno task check
deno task lint
deno task test
deno task init
```

From the repo root:

```sh
deno lint
deno task check
deno task test
deno coverage .coverage
deno task init -- my-app
```

## Testing Strategy

The init package is validated by:

- checking the CLI package itself
- scaffolding a fresh project into a temp directory
- patching the generated project's core imports to local workspace paths
- running the generated project's `deno task check`

That keeps the scaffold testable before `@curio/core` is published.
