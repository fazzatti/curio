# Architecture Overview

Curio is a Deno-native backend toolkit organized as a monorepo.

The repo currently contains two packages:

- `packages/sdk`
- `packages/init`

## Product Split

Curio contains two separate products that should not be conflated.

### SDK

The SDK is the framework and reusable toolkit.

It owns:

- API authoring
- middleware
- schema integration
- DB abstractions
- admin runtime
- focused admin modules
- auth helpers
- Drizzle integration
- advanced OpenAPI generation

### Init

The init package is the bootstrap experience.

It owns:

- project scaffolding
- template copying
- placeholder replacement
- CLI ergonomics

It should not drive the SDK into a shape optimized for scaffolding internals.

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

The repository and the SDK should be organized by responsibility, not by
implementation accident.

### Opinionated Defaults Without Lock-In

Curio is intentionally opinionated around Oak, Valibot, and the generated
starter path. At the same time, advanced consumers should still have credible
extension points where that matters.
