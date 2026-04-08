# Curio Agent Guide

This repository is the new home for **Curio**, previously prototyped in a repo called `beck`.

Curio is a Deno + TypeScript backend toolkit with two products in one monorepo:

- `packages/sdk`
- `packages/init`

## What Curio Is

Curio is meant to provide a strong backend happy path without trapping advanced users in a rigid framework.

The SDK includes:

- typed HTTP authoring over Oak
- schema-aware routing and middleware
- DB/model/entity abstractions
- Drizzle integration
- a server-rendered admin framework
- optional built-in admin auth, RBAC, sessions, and audit helpers

The `init` package is not the framework itself. It is the project bootstrap experience that should scaffold a new app consuming the published SDK.

## Package Roles

### `packages/sdk`

This is the reusable library package.

Expected release shape:

- JSR package
- likely package name: `@curio/sdk`

It should contain:

- stable public APIs
- strong TSDoc on all public exports
- framework internals that are hidden by default

### `packages/init`

This is the starter/bootstrap layer.

Expected role:

- scaffold or initialize a new Curio app
- consume the published SDK
- remain minimal and user-owned

It should not be treated as part of the SDK surface.

## Architecture Priorities

### 1. Thin public surfaces

Public APIs should be intentionally small.

Do not expose internal helpers "just in case".

Default rule:

- keep internals private
- promote later only when there is a concrete advanced use case

### 2. Domain-based organization

Avoid giant generic buckets like `runtime/` full of unrelated files.

Prefer directories organized by responsibility and domain.

For the admin system, the intended shape is:

- `admin/core`
- `admin/config`
- `admin/http`
- `admin/rendering`
- `admin/support`
- `admin/components`
- `admin/starter`

### 3. Public class, private machinery

For the admin subsystem:

- keep `Admin` as a public class
- keep it thin
- let it orchestrate specialist internal modules

Do not replace `Admin` with a plain namespace-only API.

### 4. Happy path + customization

Curio should provide batteries-included defaults, especially in admin.

But users must still be able to:

- replace blocks
- override behavior
- opt out of opinionated starter pieces

### 5. Deno-native ergonomics

Curio should feel natural in Deno:

- TypeScript-first
- JSR-ready
- explicit imports/exports
- no unnecessary build complexity

## Current Product Philosophy

Curio is not just a CRUD generator.

It is a backend toolkit for building real applications quickly with:

- typed APIs
- typed data modeling
- typed server-rendered admin
- strong operational tooling

## Admin Notes

The admin is:

- server-rendered
- backend-mounted
- DB-coupled by design
- not intended to be a detached SPA by default

Important decision already made:

- live polling should refresh only the page fragment, not reload the full page

SSE was discussed for hotter screens, but deferred for now because the simpler fragment-poll model had a better complexity/benefit tradeoff at this stage.

## UI Notes

Be careful with admin UI structure.

Avoid:

- arbitrary explanatory copy
- redundant wrappers
- deeply nested rounded cards with slightly different opacity layers
- oversized layouts that feel decorative instead of operational

Prefer:

- compact operational interfaces
- purposeful spacing
- fewer, clearer blocks
- labels that match the real domain language

## Naming

Brand:

- `Curio`

Potential styled display name:

- `Curió`

Package/repo names should stay ASCII.

## Documentation Expectations

Before publishing:

- all public exports need TSDoc
- README content should be package-grade, not prototype-grade
- architecture should be understandable from the source tree

Internal code only needs comments where they add real context.

## Testing Expectations

The SDK should keep strong unit coverage and reliable `deno task check` / `deno task test:unit` flows.

The `init` package should stay lighter and only include tests that are useful to adopters, not framework-maintainer-only tests.

## Migration Context

This repo follows a long prototype phase in `beck`.

Useful historical context:

- old name: Beck
- new name: Curio
- old split: `sdk`, `starter`, `channel`
- new desired monorepo split: `packages/sdk`, `packages/init`

When in doubt:

- preserve clean boundaries
- keep the SDK publishable
- keep the init package separate in purpose
- prefer a readable domain tree over convenience dumping
