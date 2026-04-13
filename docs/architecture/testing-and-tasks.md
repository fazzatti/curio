# Testing and Tasks

Curio's workspace is meant to be checkable from the repo root.

## Root Tasks

```sh
deno lint
deno task check
deno task test:unit
deno task test:integration
deno task test
deno coverage .coverage
deno coverage --lcov .coverage > coverage.lcov
deno task init -- my-app
```

## Coverage Layout

Coverage data is written to the workspace-level `.coverage/` directory.

That keeps generated artifacts out of individual packages and makes it possible
to report combined workspace coverage from the same root output that CI uploads
to Codecov.

## Package Verification

### Core

The core package has:

- package-level `deno check`
- unit tests
- optional integration test task
- deterministic fixtures under `@curio/core/testing`

### Init

The init package has:

- package-level `deno check`
- CLI and scaffold tests
- scaffold smoke tests that generate a project and check it

## Plain `deno test` vs `deno task test`

Plain `deno test` runs without elevated permissions. Because scaffold tests need
filesystem and subprocess access, some init tests are intentionally ignored in
that mode.

Use `deno task test` for the full privileged workspace verification path.

## Current Strategy

The repository favors:

- fast local verification from the root
- a compact root task surface
- package-specific tasks when focused work is needed
- scaffold smoke tests for init
- strong unit coverage for the core package

As the core package becomes published on JSR, the next testing step is to keep
both:

- a local workspace compatibility check
- a published-package compatibility check

## Fixture Strategy

Curio's testing helpers live under `@curio/core/testing`, not the root
`@curio/core` barrel.

That keeps deterministic fixtures available for tests without turning them into
runtime framework surface by default.
