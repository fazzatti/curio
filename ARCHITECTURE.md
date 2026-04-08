# Curio Architecture

## Overview

Curio is a Deno-native backend toolkit organized as a monorepo.

The intended top-level package structure is:

```txt
packages/
  sdk/
  init/
```

The current project evolved from a prototype called `beck`. That prototype validated the main abstractions and the admin/product direction, but the new Curio repo should present those ideas as a cleaner and more intentional system.

## Product Split

Curio contains two different products that should not be conflated.

### SDK

The SDK is the framework/toolkit.

It is responsible for:

- API authoring
- middleware
- schema integration
- DB abstractions
- admin framework
- optional starter-style admin auth/RBAC/session/audit helpers
- Drizzle integration

The SDK should be publishable on JSR as a reusable package, likely `@curio/sdk`.

### Init

The init package is the project bootstrap experience.

Its job is to:

- scaffold a new Curio app
- depend on the published SDK
- stay minimal
- produce a user-owned codebase

The init package is not the core framework and should not drive SDK design decisions.

## Guiding Principles

### 1. Strong happy path

Curio should make the common backend path easy:

- define models
- define APIs
- mount an admin
- get auth, roles, sessions, and audit support quickly

### 2. Clear boundaries

Curio should hide complexity behind small public surfaces.

Default rule:

- keep modules internal
- export only what is intentionally stable and useful

### 3. Domain-oriented code organization

Directory structure should reflect responsibilities.

Avoid giant mixed folders that become dumping grounds.

### 4. Public classes can stay public classes

For example, the admin subsystem should keep a public `Admin` class.

But that class should be thin and act as:

- entry point
- orchestrator
- aggregator

The heavy work should live in internal specialist modules.

### 5. Opinionated defaults, not rigid lock-in

Curio should include strong built-in defaults.

But users should be able to customize:

- admin blocks
- auth flows
- routes
- model usage
- rendering composition

## SDK Subsystems

## HTTP

The HTTP layer is based on Oak and should provide:

- typed route declaration
- schema-backed request parsing
- response validation where configured
- middleware composition

This is one of the primary ergonomic layers of the SDK.

## Database

The DB layer provides:

- model definitions
- field definitions
- entity bindings
- repositories
- adapters

It should feel typed and explicit, not magical.

Drizzle support exists as an integration, not as the sole mental model of the SDK.

## Admin

The admin is one of Curio’s main product differentiators.

It is intentionally:

- server-rendered
- backend-mounted
- tightly integrated with the DB layer

It is not intended to default to a client-heavy SPA model.

### Admin Architecture

The admin should be organized like this:

```txt
admin/
  core/
  config/
  http/
  rendering/
  support/
  components/
  starter/
```

#### `admin/core`

Contains the main orchestration and core runtime concepts:

- `Admin`
- state
- actors
- navigation
- repositories
- paths
- responses

#### `admin/config`

Contains normalization and registration logic for:

- resources
- views
- flows
- widgets
- presets

#### `admin/http`

Contains route-facing handler logic and route mounting.

#### `admin/rendering`

Contains server-rendered page assembly and page-oriented rendering helpers, such as:

- listing
- details
- forms

#### `admin/support`

Contains lower-level helper utilities shared across the admin.

#### `admin/components`

Contains the built-in UI blocks and presentational building blocks.

These are part of the happy path and may be overridden.

#### `admin/starter`

Contains the more opinionated admin support layer:

- sessions
- RBAC
- audit
- starter repositories/constants/types

This is conceptually distinct from the admin core and should be treated that way in package design and docs.

## Admin Public API Strategy

The public admin API should prioritize:

- `Admin` class
- resource/view/flow/widget registration
- clear config types

The public admin API should avoid leaking:

- internal route helpers
- internal response helpers
- internal path builders
- implementation-only state helpers

If a module becomes genuinely useful for expert users, it can be promoted later.

The default should remain private.

## Live Admin Pages

An important decision already made:

- live polling should update the page fragment, not reload the full page

This preserves:

- sidebar state
- collapsible state
- lower flicker
- better navigation behavior

SSE was discussed for very hot dashboards, but deferred because it introduced more framework and mental overhead than the project wanted at this stage.

If revisited later, it should still preserve the server-rendered model rather than forcing a client-state-heavy design.

## UI Direction

Curio’s admin UI should feel operational, not decorative.

Avoid:

- redundant wrappers
- repeated title blocks
- random explanatory labels
- nested rounded-card stacks with tiny opacity variations
- layouts that feel oversized or wasteful

Prefer:

- compact interfaces
- meaningful labels
- clear hierarchy
- composable but restrained blocks

## Documentation Requirements

Before publishing the SDK:

- all public exports should have proper TSDoc
- README should explain the product and the main authoring model
- package boundaries should be obvious from the repo structure

Internal code may be read by users, but internal documentation should be selective and purposeful.

## Testing Requirements

The SDK should remain heavily validated.

At the time this architecture was carried forward from the prototype:

- `deno task check` passed
- `deno task test:unit` passed
- unit coverage was very high

The init package should be lighter:

- only ship tests that help adopters
- keep heavy framework validation in the SDK

## Release Strategy

Recommended order:

1. harden and publish `packages/sdk`
2. wire `packages/init` against the published SDK
3. ship the init experience as the bootstrap path

Do not let the init package contaminate the SDK’s API boundaries.

## Recommended Package Identity

Use:

- Brand: `Curio`
- JSR/package-facing ASCII name: `curio`

Likely package names:

- `@curio/sdk`
- `@curio/init`

If a styled brand appears in docs or design later, it can use `Curió`, but source/package naming should stay ASCII.

## Migration Guidance from Beck

When porting from the old `beck` repo:

- preserve behavior, not messy structure
- prefer renaming and reorganization early
- keep the useful abstractions
- drop historical accidental complexity

The old repo proved the concepts. The new Curio repo should present them as a product.
