/** @jsxImportSource preact */

import {
  assertEquals,
  assertRejects,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { renderToString } from "preact-render-to-string";
import {
  formatRecordValue,
  parseScalarFieldValue,
  readForm,
  resolveFlashes,
} from "@/admin/support/utils.tsx";
import { field } from "@/db/field.ts";

describe("admin runtime utils extra coverage", () => {
  it("reads form-data bodies and rejects unsupported request body types", async () => {
    const formData = new FormData();
    formData.set("email", "ada@example.com");

    const formDataContext = {
      request: {
        body: {
          type: () => "form-data",
          form: () => Promise.resolve(new URLSearchParams()),
          formData: () => Promise.resolve(formData),
        },
      },
    };

    const parsed = await readForm(
      formDataContext as Parameters<typeof readForm>[0],
    );
    assertEquals(parsed.get("email"), "ada@example.com");

    await assertRejects(
      () =>
        readForm({
          request: {
            body: {
              type: () => "json",
              form: () => Promise.resolve(new URLSearchParams()),
              formData: () => Promise.resolve(new FormData()),
            },
          },
        } as Parameters<typeof readForm>[0]),
      Error,
      "Expected a form submission.",
    );
  });

  it("parses numeric scalar fields, formats plain values, and normalizes neutral flashes", () => {
    assertEquals(
      parseScalarFieldValue(field.integer().definition, "42"),
      42,
    );
    assertEquals(
      parseScalarFieldValue(field.number().definition, "42.5"),
      42.5,
    );

    const plainValue = renderToString(<>{formatRecordValue(undefined, 42)}</>);
    assertEquals(plainValue, "42");

    assertEquals(
      resolveFlashes(new URLSearchParams("flash=Saved&tone=warning")),
      [{ message: "Saved", tone: "neutral" }],
    );
  });
});
