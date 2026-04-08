# Init

`@curio/init` is Curio's scaffolding CLI.

Its job is to assemble a fresh Curio project from the canonical template. It is
not the framework itself.

## Package Role

`@curio/init` should stay minimal:

- parse scaffold arguments
- resolve the target directory
- copy the selected template
- replace Curio placeholders
- print next steps

It should not become a second SDK entrypoint or a runtime package that users
import from inside their application code.

## CLI Usage

Published usage:

```sh
deno run -Ar jsr:@curio/init my-app
```

Workspace usage:

```sh
deno task init -- my-app
```

## Supported Flags

- `--name <name>`: override the generated display name
- `--template <name>`: select a template, currently only `default`
- `--force`: allow scaffolding into an existing non-empty directory
- `-h`, `--help`: show the help output

## Internal Layout

`packages/init` has two responsibilities:

- `src/`: the scaffolding CLI
- `template/default/`: the canonical generated project

The template is the reference source of truth for newly generated Curio apps.

## Testing Strategy

The init package is validated in two ways:

- package-level checking and unit tests
- scaffold smoke tests that generate a project and run its checks

Inside the workspace, scaffold smoke tests patch the generated app to use the
local SDK implementation. That keeps `@curio/init` verifiable before the SDK is
published to JSR.

## Related Docs

- [Template](template.md)
- [Getting Started](../getting-started/create-a-project.md)
- [Architecture: Package Boundaries](../architecture/package-boundaries.md)
