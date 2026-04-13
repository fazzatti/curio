import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { once } from "@/http/once.ts";

describe("once", () => {
  it("reuses the same resolved result across repeated calls", async () => {
    let calls = 0;
    const getValue = once(() => {
      calls += 1;
      return Promise.resolve({
        ok: true,
      });
    });

    const first = await getValue();
    const second = await getValue();

    assertEquals(first, {
      ok: true,
    });
    assertEquals(second, {
      ok: true,
    });
    assertEquals(calls, 1);
  });

  it("clears the cached promise after a rejection so callers can retry", async () => {
    let calls = 0;
    const getValue = once(() => {
      calls += 1;

      if (calls === 1) {
        return Promise.reject(new Error("boom"));
      }

      return Promise.resolve("ok");
    });

    await assertRejects(() => getValue(), Error, "boom");
    assertEquals(await getValue(), "ok");
    assertEquals(calls, 2);
  });
});
