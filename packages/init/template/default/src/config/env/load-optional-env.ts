import { ensureEnvLoaded } from "@/config/env/bootstrap.ts";

export const loadOptionalEnv = (key: string): string | undefined => {
  ensureEnvLoaded();
  return Deno.env.get(key);
};
