import type { AdminFlashMessage } from "@/admin/components/types.ts";
import {
  countResourceRecords,
  formatFieldForForm,
  getRecordTitle,
  resolveFlashes,
} from "@/admin/support/utils.tsx";
import { hasAdminPermission } from "@/admin/modules.ts";
import type { FieldDefinition } from "@/db/field.ts";
import type { DatabaseInstance, RawRecord, TableRegistry } from "@/db/types.ts";
import type {
  AdminActorContext,
  AdminNormalizedFlow,
  AdminNormalizedResource,
  AdminNormalizedView,
  AdminPreparedDashboardWidget,
  AdminRuntimeLike,
  OakRouterContext,
} from "@/admin/core/types.ts";

export function findAdminResource(
  admin: AdminRuntimeLike,
  slug?: string,
): AdminNormalizedResource | undefined {
  if (!slug) {
    return undefined;
  }

  return admin.resources[slug];
}

export function findAdminView(
  admin: AdminRuntimeLike,
  slug?: string,
): AdminNormalizedView | undefined {
  if (!slug) {
    return undefined;
  }

  return admin.views[slug];
}

export function findAdminFlow(
  admin: AdminRuntimeLike,
  slug?: string,
): AdminNormalizedFlow | undefined {
  if (!slug) {
    return undefined;
  }

  return admin.flows[slug];
}

export async function countAdminResourceRecords(
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
): Promise<number> {
  return await countResourceRecords(admin, resource);
}

export function getAdminRepository<TTables extends TableRegistry>(
  admin: AdminRuntimeLike<TTables>,
  resource: AdminNormalizedResource,
): AdminRuntimeLike<TTables>["getRepository"] extends (
  resource: AdminNormalizedResource,
) => infer TResult ? TResult : never {
  return (
    admin.db as unknown as DatabaseInstance<TableRegistry>
  ).repo(
    resource.model.name as keyof TableRegistry & string,
  ) as ReturnType<AdminRuntimeLike["getRepository"]>;
}

export function resolveAdminFlashMessages(
  searchParams: URLSearchParams,
): AdminFlashMessage[] | undefined {
  return resolveFlashes(searchParams);
}

export function getAdminRecordTitle(
  resource: AdminNormalizedResource,
  record: RawRecord,
): string {
  return getRecordTitle(resource, record);
}

export function formatAdminFieldForForm(
  field: FieldDefinition,
  value: unknown,
): string {
  return formatFieldForForm(field, value);
}

export async function getAdminDashboardWidgets(
  admin: AdminRuntimeLike,
  actor: AdminActorContext,
  _ctx: OakRouterContext,
): Promise<AdminPreparedDashboardWidget[]> {
  const widgets = Object.values(admin.dashboardWidgets).filter((widget) =>
    hasAdminPermission(actor, widget.permissionKey)
  );

  return await Promise.all(
    widgets.map(async (widget) => ({
      widget,
      data: widget.load
        ? await widget.load({
          db: admin.db,
          actor,
        })
        : undefined,
    })),
  );
}
