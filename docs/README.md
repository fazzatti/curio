<figure><img src=".gitbook/assets/logo.png" alt="Curio"><figcaption></figcaption></figure>

# Introduction

{% hint style="info" %}
**Beta Software** — Curio is still in `0.x.x`. Public APIs may change between
minor releases while the package boundaries and happy path continue to settle.
{% endhint %}

Curio is a TypeScript-first backend toolkit for Deno. It combines typed route
authoring, a relational-first data layer, a server-rendered admin runtime, and
a bootstrap CLI that generates a Curio application from the canonical
template.

## Why Curio?

- **One backend, one admin surface** — Mount the admin in the same backend that
  owns your APIs and persistence layer.
- **Small happy-path API** — Start with Oak, Valibot, and the generated
  template instead of assembling a framework from scratch.
- **Focused extension points** — Drop to adapter-agnostic HTTP, build
  artifacts, schema metadata, or admin modules only when you need more control.
- **Project generation that stays honest** — `@curio/init` produces the same
  app shape Curio itself expects and tests.
- **Deno + JSR first** — Curio is designed to publish cleanly to JSR and remain
  easy to consume from Deno-native workflows.

## Packages

| Package | Description |
| --- | --- |
| `@curio/core` | Core HTTP, DB, admin, testing, value-object, and OpenAPI tooling |
| `@curio/init` | Bootstrap CLI that scaffolds a new Curio project |

## Quick Example

```ts
import * as v from "@valibot/valibot";
import { API, GET, Route } from "@curio/core/http/oak";

const routes = [
  Route("health", {
    GET: GET({
      responseSchema: v.object({
        ok: v.boolean(),
      }),
      handler: () => ({
        payload: { ok: true },
      }),
    }),
  }),
];

const router = API.from(routes);
```

## Next Steps

- [Create a Project](getting-started/create-a-project.md)
- [Build a First API](getting-started/first-api.md)
- [Core Package Overview](core/README.md)
- [Init Package Overview](init/README.md)
- [Architecture Overview](architecture/overview.md)

## Resources

- [Repository README](../README.md)
- [Architecture Notes](../ARCHITECTURE.md)
- [Core Package README](../packages/core/README.md)
- [Init Package README](../packages/init/README.md)
