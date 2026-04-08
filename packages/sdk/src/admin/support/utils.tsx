/** @jsxImportSource preact */

// deno-coverage-ignore-start
import { renderToString } from "preact-render-to-string";
import type { ComponentChildren } from "preact";
import type { AdminFlashMessage } from "@/admin/components/types.ts";
import type {
  AdminComponentOverrides,
  AdminFieldAccessConfig,
  AdminFieldWidgetOverride,
  AdminNormalizedResource,
  AdminRuntimeLike,
  FormSource,
  OakRouterContext,
} from "@/admin/core/types.ts";
import type { FieldDefinition } from "@/db/field.ts";
import type { RawRecord } from "@/db/types.ts";
// deno-coverage-ignore-stop

export const PAGE_SIZE = 20;

export const RESERVED_QUERY_KEYS = new Set([
  "search",
  "page",
  "sort",
  "direction",
  "flash",
  "tone",
]);

export const humanize = (value: string): string => {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (character) => character.toUpperCase());
};

export const getFieldLabel = (
  resource: AdminNormalizedResource,
  fieldName: string,
): string => {
  return resource.fieldLabels[fieldName] ?? humanize(fieldName);
};

export const getFieldDescription = (
  resource: AdminNormalizedResource,
  fieldName: string,
): string | undefined => {
  return resource.fieldDescriptions[fieldName];
};

export const getFieldAccess = (
  resource: AdminNormalizedResource,
  fieldName: string,
): AdminFieldAccessConfig => {
  return resource.fieldAccess[fieldName] ?? {};
};

export const getDisplayFieldNames = (
  resource: AdminNormalizedResource,
): string[] => {
  return Object.entries(resource.model.fields)
    .filter(([fieldName, field]) => {
      const access = getFieldAccess(resource, fieldName);

      if (access.visible === false) {
        return false;
      }

      return !field.hidden;
    })
    .map(([fieldName]) => fieldName);
};

export const getEditableFieldNames = (
  resource: AdminNormalizedResource,
  mode: "create" | "edit" = "edit",
): string[] => {
  return getDisplayFieldNames(resource).filter((fieldName) => {
    const field = resource.model.fields[fieldName];
    const access = getFieldAccess(resource, fieldName);

    if (mode === "create" && access.editableOnCreate === false) {
      return false;
    }

    if (mode === "edit" && access.editableOnUpdate === false) {
      return false;
    }

    if (mode === "create" && access.editableOnCreate === true) {
      return true;
    }

    if (mode === "edit" && access.editableOnUpdate === true) {
      return true;
    }

    if (access.editable === false) {
      return false;
    }

    if (field.primaryKey) {
      return false;
    }

    if (fieldName === "createdAt" || fieldName === "updatedAt") {
      return false;
    }

    return true;
  });
};

export const formatDateTime = (
  value: Date | string | null | undefined,
): string => {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
};

export const renderDocument = (
  title: string,
  body: ComponentChildren,
  basePath: string,
): string => {
  return "<!DOCTYPE html>" + renderToString(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{title}</title>
        <link rel="stylesheet" href={`${basePath}/assets/admin.css`} />
        <script defer src={`${basePath}/assets/admin.js`}></script>
      </head>
      <body>{body}</body>
    </html>,
  );
};

export const sendHtml = (
  ctx: OakRouterContext,
  title: string,
  body: ComponentChildren,
  basePath: string,
  status = 200,
): void => {
  ctx.response.status = status;
  ctx.response.headers.set("content-type", "text/html; charset=utf-8");
  ctx.response.body = renderDocument(title, body, basePath);
};

export const redirect = (
  ctx: OakRouterContext,
  location: string,
): void => {
  ctx.response.status = 303;
  ctx.response.headers.set("location", location);
};

export const readForm = async (
  ctx: OakRouterContext,
): Promise<FormSource> => {
  const body = ctx.request.body;
  const bodyType = body.type();

  if (bodyType === "form") {
    return await body.form();
  }

  if (bodyType === "form-data") {
    return await body.formData();
  }

  throw new Error("Expected a form submission.");
};

export const getFormValue = (
  form: FormSource,
  key: string,
): string => {
  const values = "getAll" in form ? form.getAll(key) : [];

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];

    if (typeof value === "string") {
      return value.trim();
    }
  }

  return "";
};

export const getFormValues = (
  form: FormSource,
  key: string,
): string[] => {
  const values = "getAll" in form ? form.getAll(key) : [];
  return values
    .map((value) => typeof value === "string" ? value.trim() : "")
    .filter(Boolean);
};

export const parsePage = (value: string | null): number => {
  const numeric = Number(value ?? "1");

  if (!Number.isInteger(numeric) || numeric < 1) {
    return 1;
  }

  return numeric;
};

export const toQueryString = (params: URLSearchParams): string => {
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const cloneSearchParams = (
  params: URLSearchParams,
): URLSearchParams => {
  return new URLSearchParams(params);
};

export const parseScalarFieldValue = (
  field: FieldDefinition,
  rawValue: string,
): unknown => {
  if (!rawValue) {
    return field.nullable ? null : undefined;
  }

  switch (field.kind) {
    case "boolean":
      return rawValue === "true" || rawValue === "on";
    case "integer":
    case "number":
      return Number(rawValue);
    case "datetime":
      return new Date(rawValue);
    case "json":
      return JSON.parse(rawValue);
    default:
      return rawValue;
  }
};

export const formatRecordValue = (
  field: FieldDefinition | undefined,
  value: unknown,
): ComponentChildren => {
  if (value === null || value === undefined || value === "") {
    return <span data-curio-admin-badge data-tone="muted">Empty</span>;
  }

  if (!field) {
    return String(value);
  }

  switch (field.kind) {
    case "boolean":
      return (
        <span data-curio-admin-badge data-tone={value ? undefined : "muted"}>
          {value ? "Yes" : "No"}
        </span>
      );
    case "datetime":
      return formatDateTime(value as Date | string);
    case "json":
      return <pre>{JSON.stringify(value, null, 2)}</pre>;
    default:
      return String(value);
  }
};

export const defaultFormWidget = (
  fieldName: string,
  field: FieldDefinition,
  value: string,
  input?: {
    label?: string;
    description?: string;
  },
): ComponentChildren => {
  const label = input?.label ?? humanize(fieldName);
  const description = input?.description;

  if (field.kind === "boolean") {
    return renderBooleanToggleField({
      fieldName,
      label,
      checked: value === "true",
      description,
    });
  }

  if (field.kind === "enum") {
    return (
      <div data-curio-admin-field>
        <label data-curio-admin-label htmlFor={fieldName}>{label}</label>
        {description
          ? <div data-curio-admin-subtitle>{description}</div>
          : null}
        <select
          id={fieldName}
          name={fieldName}
          data-curio-admin-select
          required={field.required}
        >
          {!field.required ? <option value="">Select one</option> : null}
          {(field.values ?? []).map((optionValue) => {
            const stringValue = String(optionValue);
            return (
              <option selected={value === stringValue} value={stringValue}>
                {humanize(stringValue)}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (field.kind === "text" || field.kind === "json") {
    return (
      <div data-curio-admin-field data-span="2">
        <label data-curio-admin-label htmlFor={fieldName}>{label}</label>
        {description
          ? <div data-curio-admin-subtitle>{description}</div>
          : null}
        <textarea
          id={fieldName}
          name={fieldName}
          data-curio-admin-textarea
          required={field.required}
        >
          {value}
        </textarea>
      </div>
    );
  }

  const inputType = field.kind === "integer" || field.kind === "number"
    ? "number"
    : field.kind === "datetime"
    ? "datetime-local"
    : "text";

  return (
    <div data-curio-admin-field>
      <label data-curio-admin-label htmlFor={fieldName}>{label}</label>
      {description ? <div data-curio-admin-subtitle>{description}</div> : null}
      <input
        id={fieldName}
        name={fieldName}
        type={inputType}
        value={value}
        data-curio-admin-input
        required={field.required}
      />
    </div>
  );
};

export const renderBooleanToggleField = (
  input: {
    fieldName: string;
    label: string;
    checked: boolean;
    description?: string;
  },
): ComponentChildren => {
  const { fieldName, label, checked, description } = input;

  return (
    <div data-curio-admin-field data-span="2">
      <div data-curio-admin-toggle-field>
        <span data-curio-admin-toggle-copy>
          <label data-curio-admin-label htmlFor={fieldName}>{label}</label>
          {description
            ? <span data-curio-admin-subtitle>{description}</span>
            : null}
        </span>
        <label data-curio-admin-toggle-control htmlFor={fieldName}>
          <input
            id={fieldName}
            name={fieldName}
            type="checkbox"
            value="true"
            checked={checked}
            role="switch"
            data-curio-admin-toggle-input
          />
          <span data-curio-admin-toggle-track aria-hidden="true" />
        </label>
      </div>
    </div>
  );
};

export const buildWidgetLookupKeys = (
  fieldName: string,
  field: FieldDefinition,
): string[] => {
  return [fieldName, `kind:${field.kind}`];
};

export const resolveWidgetOverride = (
  resource: AdminNormalizedResource,
  globalWidgets: Record<string, AdminFieldWidgetOverride>,
  fieldName: string,
  field: FieldDefinition,
): AdminFieldWidgetOverride | undefined => {
  for (const key of buildWidgetLookupKeys(fieldName, field)) {
    if (resource.fieldWidgets[key]) {
      return resource.fieldWidgets[key];
    }

    if (globalWidgets[key]) {
      return globalWidgets[key];
    }
  }

  return undefined;
};

export const mergeComponentOverrides = (
  base: AdminComponentOverrides,
  next: AdminComponentOverrides,
): AdminComponentOverrides => ({
  ...base,
  ...next,
});

export const getRequestIpAddress = (
  ctx: OakRouterContext,
): string | null => {
  const forwardedFor = ctx.request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return ctx.request.ip ?? null;
};

export const getRequestUserAgent = (
  ctx: OakRouterContext,
): string | null => {
  return ctx.request.headers.get("user-agent");
};

export const resolveFlashes = (
  searchParams: URLSearchParams,
): AdminFlashMessage[] | undefined => {
  const flash = searchParams.get("flash");

  if (!flash) {
    return undefined;
  }

  const tone = searchParams.get("tone");

  return [{
    message: flash,
    tone: tone === "error" || tone === "success" ? tone : "neutral",
  }];
};

export const getRecordTitle = (
  resource: AdminNormalizedResource,
  record: RawRecord,
): string => {
  if (resource.kind === "users" && typeof record.email === "string") {
    return record.email;
  }

  if (typeof record.label === "string" && record.label) {
    return record.label;
  }

  if (typeof record.key === "string" && record.key) {
    return record.key;
  }

  return String(record[resource.model.primaryKey] ?? "Record");
};

export const getRecordId = (
  resource: AdminNormalizedResource,
  record: RawRecord,
): string => {
  return String(record[resource.model.primaryKey] ?? "");
};

export const formatFieldForForm = (
  field: FieldDefinition,
  value: unknown,
): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (field.kind === "datetime") {
    const date = value instanceof Date ? value : new Date(String(value));
    return `${date.getUTCFullYear()}-${
      String(date.getUTCMonth() + 1).padStart(2, "0")
    }-${String(date.getUTCDate()).padStart(2, "0")}T${
      String(date.getUTCHours()).padStart(2, "0")
    }:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  }

  if (field.kind === "json") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

export const countResourceRecords = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
): Promise<number> => {
  return (await admin.getRepository(resource).findMany()).length;
};
