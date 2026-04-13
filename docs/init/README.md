# Init Package Overview

`@curio/init` is Curio's scaffolding CLI. Its job is to assemble a fresh Curio
project from the canonical template without becoming part of the generated
app's runtime surface.

If you are looking for the runtime package that generated apps import from, use
the `@curio/core` docs instead. `@curio/init` only owns project creation.

## Installation And Usage

Published usage:

```sh
deno run -Ar jsr:@curio/init my-app
```

Workspace usage:

```sh
deno task init -- my-app
```

## What Init Owns

- argument parsing and help output
- target directory resolution
- template copying
- Curio placeholder replacement
- next-step instructions after scaffold

It should not become a second framework package that applications import from at
runtime.

## Supported Flags

- `--name <name>`: override the generated display name
- `--template <name>`: select a template, currently only `default`
- `--force`: allow scaffolding into an existing non-empty directory
- `-h`, `--help`: show the help output

## Internal Layout

`packages/init` has two responsibilities:

- `src/`: scaffolding CLI code
- `template/default/`: the canonical generated project

The template is the source of truth for what new Curio apps should look like.

## Testing Strategy

The init package is validated through:

- package-level checks
- CLI tests
- scaffold smoke tests that generate a project and run its checks

Inside the workspace, scaffold smoke tests patch the generated app to use the
local `@curio/core` implementation. That keeps `@curio/init` verifiable before
`@curio/core` is published.

## Next Steps

- [Template](template.md)
- [Create a Project](../getting-started/create-a-project.md)
- [Package Boundaries](../architecture/package-boundaries.md)
