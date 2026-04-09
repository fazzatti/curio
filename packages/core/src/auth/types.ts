/**
 * Minimal password hasher contract used by Curio auth tooling.
 */
export type PasswordHasher = {
  /**
   * Derives a stored password hash from a raw password.
   *
   * @param password Raw password value.
   * @returns Encoded password hash string safe to persist.
   */
  hash(password: string): Promise<string>;

  /**
   * Verifies whether a raw password matches a stored hash.
   *
   * @param password Raw password candidate.
   * @param encodedHash Stored password hash.
   * @returns `true` when the password matches the stored hash.
   */
  verify(password: string, encodedHash: string): Promise<boolean>;
};
