/**
 * Shared Curio auth entrypoint.
 *
 * @remarks
 * This entrypoint intentionally stays narrow: it exposes only password hashing
 * helpers and the password-hasher contract used by Curio-generated apps.
 */
export {
  hashPassword,
  passwordHasher,
  verifyPassword,
} from "@/auth/password.ts";
export type { PasswordHasher } from "@/auth/password.ts";
