# Curio

Curio is a Deno-native backend toolkit organized around two products:

- `@curio/core`: the reusable framework package
- `@curio/init`: the scaffolding CLI that generates a Curio app

This `docs/` tree is the canonical documentation source for the repository and
for GitBook sync.

## What Curio Is Optimized For

Curio is opinionated about the common backend path:

- define typed models
- expose APIs through a small route tree
- mount a server-rendered admin in the same backend
- adopt built-in auth, RBAC, sessions, and audit helpers quickly

Curio is not trying to hide everything behind a rigid black box. The happy path
is streamlined, but advanced users can still swap transport adapters, compose
middleware, annotate custom handlers, and override admin rendering and config.

## Package Split

### `@curio/core`

The core package contains:

- framework-agnostic HTTP primitives
- Oak-bound HTTP helpers
- schema adapters
- the DB layer
- the admin runtime
- focused admin modules
- auth and Drizzle integration
- advanced OpenAPI generation

### `@curio/init`

The init package:

- scaffolds a new Curio app from a template
- stays conceptually separate from the core package
- produces a user-owned project
- should not become a second framework surface

## Start Here

- [Getting Started](getting-started/README.md)
- [Core](core/README.md)
- [Init](init/README.md)
- [Architecture](architecture/overview.md)
