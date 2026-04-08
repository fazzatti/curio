import { ensureEnvLoaded } from "@/config/env/bootstrap.ts";

export const loadRequiredEnv = (key: string): string => {
  ensureEnvLoaded();
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set. `);
  }
  return value;
};
