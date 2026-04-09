// deno-coverage-ignore-start
import type {
  AdminAction,
  AdminNormalizedResource,
  AdminResourceConfig,
  AdminResourceRegistration,
} from "@/admin/core/types.ts";
import { humanize, mergeComponentOverrides } from "@/admin/support/utils.tsx";
import type { Model } from "@/db/model.ts";
import type { OrderByClause, RawRecord } from "@/db/types.ts";
// deno-coverage-ignore-stop

export const mergeResourceConfig = (
  left: AdminResourceConfig,
  right: AdminResourceConfig,
): AdminResourceConfig => ({
  ...left,
  ...right,
  actions: {
    ...left.actions,
    ...right.actions,
  },
  fieldAccess: {
    ...left.fieldAccess,
    ...right.fieldAccess,
  },
  fieldWidgets: {
    ...left.fieldWidgets,
    ...right.fieldWidgets,
  },
  components: mergeComponentOverrides(
    left.components ?? {},
    right.components ?? {},
  ),
  filters: right.filters ?? left.filters,
  columns: right.columns ?? left.columns,
  searchFields: right.searchFields ?? left.searchFields,
  defaultOrder: right.defaultOrder ?? left.defaultOrder,
  nav: {
    ...left.nav,
    ...right.nav,
  },
});

export const deriveDefaultColumns = (model: Model): string[] => {
  return Object.entries(model.fields)
    .filter(([, field]) => !field.hidden)
    .map(([fieldName]) => fieldName)
    .filter((fieldName) => fieldName !== model.primaryKey)
    .slice(0, 4);
};

export const deriveDefaultSearchFields = (model: Model): string[] => {
  return Object.entries(model.fields)
    .filter(([, field]) => !field.hidden && field.searchable)
    .map(([fieldName]) => fieldName);
};

export const resolveActions = (
  slug: string,
  readOnly: boolean,
  overrides?: Partial<Record<AdminAction, boolean>>,
): Record<AdminAction, boolean> => {
  const base: Record<AdminAction, boolean> = {
    list: true,
    view: true,
    create: !readOnly,
    update: !readOnly,
    delete: !readOnly,
    reset_password: slug === "users" && !readOnly,
  };

  return {
    ...base,
    ...overrides,
  };
};

export const getResourceKind = (
  slug: string,
): AdminNormalizedResource["kind"] => {
  switch (slug) {
    case "users":
      return "users";
    case "roles":
      return "roles";
    case "permissions":
      return "permissions";
    case "sessions":
      return "sessions";
    case "audit":
      return "audit";
    default:
      return "generic";
  }
};

export const normalizeResources = (
  registrations: Record<string, AdminResourceRegistration>,
): {
  resources: Record<string, AdminNormalizedResource>;
  resourceByModelName: Record<string, AdminNormalizedResource>;
} => {
  const resources = Object.fromEntries(
    Object.entries(registrations).map(([registrationKey, registration]) => {
      const model = registration.entity.model;
      const config = registration.config;
      const slug = config.path ?? registrationKey;
      const readOnly = config.readOnly ?? false;
      const normalized: AdminNormalizedResource = {
        slug,
        label: config.label ?? model.labels.plural as string,
        entity: registration.entity,
        model,
        columns: config.columns ?? deriveDefaultColumns(model),
        searchFields: config.searchFields ?? deriveDefaultSearchFields(model),
        defaultOrder: config.defaultOrder ??
          model.defaultOrder as OrderByClause<RawRecord> | undefined,
        actions: resolveActions(slug, readOnly, config.actions),
        readOnly,
        filters: config.filters ?? [],
        fieldAccess: config.fieldAccess ?? {},
        fieldLabels: config.fieldLabels ?? {},
        fieldDescriptions: config.fieldDescriptions ?? {},
        fieldWidgets: config.fieldWidgets ?? {},
        components: config.components ?? {},
        hooks: config.hooks ?? {},
        nav: {
          visible: config.nav?.visible ?? true,
          group: config.nav?.group ?? "Resources",
          order: config.nav?.order ?? 0,
          groupOrder: config.nav?.groupOrder ?? 999,
        },
        navGroup: config.nav?.group ?? "Resources",
        navOrder: config.nav?.order ?? 0,
        navGroupOrder: config.nav?.groupOrder ?? 999,
        kind: getResourceKind(slug),
      };

      return [slug, normalized];
    }),
  );

  const resourceByModelName = Object.fromEntries(
    Object.values(resources).map((resource) => [resource.model.name, resource]),
  );

  return { resources, resourceByModelName };
};
