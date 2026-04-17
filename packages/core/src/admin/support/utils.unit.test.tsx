/** @jsxImportSource preact */

import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import { renderToString } from "preact-render-to-string";
import { normalizeResources } from "@/admin/config/resources.ts";
import {
  buildWidgetLookupKeys,
  cloneSearchParams,
  countResourceRecords,
  defaultFormWidget,
  formatDateTime,
  formatFieldForForm,
  formatRecordValue,
  getDisplayFieldNames,
  getEditableFieldNames,
  getFormValue,
  getFormValues,
  getRecordId,
  getRecordTitle,
  getRequestIpAddress,
  getRequestUserAgent,
  humanize,
  parsePage,
  parseScalarFieldValue,
  renderDocument,
  resolveFlashes,
  resolveWidgetOverride,
  toQueryString,
} from "@/admin/support/utils.tsx";
import { Entity } from "@/db/entity.ts";
import {
  field,
  type FieldDefinition,
  resolveFieldDefinition,
} from "@/db/field.ts";
import { Model } from "@/db/model.ts";
import { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";

const ExampleModel = new Model({
  name: "Example",
  table: "examples",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    title: field.string().required().sortable(),
    status: field.enum(["draft", "published"] as const),
    enabled: field.boolean(),
    body: field.text(),
    metadata: field.json<Record<string, unknown> | null>().nullable(),
    publishedAt: field.datetime().nullable(),
    secret: field.string().hidden(),
  },
});

const Example = Entity.from(ExampleModel);

const exampleResource = normalizeResources({
  examples: {
    entity: Example,
    config: {
      fieldAccess: {
        body: { visible: false },
        enabled: { editable: false },
      },
      fieldWidgets: {
        title: {
          list: () => "resource-title-widget",
        },
      },
    },
  },
}).resources.examples;

const overrideResource = normalizeResources({
  examples: {
    entity: Example,
    config: {
      fieldAccess: {
        title: {
          editableOnCreate: false,
          editableOnUpdate: true,
        },
        status: {
          editableOnCreate: true,
          editableOnUpdate: false,
        },
        enabled: {
          editable: false,
        },
      },
      fieldDescriptions: {
        status: "Lifecycle state",
        body: "Long form body",
        publishedAt: "UTC timestamp",
      },
    },
  },
}).resources.examples;

Deno.test("admin runtime utils format labels, dates, search params, and scalar field values", () => {
  assertEquals(humanize("apiKeyToken"), "Api Key Token");
  assertEquals(humanize("user_roles"), "User roles");
  assertEquals(
    formatDateTime("2026-03-25T12:34:56.000Z"),
    "2026-03-25 12:34:56 UTC",
  );
  assertEquals(formatDateTime(null), "—");
  assertEquals(parsePage(null), 1);
  assertEquals(parsePage("0"), 1);
  assertEquals(parsePage("2"), 2);

  const checkboxForm = new URLSearchParams();
  checkboxForm.append("enabled", "false");
  checkboxForm.append("enabled", "true");
  assertEquals(getFormValue(checkboxForm, "enabled"), "true");

  const params = new URLSearchParams({ search: "ada", page: "2" });
  const cloned = cloneSearchParams(params);
  cloned.set("page", "3");
  assertEquals(params.get("page"), "2");
  assertEquals(toQueryString(cloned), "?search=ada&page=3");

  assertEquals(
    parseScalarFieldValue(ExampleModel.fields.enabled, "true"),
    true,
  );
  assertEquals(
    parseScalarFieldValue(ExampleModel.fields.enabled, "on"),
    true,
  );
  assert(
    parseScalarFieldValue(
      ExampleModel.fields.publishedAt,
      "2026-03-25T12:34",
    ) instanceof Date,
  );
  assertEquals(
    parseScalarFieldValue(ExampleModel.fields.metadata, '{"ok":true}'),
    { ok: true },
  );
  assertEquals(
    parseScalarFieldValue(ExampleModel.fields.metadata, ""),
    null,
  );
  assertEquals(
    parseScalarFieldValue(ExampleModel.fields.enabled, "false"),
    false,
  );
  assertEquals(
    parseScalarFieldValue(ExampleModel.fields.title, ""),
    undefined,
  );
  assertEquals(
    parseScalarFieldValue(
      resolveFieldDefinition(field.integer().nullable(), "score"),
      "",
    ),
    null,
  );
  assertEquals(parseScalarFieldValue(field.integer().definition, "42"), 42);
  assertEquals(parseScalarFieldValue(field.number().definition, "4.2"), 4.2);
});

Deno.test("admin runtime utils resolve field access, titles, flashes, and request metadata", async () => {
  assertEquals(getDisplayFieldNames(exampleResource), [
    "id",
    "createdAt",
    "updatedAt",
    "title",
    "status",
    "enabled",
    "metadata",
    "publishedAt",
  ]);
  assertEquals(getEditableFieldNames(exampleResource), [
    "title",
    "status",
    "metadata",
    "publishedAt",
  ]);

  assertEquals(
    getRecordTitle(exampleResource, { id: "rec-1", title: "Ignored" }),
    "rec-1",
  );
  assertEquals(
    getRecordTitle(
      {
        ...exampleResource,
        kind: "users",
      },
      { id: "user-1", email: "ada@example.com" },
    ),
    "ada@example.com",
  );
  assertEquals(
    getRecordTitle(exampleResource, { id: "rec-2", label: "Visible title" }),
    "Visible title",
  );
  assertEquals(
    getRecordTitle(exampleResource, { id: "rec-3", key: "resource-key" }),
    "resource-key",
  );
  assertEquals(getRecordTitle(exampleResource, {}), "Record");
  assertEquals(
    getRecordId(exampleResource, { id: "rec-4", title: "Ignored" }),
    "rec-4",
  );
  assertEquals(getRecordId(exampleResource, {}), "");

  assertEquals(
    resolveFlashes(new URLSearchParams("flash=Saved&tone=success")),
    [{ message: "Saved", tone: "success" }],
  );
  assertEquals(
    resolveFlashes(new URLSearchParams("flash=Saved&tone=warning")),
    [{ message: "Saved", tone: "neutral" }],
  );
  assertEquals(resolveFlashes(new URLSearchParams()), undefined);

  const requestContext = {
    request: {
      headers: new Headers({
        "x-forwarded-for": "127.0.0.1, 10.0.0.1",
        "user-agent": "CurioTest/1.0",
      }),
      ip: "192.168.1.2",
    },
  };
  assertEquals(
    getRequestIpAddress(
      requestContext as Parameters<typeof getRequestIpAddress>[0],
    ),
    "127.0.0.1",
  );
  assertEquals(
    getRequestUserAgent(
      requestContext as Parameters<typeof getRequestUserAgent>[0],
    ),
    "CurioTest/1.0",
  );
  assertEquals(
    getRequestIpAddress(
      {
        request: {
          headers: new Headers(),
          ip: "192.168.1.2",
        },
      } as unknown as Parameters<typeof getRequestIpAddress>[0],
    ),
    "192.168.1.2",
  );
  assertEquals(
    getRequestIpAddress(
      {
        request: {
          headers: new Headers(),
          ip: null,
        },
      } as unknown as Parameters<typeof getRequestIpAddress>[0],
    ),
    null,
  );

  const uploadForm = new FormData();
  uploadForm.append("attachment", new Blob(["payload"]), "note.txt");
  assertEquals(getFormValue(uploadForm, "attachment"), "");
  assertEquals(getFormValues(uploadForm, "attachment"), []);
  assertEquals(
    getFormValue({} as Parameters<typeof getFormValue>[0], "missing"),
    "",
  );
  assertEquals(
    getFormValues({} as Parameters<typeof getFormValues>[0], "missing"),
    [],
  );

  const counted = await countResourceRecords(
    ({
      getRepository() {
        return {
          findMany: () => Promise.resolve([{ id: "one" }, { id: "two" }]),
        };
      },
    } as unknown) as Parameters<typeof countResourceRecords>[0],
    exampleResource,
  );
  assertEquals(counted, 2);
});

Deno.test("admin runtime utils render the document, values, and default widgets", () => {
  const rendered = renderDocument("Admin", <div>Body</div>, "/admin");
  assertStringIncludes(rendered, "<!DOCTYPE html>");
  assertStringIncludes(rendered, 'href="/admin/assets/admin.css"');
  assertStringIncludes(rendered, "Body");

  const themedDocument = renderDocument(
    "Admin",
    <div>Body</div>,
    "/admin",
    {
      name: "Curio",
      tagline: "Control room.",
      colors: {
        primary: "#336699",
        secondary: "#cc8844",
      },
    },
  );
  assertStringIncludes(themedDocument, "--curio-accent: #336699");
  assertStringIncludes(themedDocument, "--curio-secondary: #cc8844");

  const emptyValue = renderToString(<>{formatRecordValue(undefined, null)}</>);
  assertStringIncludes(emptyValue, "Empty");
  const booleanValue = renderToString(
    <>{formatRecordValue(ExampleModel.fields.enabled, true)}</>,
  );
  assertStringIncludes(booleanValue, "Yes");
  const falseBooleanValue = renderToString(
    <>{formatRecordValue(ExampleModel.fields.enabled, false)}</>,
  );
  assertStringIncludes(falseBooleanValue, "No");
  const plainValue = renderToString(
    <>{formatRecordValue(undefined, "plain")}</>,
  );
  assertStringIncludes(plainValue, "plain");
  const datetimeValue = renderToString(
    <>
      {formatRecordValue(
        ExampleModel.fields.publishedAt,
        "2026-03-25T12:34:56.000Z",
      )}
    </>,
  );
  assertStringIncludes(datetimeValue, "2026-03-25 12:34:56 UTC");
  const jsonValue = renderToString(
    <>{formatRecordValue(ExampleModel.fields.metadata, { ok: true })}</>,
  );
  assertStringIncludes(jsonValue, "&quot;ok&quot;: true");

  const booleanWidget = renderToString(
    <>{defaultFormWidget("enabled", ExampleModel.fields.enabled, "true")}</>,
  );
  assertStringIncludes(booleanWidget, 'type="checkbox"');
  assertStringIncludes(booleanWidget, "data-curio-admin-toggle-field");
  assertStringIncludes(booleanWidget, 'role="switch"');
  const enumWidget = renderToString(
    <>
      {defaultFormWidget("status", ExampleModel.fields.status, "published", {
        description: "Lifecycle state",
      })}
    </>,
  );
  assertStringIncludes(enumWidget, "<select");
  assertStringIncludes(enumWidget, "published");
  assertStringIncludes(enumWidget, "Lifecycle state");
  const jsonWidget = renderToString(
    <>
      {defaultFormWidget("metadata", ExampleModel.fields.metadata, "{}", {
        description: "JSON payload",
      })}
    </>,
  );
  assertStringIncludes(jsonWidget, "<textarea");
  assertStringIncludes(jsonWidget, "JSON payload");
  const textWidget = renderToString(
    <>
      {defaultFormWidget("body", ExampleModel.fields.body, "Body", {
        description: "Long form body",
      })}
    </>,
  );
  assertStringIncludes(textWidget, "<textarea");
  assertStringIncludes(textWidget, "Long form body");
  const datetimeWidget = renderToString(
    <>
      {defaultFormWidget(
        "publishedAt",
        ExampleModel.fields.publishedAt,
        "2026-03-25T12:34",
        {
          description: "UTC timestamp",
        },
      )}
    </>,
  );
  assertStringIncludes(datetimeWidget, 'type="datetime-local"');
  assertStringIncludes(datetimeWidget, "UTC timestamp");
  const numberWidget = renderToString(
    <>{defaultFormWidget("score", field.number().definition, "42")}</>,
  );
  assertStringIncludes(numberWidget, 'type="number"');
  const optionalEnumWidget = renderToString(
    <>
      {defaultFormWidget(
        "optionalStatus",
        resolveFieldDefinition(
          field.enum(["draft", "published"] as const),
          "optionalStatus",
        ),
        "",
      )}
    </>,
  );
  assertStringIncludes(optionalEnumWidget, "Select one");

  const formattedDate = formatFieldForForm(
    ExampleModel.fields.publishedAt,
    new Date("2026-03-25T12:34:56.000Z"),
  );
  assertEquals(formattedDate, "2026-03-25T12:34");
  assertEquals(
    formatFieldForForm(ExampleModel.fields.metadata, { ok: true }),
    JSON.stringify({ ok: true }, null, 2),
  );
  assertEquals(
    formatFieldForForm(
      ExampleModel.fields.publishedAt,
      "2026-03-25T12:34:56.000Z",
    ),
    "2026-03-25T12:34",
  );
  assertEquals(formatFieldForForm(ExampleModel.fields.title, "Ada"), "Ada");
  assertEquals(formatFieldForForm(ExampleModel.fields.title, null), "");
  assertEquals(toQueryString(new URLSearchParams()), "");
});

Deno.test("admin runtime utils resolve widget overrides by field and by kind", () => {
  const globalWidgets = {
    "kind:enum": {
      detail: () => "global-enum-widget",
    },
  };
  const fieldKeys = buildWidgetLookupKeys("status", ExampleModel.fields.status);
  assertEquals(fieldKeys, ["status", "kind:enum"]);

  const resourceOverride = resolveWidgetOverride(
    exampleResource,
    globalWidgets,
    "title",
    ExampleModel.fields.title,
  );
  assertExists(resourceOverride?.list);

  const globalOverride = resolveWidgetOverride(
    {
      ...exampleResource,
      fieldWidgets: {},
    },
    globalWidgets,
    "status",
    ExampleModel.fields.status,
  );
  assertExists(globalOverride?.detail);
  assertEquals(
    resolveWidgetOverride(
      {
        ...exampleResource,
        fieldWidgets: {},
      },
      {},
      "missing",
      ExampleModel.fields.title,
    ),
    undefined,
  );
});

Deno.test("admin runtime utils honor create and edit field access overrides", () => {
  assertEquals(getEditableFieldNames(overrideResource, "create"), [
    "status",
    "body",
    "metadata",
    "publishedAt",
  ]);
  assertEquals(getEditableFieldNames(overrideResource, "edit"), [
    "title",
    "body",
    "metadata",
    "publishedAt",
  ]);
});

Deno.test("defaultFormWidget handles explicitly required enum without optional label", () => {
  const requiredEnumField = resolveFieldDefinition(
    field.enum(["one", "two"] as const).required(),
    "reqEnum",
  );
  const widgetHtml = renderToString(
    <>{defaultFormWidget("reqEnum", requiredEnumField, "one")}</>,
  );
  assert(!widgetHtml.includes("Select one"));
});

Deno.test("defaultFormWidget handles enum missing values array", () => {
  const badEnumField: FieldDefinition<string, "enum"> = {
    ...field.string().definition,
    kind: "enum",
  };
  const widgetHtml = renderToString(
    <>{defaultFormWidget("bad", badEnumField, "")}</>,
  );
  assertStringIncludes(widgetHtml, "<select");
});
