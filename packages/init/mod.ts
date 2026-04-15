/**
 * Curio init package entrypoint.
 *
 * @module
 *
 * @remarks
 * This entrypoint exposes the programmatic scaffold helpers and also acts as
 * the CLI executable when invoked through `deno run`.
 */
export * from "./src/mod.ts";

import { runInit } from "./src/init.ts";

if (import.meta.main) {
  const exitCode = await runInit(Deno.args);

  if (exitCode !== 0) {
    Deno.exit(exitCode);
  }
}
