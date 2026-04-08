/**
 * Curio testing utilities entrypoint.
 *
 * @remarks
 * Import from `@curio/sdk/testing` when you want deterministic, model-aware
 * fixture builders without pulling test helpers into the runtime SDK surface.
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
