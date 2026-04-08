import type { AppConfig } from "@/config/types.ts";
import { loadEnv } from "@/config/env/load-env.ts";

const parseIntegerEnv = (key: "PORT" | "DB_PORT"): number => {
  const rawValue = loadEnv(key);
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer.`);
  }

  return value;
};

const dbHost = loadEnv("DB_HOST");
const dbPort = parseIntegerEnv("DB_PORT");
const dbName = loadEnv("DB_NAME");
const dbUser = loadEnv("DB_USER");
const dbPassword = loadEnv("DB_PASSWORD");

export const CONFIG: AppConfig = {
  port: parseIntegerEnv("PORT"),
  database: {
    host: dbHost,
    port: dbPort,
    name: dbName,
    user: dbUser,
    password: dbPassword,
    url: `postgresql://${encodeURIComponent(dbUser)}:${
      encodeURIComponent(dbPassword)
    }@${dbHost}:${dbPort}/${encodeURIComponent(dbName)}`,
  },
};
