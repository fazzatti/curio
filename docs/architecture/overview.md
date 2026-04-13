# Architecture Overview

Curio is a Deno-native backend toolkit organized as a monorepo.

The repository currently contains two publishable packages:

- `@curio/core` in `packages/core`
- `@curio/init` in `packages/init`

## Product Split

Curio contains two separate products that should not be conflated.

### Core

`@curio/core` is the reusable framework package.

It owns:

- API authoring
- API build artifacts for advanced tooling
- middleware
- schema integration
- DB abstractions
- testing utilities
- value-object primitives
- admin runtime
- focused admin modules
- auth helpers
- Drizzle integration
- advanced OpenAPI generation

### Init

`@curio/init` is the project bootstrap package.

It owns:

- project scaffolding
- template copying
- placeholder replacement
- CLI ergonomics

It should not drive the core package into a shape optimized for scaffolding
internals.

## Guiding Principles

### Strong Happy Path

Curio should make the common backend flow easy:

- define models
- define APIs
- mount an admin
- adopt auth, roles, sessions, and audit quickly

### Clear Boundaries

The public surface should stay smaller than the internal implementation.

Curio should hide complexity behind:

- focused entrypoints
- narrow modules
- stable abstractions

### Domain-Oriented Organization

The repository and the core package should be organized by responsibility, not by
implementation accident.

### Opinionated Defaults Without Lock-In

Curio is intentionally opinionated around Oak, Valibot, and the generated
project template. At the same time, advanced consumers should still have
credible extension points where that matters.
