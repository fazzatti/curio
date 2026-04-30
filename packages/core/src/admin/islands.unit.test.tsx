/** @jsxImportSource preact */

import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToString } from "preact-render-to-string";
import {
  island,
  serializeAdminIslandPayload,
  useState,
} from "@/admin/islands.tsx";

const decodePayload = (encoded: string) => {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

const extractEncodedPayload = (html: string): string => {
  const match = html.match(/data-curio-admin-island-payload="([^"]+)"/);
  assert(match);
  return match[1];
};

Deno.test("serializeAdminIslandPayload encodes JSON-safe payloads for client hydration", () => {
  const encoded = serializeAdminIslandPayload(
    "SensitiveField",
    "function SensitiveField() { return null; }",
    {
      config: {
        label: "Secret key",
        required: true,
      },
      flags: ["sensitive", "liveValidate"],
      retries: 3,
    },
  );

  assertEquals(decodePayload(encoded), {
    name: "SensitiveField",
    source: "function SensitiveField() { return null; }",
    props: {
      config: {
        label: "Secret key",
        required: true,
      },
      flags: ["sensitive", "liveValidate"],
      retries: 3,
    },
  });
});

Deno.test("serializeAdminIslandPayload preserves serializable nested arrays", () => {
  const encoded = serializeAdminIslandPayload(
    "SensitiveField",
    "function SensitiveField() { return null; }",
    {
      sections: [
        {
          fields: [
            ["secretKey", "apiToken"],
            ["enabled"],
          ],
        },
      ],
    },
  );

  assertEquals(decodePayload(encoded).props, {
    sections: [
      {
        fields: [
          ["secretKey", "apiToken"],
          ["enabled"],
        ],
      },
    ],
  });
});

Deno.test("serializeAdminIslandPayload rejects unsupported prop values with the failing path", () => {
  assertThrows(
    () =>
      serializeAdminIslandPayload(
        "SensitiveField",
        "function SensitiveField() { return null; }",
        {
          fields: [
            {
              name: "secretKey",
              validate: () => true,
            },
          ],
        },
      ),
    Error,
    'non-serializable prop at "props.fields[0].validate"',
  );

  assertThrows(
    () =>
      serializeAdminIslandPayload(
        "SensitiveField",
        "function SensitiveField() { return null; }",
        {
          createdAt: new Date(),
        },
      ),
    Error,
    'non-serializable prop at "props.createdAt"',
  );

  assertThrows(
    () =>
      serializeAdminIslandPayload(
        "SensitiveField",
        "function SensitiveField() { return null; }",
        {
          retries: Number.POSITIVE_INFINITY,
        },
      ),
    Error,
    'non-serializable prop at "props.retries"',
  );

  const circular: Record<string, unknown> = {};
  circular.self = circular;

  assertThrows(
    () =>
      serializeAdminIslandPayload(
        "SensitiveField",
        "function SensitiveField() { return null; }",
        circular,
      ),
    Error,
    'non-serializable prop at "props.self"',
  );

  const circularArray: unknown[] = [];
  circularArray.push(circularArray);

  assertThrows(
    () =>
      serializeAdminIslandPayload(
        "SensitiveField",
        "function SensitiveField() { return null; }",
        {
          items: circularArray,
        },
      ),
    Error,
    'non-serializable prop at "props.items[0]"',
  );
});

Deno.test("island renders SSR markup, preserves component output, and embeds the payload", () => {
  const SensitiveField = island(function SensitiveField(
    props: { label: string; sensitive?: boolean },
  ) {
    const [visible, setVisible] = useState(false);

    return (
      <div data-field={props.label}>
        <label>{props.label}</label>
        <input type={props.sensitive && !visible ? "password" : "text"} />
        <button type="button" onClick={() => setVisible((current) => !current)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    );
  });

  const html = renderToString(
    <SensitiveField label="Secret key" sensitive />,
  );

  assertStringIncludes(html, 'data-curio-admin-island="SensitiveField"');
  assertStringIncludes(html, 'style="display:contents;"');
  assertStringIncludes(html, 'data-field="Secret key"');
  assertStringIncludes(html, "Show");
  assertStringIncludes(html, 'type="password"');

  const payload = decodePayload(extractEncodedPayload(html));

  assertEquals(payload.name, "SensitiveField");
  assertEquals(payload.props, {
    label: "Secret key",
    sensitive: true,
  });
  assert(String(payload.source).includes("useState"));
});

Deno.test("island prefers an explicit displayName and falls back to AdminIsland for anonymous components", () => {
  const Named = function SensitiveInput(props: { label: string }) {
    return <div>{props.label}</div>;
  };
  Named.displayName = "InputField";

  const NamedIsland = island(Named);
  const namedHtml = renderToString(<NamedIsland label="Secret key" />);

  assertStringIncludes(namedHtml, 'data-curio-admin-island="InputField"');
  assertEquals(
    decodePayload(extractEncodedPayload(namedHtml)).name,
    "InputField",
  );

  const Anonymous = (() => {
    return (props: { label: string }) => <div>{props.label}</div>;
  })();
  const AnonymousIsland = island(Anonymous);
  const anonymousHtml = renderToString(<AnonymousIsland label="Secret key" />);

  assertStringIncludes(anonymousHtml, 'data-curio-admin-island="AdminIsland"');
  assertEquals(
    decodePayload(extractEncodedPayload(anonymousHtml)).name,
    "AdminIsland",
  );
});
