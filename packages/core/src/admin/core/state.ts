import { DefaultAdminShell } from "@/admin/components.tsx";
import {
  DefaultAdminDashboardPage,
  DefaultAdminDetailPage,
  DefaultAdminFormPage,
  DefaultAdminListPage,
  DefaultAdminLoginPage,
  DefaultAdminTableCell,
} from "@/admin/components.tsx";
import { resolveAdminBrandingColors } from "@/admin/assets.ts";
import { resolveAdminConfiguration } from "@/admin/config/presets.ts";
import type {
  AdminBranding,
  AdminCreateInput,
  AdminFieldWidgetOverride,
  AdminNormalizedDashboardWidget,
  AdminNormalizedFlow,
  AdminNormalizedResource,
  AdminNormalizedView,
  AdminSessionSettings,
  ResolvedAdminComponents,
} from "@/admin/core/types.ts";
import { resolveAdminSessionSettings } from "@/admin/modules.ts";
import type { DatabaseInstance, TableRegistry } from "@/db/types.ts";

const DEFAULT_ADMIN_BRANDING: AdminBranding = {
  name: "Curio Admin",
  tagline: "Control room.",
};

export type AdminState<TTables extends TableRegistry = TableRegistry> = {
  db: DatabaseInstance<TTables>;
  basePath: string;
  branding: AdminBranding;
  resources: Record<string, AdminNormalizedResource>;
  views: Record<string, AdminNormalizedView>;
  flows: Record<string, AdminNormalizedFlow>;
  resourceByModelName: Record<string, AdminNormalizedResource>;
  dashboardWidgets: Record<string, AdminNormalizedDashboardWidget>;
  components: ResolvedAdminComponents;
  fieldWidgets: Record<string, AdminFieldWidgetOverride>;
  session: AdminSessionSettings;
  seeders: Array<
    (context: { db: DatabaseInstance<TTables> }) => Promise<void>
  >;
};

export function createAdminState<const TTables extends TableRegistry>(
  input: AdminCreateInput<TTables>,
): AdminState<TTables> {
  const resolved = resolveAdminConfiguration(input);

  return {
    db: input.db,
    basePath: input.basePath ?? "/admin",
    branding: {
      name: input.branding?.name ?? DEFAULT_ADMIN_BRANDING.name,
      tagline: input.branding?.tagline ?? DEFAULT_ADMIN_BRANDING.tagline,
      colors: resolveAdminBrandingColors(input.branding?.colors),
    },
    session: resolveAdminSessionSettings(input.session),
    components: {
      Shell: DefaultAdminShell,
      LoginPage: DefaultAdminLoginPage,
      DashboardPage: DefaultAdminDashboardPage,
      ListPage: DefaultAdminListPage,
      DetailPage: DefaultAdminDetailPage,
      FormPage: DefaultAdminFormPage,
      TableCell: DefaultAdminTableCell,
      ...resolved.components,
    },
    fieldWidgets: resolved.fieldWidgets,
    resources: resolved.resources,
    views: resolved.views,
    flows: resolved.flows,
    resourceByModelName: resolved.resourceByModelName,
    dashboardWidgets: resolved.widgets,
    seeders: resolved.seeders,
  };
}
