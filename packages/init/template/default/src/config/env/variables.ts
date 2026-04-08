export type EnvVar =
  | "DB_HOST"
  | "DB_PORT"
  | "DB_NAME"
  | "DB_USER"
  | "DB_PASSWORD"
  | "LOG_LEVEL"
  | "PORT";

export const ENV_VAR_DETAIL: Record<EnvVar, EnvVarDetail> = {
  ["DB_HOST"]: { required: false, default: "127.0.0.1" },
  ["DB_PORT"]: { required: false, default: "5432" },
  ["DB_NAME"]: {
    required: false,
    default: "__CURIO_PROJECT_DB_IDENTIFIER__",
  },
  ["DB_USER"]: {
    required: false,
    default: "__CURIO_PROJECT_DB_IDENTIFIER__",
  },
  ["DB_PASSWORD"]: {
    required: false,
    default: "__CURIO_PROJECT_DB_IDENTIFIER__",
    obfuscate: true,
  },
  ["LOG_LEVEL"]: { required: false, default: "INFO" },
  ["PORT"]: { required: false, default: "8000" },
};

type EnvVarDetailBase = {
  required: boolean;
  obfuscate?: boolean;
};

type RequiredEnvVarDetail = EnvVarDetailBase & {
  required: true;
  default?: string;
};

type OptionalEnvVarDetail = EnvVarDetailBase & {
  required: false;
  default: string;
};

export type EnvVarDetail = RequiredEnvVarDetail | OptionalEnvVarDetail;
