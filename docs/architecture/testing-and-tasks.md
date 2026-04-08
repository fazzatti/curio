# Testing and Tasks

Curio's workspace is meant to be checkable from the repo root.

## Root Tasks

```sh
deno task check
deno task test:unit
deno task test:init
deno task test:integration
deno task coverage
deno task init -- my-app
```

## Coverage Layout

Coverage data is written to the workspace-level `.coverage/` directory:

- `.coverage/sdk/unit`
- `.coverage/sdk/integration`
- `.coverage/init/unit`

That keeps generated artifacts out of individual packages and makes it possible
to report combined workspace coverage.

## Package Verification

### SDK

The SDK package has:

- package-level `deno check`
- unit tests
- optional integration test task
- combined coverage reporting

### Init

The init package has:

- package-level `deno check`
- CLI and scaffold tests
- scaffold smoke tests that generate a project and check it

## Plain `deno test` vs `deno task test:init`

Plain `deno test` runs without elevated permissions. Because scaffold tests need
filesystem and subprocess access, some init tests are intentionally ignored in
that mode.

Use `deno task test:init` for the full privileged init verification path.

## Current Strategy

The repository favors:

- fast local verification from the root
- package-specific tasks when focused work is needed
- scaffold smoke tests for init
- strong unit coverage for the SDK

As the SDK becomes published on JSR, the next testing step is to keep both:

- a local workspace compatibility check
- a published-package compatibility check
