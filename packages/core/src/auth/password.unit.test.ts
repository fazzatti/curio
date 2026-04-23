import { assert, assertNotEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { hashPassword, verifyPassword } from "@/auth/password.ts";

describe("password auth helpers", () => {
  it("hashPassword stores a derived value that verifyPassword accepts", async () => {
    const hash = await hashPassword("correct horse battery staple");

    assertNotEquals(hash, "correct horse battery staple");
    assert(await verifyPassword("correct horse battery staple", hash));
    assert(!(await verifyPassword("wrong password", hash)));
  });

  it("hashPassword uses a random salt for each hash", async () => {
    const firstHash = await hashPassword("same password");
    const secondHash = await hashPassword("same password");

    assertNotEquals(firstHash, secondHash);
  });

  it("hashPassword rejects empty passwords", async () => {
    await assertRejects(
      () => hashPassword(""),
      Error,
      "Password cannot be empty.",
    );
  });

  it("verifyPassword returns false for malformed hashes", async () => {
    assert(!(await verifyPassword("secret", "not-a-valid-hash")));
    assert(!(await verifyPassword("secret", "pbkdf2_sha256$-1$bad$bad")));
    assert(
      !(await verifyPassword("secret", "pbkdf2_sha256$310000$%%%$%%%")),
    );
    const hash = await hashPassword("secret");
    const [scheme, iterations, salt, digest] = hash.split("$");
    assert(
      !(await verifyPassword(
        "secret",
        `${scheme}$${iterations}$${salt}$${String(digest).slice(1)}`,
      )),
    );
  });
});
