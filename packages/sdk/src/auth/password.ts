import type { PasswordHasher } from "@/auth/types.ts";

export type { PasswordHasher } from "@/auth/types.ts";

const PASSWORD_HASH_SCHEME = "pbkdf2_sha256";
const PASSWORD_HASH_ITERATIONS = 310_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 32;

const encoder = new TextEncoder();

const encodeBase64 = (value: Uint8Array): string => {
  return btoa(String.fromCharCode(...value));
};

const decodeBase64 = (value: string): Uint8Array => {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
};

const importPasswordKey = async (password: string): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
};

const derivePasswordBytes = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> => {
  const key = await importPasswordKey(password);
  const normalizedSalt = new Uint8Array(salt);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: normalizedSalt,
      iterations,
    },
    key,
    PASSWORD_KEY_BYTES * 8,
  );

  return new Uint8Array(derivedBits);
};

const constantTimeEquals = (
  left: Uint8Array,
  right: Uint8Array,
): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
};

const parsePasswordHash = (
  encodedHash: string,
): {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
} | null => {
  const [scheme, iterationText, encodedSalt, encodedDigest] = encodedHash.split(
    "$",
  );

  if (
    scheme !== PASSWORD_HASH_SCHEME ||
    !iterationText ||
    !encodedSalt ||
    !encodedDigest
  ) {
    return null;
  }

  const iterations = Number(iterationText);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return null;
  }

  try {
    return {
      iterations,
      salt: decodeBase64(encodedSalt),
      hash: decodeBase64(encodedDigest),
    };
  } catch {
    return null;
  }
};

/**
 * Hashes a password using Curio's current default password format.
 *
 * @param password Raw password value.
 * @returns Encoded password hash string.
 *
 * @remarks
 * This helper currently uses PBKDF2-SHA256 via Web Crypto and stores the
 * result as `<scheme>$<iterations>$<salt>$<digest>`.
 *
 * @throws Error
 * Thrown when the password is empty.
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!password) {
    throw new Error("Password cannot be empty.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
  const derivedBytes = await derivePasswordBytes(
    password,
    salt,
    PASSWORD_HASH_ITERATIONS,
  );

  return [
    PASSWORD_HASH_SCHEME,
    String(PASSWORD_HASH_ITERATIONS),
    encodeBase64(salt),
    encodeBase64(derivedBytes),
  ].join("$");
};

/**
 * Verifies a password against an encoded Curio password hash.
 *
 * @param password Raw password candidate.
 * @param encodedHash Stored password hash.
 * @returns `true` when the candidate matches the stored hash.
 *
 * @remarks
 * Invalid or malformed hash strings return `false` rather than throwing.
 */
export const verifyPassword = async (
  password: string,
  encodedHash: string,
): Promise<boolean> => {
  const parsedHash = parsePasswordHash(encodedHash);

  if (!parsedHash) {
    return false;
  }

  const derivedBytes = await derivePasswordBytes(
    password,
    parsedHash.salt,
    parsedHash.iterations,
  );

  return constantTimeEquals(derivedBytes, parsedHash.hash);
};

/**
 * Default Curio password hasher.
 *
 * @remarks
 * This lives on the `@curio/sdk/auth` entrypoint so backends can share one
 * password utility without pulling it into the root SDK barrel.
 */
export const passwordHasher: PasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword,
};
