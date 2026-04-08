import { createSuperAdmin } from "@/db/admin/create-superadmin.ts";
import { closeDatabase, db, prepareDatabase } from "@/db/index.ts";
import { LOG } from "@/tools/logger/index.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ENTER_BYTES = new Set([10, 13]);
const BACKSPACE_BYTES = new Set([8, 127]);
const CTRL_C_BYTE = 3;

const writeStdout = async (value: string): Promise<void> => {
  await Deno.stdout.write(encoder.encode(value));
};

const promptRequired = (label: string): string => {
  const value = globalThis.prompt(`${label}:`);

  if (value === null) {
    throw new Error(`${label} input was cancelled.`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${label} cannot be empty.`);
  }

  return trimmedValue;
};

const promptSecret = async (label: string): Promise<string> => {
  if (!Deno.stdin.isTerminal()) {
    throw new Error("Secret input requires an interactive terminal.");
  }

  await writeStdout(`${label}: `);
  Deno.stdin.setRaw(true);

  const buffer = new Uint8Array(1);
  let value = "";

  try {
    while (true) {
      const read = await Deno.stdin.read(buffer);

      if (read === null) {
        throw new Error(`${label} input was interrupted.`);
      }

      const byte = buffer[0];

      if (byte === CTRL_C_BYTE) {
        await writeStdout("\n");
        throw new Error(`${label} input was cancelled.`);
      }

      if (ENTER_BYTES.has(byte)) {
        await writeStdout("\n");
        break;
      }

      if (BACKSPACE_BYTES.has(byte)) {
        value = value.slice(0, -1);
        continue;
      }

      value += decoder.decode(buffer.subarray(0, read));
    }
  } finally {
    Deno.stdin.setRaw(false);
  }

  if (!value) {
    throw new Error(`${label} cannot be empty.`);
  }

  return value;
};

const promptPassword = async (): Promise<string> => {
  const password = await promptSecret("Superadmin password");
  const confirmation = await promptSecret("Confirm superadmin password");

  if (password !== confirmation) {
    throw new Error("Superadmin password confirmation does not match.");
  }

  return password;
};

const formatCliError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const lines = [error.message];
  const cause = error.cause;

  if (cause && typeof cause === "object") {
    const typedCause = cause as Record<string, unknown>;

    if (typeof typedCause.message === "string") {
      lines.push(`cause: ${typedCause.message}`);
    }

    if (typeof typedCause.code === "string") {
      lines.push(`code: ${typedCause.code}`);
    }

    if (typeof typedCause.detail === "string") {
      lines.push(`detail: ${typedCause.detail}`);
    }

    if (typeof typedCause.hint === "string") {
      lines.push(`hint: ${typedCause.hint}`);
    }
  }

  return lines.join("\n");
};

if (import.meta.main) {
  let exitCode = 0;

  try {
    LOG.debug("Preparing database for superadmin creation");
    await prepareDatabase();

    const email = promptRequired("Superadmin email");
    const password = await promptPassword();
    const user = await createSuperAdmin({
      email,
      password,
      db,
    });

    LOG.info(`Superadmin created: ${user.email} (${user.id})`);
  } catch (error) {
    const message = formatCliError(error);
    LOG.error(message);
    exitCode = 1;
  } finally {
    LOG.debug("Closing database after superadmin command");
    await closeDatabase();

    if (exitCode !== 0) {
      Deno.exit(exitCode);
    }
  }
}
