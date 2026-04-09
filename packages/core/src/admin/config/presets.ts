// deno-coverage-ignore-start
import { DefaultAdminCountWidget } from "@/admin/components/widgets.tsx";
import { mergeComponentOverrides } from "@/admin/support/utils.tsx";
import type {
  AdminComponentOverrides,
  AdminCreateInput,
  AdminDashboardWidgetRegistration,
  AdminFieldWidgetOverride,
  AdminFlowRegistration,
  AdminPresetConfig,
  AdminPresetInput,
  AdminResourceRegistration,
  AdminViewRegistration,
} from "@/admin/core/types.ts";
import { normalizeFlows } from "@/admin/config/flows.ts";
import { normalizeResources } from "@/admin/config/resources.ts";
import { normalizeViews } from "@/admin/config/views.ts";
import { normalizeWidgets } from "@/admin/config/widgets.ts";
import { seedDefaultAdminData } from "@/admin/modules.ts";
import type { AdminDatabase } from "@/admin/modules/types.ts";
import type { BoundEntityClass } from "@/db/entity.ts";
import type { DatabaseInstance, TableRegistry } from "@/db/types.ts";
// deno-coverage-ignore-stop

const mergeFieldWidgets = (
  base: Record<string, AdminFieldWidgetOverride>,
  next?: Record<string, AdminFieldWidgetOverride>,
): Record<string, AdminFieldWidgetOverride> => ({
  ...base,
  ...next,
});

const createDefaultResources = (
  db: DatabaseInstance<TableRegistry>,
): Record<string, AdminResourceRegistration> => {
  const resources: Record<string, AdminResourceRegistration> = {};
  const entities = db.entities as Record<string, BoundEntityClass | undefined>;

  if (entities.User) {
    resources.users = {
      entity: entities.User,
      config: {
        path: "users",
        label: "Users",
        columns: ["email", "roles", "createdAt"],
        searchFields: ["email"],
        actions: {
          create: true,
          update: true,
          delete: true,
          reset_password: true,
        },
      },
    };
  }

  if (entities.Role) {
    resources.roles = {
      entity: entities.Role,
      config: {
        path: "roles",
        label: "Roles",
        columns: ["key", "label", "bypass"],
        searchFields: ["key", "label"],
      },
    };
  }

  if (entities.Permission) {
    resources.permissions = {
      entity: entities.Permission,
      config: {
        path: "permissions",
        label: "Permissions",
        columns: ["key", "resource", "action"],
        searchFields: ["key", "label", "resource", "action"],
      },
    };
  }

  if (entities.Session) {
    resources.sessions = {
      entity: entities.Session,
      config: {
        path: "sessions",
        label: "Sessions",
        readOnly: true,
        columns: ["userId", "expiresAt", "lastSeenAt"],
        searchFields: ["userId", "ipAddress", "userAgent"],
      },
    };
  }

  if (entities.AuditEvent) {
    resources.audit = {
      entity: entities.AuditEvent,
      config: {
        path: "audit",
        label: "Audit",
        readOnly: true,
        columns: ["eventType", "resource", "summary", "createdAt"],
        searchFields: ["eventType", "resource", "summary"],
      },
    };
  }

  return resources;
};

const createCountWidget = (
  key: string,
  title: string,
  entityName: string,
  tableName: string,
  href: string,
): AdminDashboardWidgetRegistration => {
  return {
    config: {
      key,
      title,
      size: "md",
      href,
      render:
        DefaultAdminCountWidget as AdminDashboardWidgetRegistration["config"][
          "render"
        ],
      load: async ({ db }) => {
        const count = await db.repo(entityName as keyof TableRegistry & string)
          .findMany();
        return {
          value: count.length.toLocaleString(),
          copy: `Source: ${tableName}`,
        };
      },
    },
  };
};

const createDefaultWidgets = (
  db: DatabaseInstance<TableRegistry>,
  basePath: string,
): Record<string, AdminDashboardWidgetRegistration> => {
  const widgets: Record<string, AdminDashboardWidgetRegistration> = {};
  const entities = db.entities as Record<string, BoundEntityClass | undefined>;

  if (entities.User) {
    widgets.users = createCountWidget(
      "users",
      "Users",
      entities.User.model.name,
      entities.User.model.table,
      `${basePath}/resources/users`,
    );
  }

  if (entities.Role) {
    widgets.roles = createCountWidget(
      "roles",
      "Roles",
      entities.Role.model.name,
      entities.Role.model.table,
      `${basePath}/resources/roles`,
    );
  }

  if (entities.Permission) {
    widgets.permissions = createCountWidget(
      "permissions",
      "Permissions",
      entities.Permission.model.name,
      entities.Permission.model.table,
      `${basePath}/resources/permissions`,
    );
  }

  if (entities.Session) {
    widgets.sessions = createCountWidget(
      "sessions",
      "Sessions",
      entities.Session.model.name,
      entities.Session.model.table,
      `${basePath}/resources/sessions`,
    );
  }

  if (entities.AuditEvent) {
    widgets.audit = createCountWidget(
      "audit",
      "Audit",
      entities.AuditEvent.model.name,
      entities.AuditEvent.model.table,
      `${basePath}/resources/audit`,
    );
  }

  return widgets;
};

const createDefaultPreset = (
  db: DatabaseInstance<TableRegistry>,
  basePath: string,
): AdminPresetConfig<TableRegistry> => {
  return {
    name: "default",
    resources: createDefaultResources(db),
    widgets: createDefaultWidgets(db, basePath),
    seed: async ({ db }) => {
      await seedDefaultAdminData(db as unknown as AdminDatabase);
    },
  };
};

const resolveBuiltInPreset = (
  preset: AdminPresetInput<TableRegistry>,
  db: DatabaseInstance<TableRegistry>,
  basePath: string,
): AdminPresetConfig<TableRegistry> => {
  if (preset === "default") {
    return createDefaultPreset(db, basePath);
  }

  return preset;
};

const addRegistrations = <TRegistration>(
  target: Record<string, TRegistration>,
  source: Record<string, TRegistration> | undefined,
  kind: string,
  sourceName: string,
): void => {
  if (!source) {
    return;
  }

  for (const [key, registration] of Object.entries(source)) {
    if (target[key]) {
      throw new Error(
        `Conflicting admin ${kind} registration "${key}" from ${sourceName}.`,
      );
    }

    target[key] = registration;
  }
};

const assertUniqueRegistrationPaths = <TItem>(
  items: Record<string, TItem>,
  getPath: (registrationKey: string, item: TItem) => string,
  kind: string,
): void => {
  const seen = new Set<string>();

  for (const [registrationKey, item] of Object.entries(items)) {
    const path = getPath(registrationKey, item);

    if (seen.has(path)) {
      throw new Error(`Conflicting admin ${kind} path "${path}".`);
    }

    seen.add(path);
  }
};

export const resolveAdminConfiguration = <TTables extends TableRegistry>(
  input: AdminCreateInput<TTables>,
): {
  resources: ReturnType<typeof normalizeResources>["resources"];
  resourceByModelName: ReturnType<
    typeof normalizeResources
  >["resourceByModelName"];
  views: ReturnType<typeof normalizeViews>;
  flows: ReturnType<typeof normalizeFlows>;
  widgets: ReturnType<typeof normalizeWidgets>;
  fieldWidgets: Record<string, AdminFieldWidgetOverride>;
  components: AdminComponentOverrides;
  seeders: Array<(context: { db: DatabaseInstance<TTables> }) => Promise<void>>;
} => {
  const basePath = input.basePath ?? "/admin";
  const presets = input.presets ?? [];
  const resources: Record<string, AdminResourceRegistration> = {};
  const views: Record<string, AdminViewRegistration> = {};
  const flows: Record<string, AdminFlowRegistration> = {};
  const widgets: Record<string, AdminDashboardWidgetRegistration> = {};
  let fieldWidgets: Record<string, AdminFieldWidgetOverride> = {};
  let components: AdminComponentOverrides = {};
  const seeders: Array<
    (context: { db: DatabaseInstance<TTables> }) => Promise<void>
  > = [];

  for (const presetInput of presets) {
    const preset = resolveBuiltInPreset(
      presetInput as AdminPresetInput<TableRegistry>,
      input.db as unknown as DatabaseInstance<TableRegistry>,
      basePath,
    ) as AdminPresetConfig<TTables>;
    const sourceName = `preset "${preset.name ?? "custom"}"`;

    addRegistrations(resources, preset.resources, "resource", sourceName);
    addRegistrations(views, preset.views, "view", sourceName);
    addRegistrations(flows, preset.flows, "flow", sourceName);
    addRegistrations(widgets, preset.widgets, "widget", sourceName);
    fieldWidgets = mergeFieldWidgets(fieldWidgets, preset.fieldWidgets);
    components = mergeComponentOverrides(components, preset.components ?? {});

    if (preset.seed) {
      seeders.push(preset.seed);
    }
  }

  addRegistrations(resources, input.resources, "resource", "Admin.create");
  addRegistrations(views, input.views, "view", "Admin.create");
  addRegistrations(flows, input.flows, "flow", "Admin.create");
  addRegistrations(widgets, input.widgets, "widget", "Admin.create");
  fieldWidgets = mergeFieldWidgets(fieldWidgets, input.fieldWidgets);
  components = mergeComponentOverrides(components, input.components ?? {});

  assertUniqueRegistrationPaths(
    resources,
    (registrationKey, registration) =>
      registration.config.path ?? registrationKey,
    "resource",
  );
  assertUniqueRegistrationPaths(
    views,
    (registrationKey, registration) =>
      registration.config.path ?? registrationKey,
    "view",
  );
  assertUniqueRegistrationPaths(
    flows,
    (registrationKey, registration) =>
      registration.config.path ?? registrationKey,
    "flow",
  );
  assertUniqueRegistrationPaths(
    widgets,
    (registrationKey, registration) =>
      registration.config.key ?? registrationKey,
    "widget",
  );

  const normalizedResources = normalizeResources(resources);
  const normalizedViews = normalizeViews(views);
  const normalizedFlows = normalizeFlows(flows);
  const normalizedWidgets = normalizeWidgets(widgets);

  return {
    resources: normalizedResources.resources,
    resourceByModelName: normalizedResources.resourceByModelName,
    views: normalizedViews,
    flows: normalizedFlows,
    widgets: normalizedWidgets,
    fieldWidgets,
    components,
    seeders,
  };
};
