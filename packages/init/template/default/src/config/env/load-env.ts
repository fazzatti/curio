import { LOG } from "@/tools/logger/index.ts";
import { loadOptionalEnv } from "@/config/env/load-optional-env.ts";
import { loadRequiredEnv } from "@/config/env/load-required-env.ts";
import { ENV_VAR_DETAIL, type EnvVar } from "@/config/env/variables.ts";

export const loadEnv = (key: EnvVar): string => {
  const detail = ENV_VAR_DETAIL[key];

  LOG.trace(`Loading env var ${key} (required: ${detail.required})`);
  try {
    const envVar = detail.required
      ? loadRequiredEnv(key)
      : loadOptionalEnv(key) || detail.default;

    LOG.debug(`Loaded env var ${key}: ${detail.obfuscate ? "****" : envVar}`);

    return envVar;
  } catch (error) {
    LOG.error(`Failed to load env var ${key}: ${error}`);
    Deno.exit(1);
  }
};
