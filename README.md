<div align="center">
  <a href="https://jsr.io/@curio/core" title="@curio/core">
    <img alt="@curio" src="./_internal/img/logo.png" width="320" />
  </a>
  <h1>@curio</h1>
</div>

<p align="center">
TypeScript-first backend toolkit for Deno, built around typed APIs, a relational-first data layer, and a server-rendered admin that ships with your backend.
</p>

<p align="center">
  <a href="https://fifo-docs.gitbook.io/curio">Documentation</a> |
  <a href="https://fifo-docs.gitbook.io/curio/architecture/overview">Architecture</a>
</p>

<div align="center">
  <a href="https://github.com/fazzatti/curio/actions/workflows/deno.yml">
    <img src="https://github.com/fazzatti/curio/actions/workflows/deno.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://codecov.io/gh/fazzatti/curio">
    <img src="https://codecov.io/gh/fazzatti/curio/branch/main/graph/badge.svg" alt="Codecov" />
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img alt="MIT License" src="https://badges.frapsoft.com/os/mit/mit.svg?v=103" />
  </a>
  <a href="https://github.com/ellerbrock/open-source-badge/">
    <img alt="Open Source Love" src="https://badges.frapsoft.com/os/v1/open-source.svg?v=103" />
  </a>
</div>

<br />

## Packages

### [@curio/core](./packages/core)

<a href="https://jsr.io/@curio/core">
  <img src="https://jsr.io/badges/@curio/core" alt="@curio/core on JSR" />
</a>

The reusable framework package. It provides the typed HTTP layer, DB
abstractions, server-rendered admin runtime, focused admin modules, testing
fixtures, value objects, and advanced OpenAPI support.

```sh
deno add jsr:@curio/core
```

[View Package Documentation →](https://fifo-docs.gitbook.io/curio/core)

---

### [@curio/init](./packages/init)

<a href="https://jsr.io/@curio/init">
  <img src="https://jsr.io/badges/@curio/init" alt="@curio/init on JSR" />
</a>

The bootstrap CLI. It scaffolds a fresh Curio project from the canonical
template and keeps the generated app shape aligned with the framework's happy
path.

```sh
deno run -Ar jsr:@curio/init my-app
```

[View Package Documentation →](https://fifo-docs.gitbook.io/curio/init)

---

## Core Concepts & Standards

Curio is designed around a few standards that keep the happy path strong
without forcing advanced users into a rigid box.

### 1. One framework package, one bootstrap package

- `@curio/core` owns the reusable runtime
- `@curio/init` owns scaffolding
- the generated template is the source of truth for new apps

### 2. Opinionated happy path, credible escape hatches

- Oak and Valibot are the built-in path for HTTP
- the root core entrypoint stays adapter-agnostic
- advanced users can work through build artifacts, schema metadata, and focused
  sub-entrypoints

### 3. Backend-first admin

- the admin is mounted in the same backend
- it is server-rendered by default
- runtime concerns stay under `@curio/core/admin`
- more opinionated add-ons live under `@curio/core/admin/modules/*`

### 4. Deterministic developer tooling

- scaffold tests validate generated apps
- workspace coverage is aggregated in the root `.coverage/` directory
- testing utilities live under `@curio/core/testing`

## Architecture

Curio is organized in layers:

- **Layer 3: Bootstrap**
  - `@curio/init` and the canonical project template
- **Layer 2: Core runtime**
  - HTTP, DB, admin, auth, and Drizzle integration
- **Layer 1: Advanced tooling**
  - OpenAPI, testing fixtures, value objects, and adapter-level extension
    points

## Development

From the repo root:

```sh
deno lint
deno task check
deno task test
deno coverage .coverage
deno task init -- my-app
```

Documentation lives in [`docs/`](./docs), which is the canonical GitBook sync
source for the repository.
