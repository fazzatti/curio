/**
 * Curio testing utilities entrypoint.
 *
 * @remarks
 * Import from `@curio/core/testing` when you want deterministic, model-aware
 * fixture builders without pulling test helpers into the runtime core surface.
 */
export { createFixtureBuilder } from "@/testing/fixtures.ts";
export type {
  FixtureBuildContext,
  FixtureBuilder,
  FixtureBuilderOptions,
  FixtureFieldGenerator,
  FixtureGenerators,
  FixtureManyOverrides,
} from "@/testing/fixtures.ts";
