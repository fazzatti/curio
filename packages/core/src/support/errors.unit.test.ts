import { assertEquals } from "@std/assert";
import { formatUnknownError } from "@/support/errors.ts";

Deno.test("formatUnknownError returns the message for Error instances and stringifies unknown values", () => {
  assertEquals(formatUnknownError(new Error("boom")), "boom");
  assertEquals(formatUnknownError("boom"), "boom");
});
