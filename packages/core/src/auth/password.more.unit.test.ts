import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { verifyPassword } from "@/auth/password.ts";

describe("password auth extra coverage", () => {
  it("returns false when the decoded stored hash length does not match", async () => {
    const mismatchedHash =
      "pbkdf2_sha256$310000$AA==$AA==";

    assertEquals(await verifyPassword("secret", mismatchedHash), false);
  });
});
