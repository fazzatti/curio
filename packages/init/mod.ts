export * from "./src/mod.ts";

import { runInit } from "./src/init.ts";

if (import.meta.main) {
  const exitCode = await runInit(Deno.args);

  if (exitCode !== 0) {
    Deno.exit(exitCode);
  }
}
