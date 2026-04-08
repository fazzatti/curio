# Curio

Curio is a Deno-native backend toolkit organized as a monorepo.

The repo currently contains two packages:

- [`packages/sdk`](./packages/sdk): the reusable framework package, intended for
  JSR publication as `@curio/sdk`
- [`packages/init`](./packages/init): the bootstrap CLI package that scaffolds a
  new Curio app from its canonical template

Documentation lives in [`docs/`](./docs). The GitBook site should sync from
that directory.

For repository-level design intent, start with:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Workspace Tasks

From the repo root:

```sh
deno task check
deno task test:unit
deno task test:init
deno task coverage
deno task init -- my-app
```

## Current Status

- `packages/sdk` is the package closest to publishability
- `packages/init/template/default/` is the canonical generated app template
- `packages/sdk/src/OLD-reference/` is legacy prototype material and should not
  be treated as current architecture
- `docs/` is the canonical documentation tree for GitBook and repository docs

The immediate goal is to harden and publish the SDK first, then rewire
`packages/init` against the published package.
