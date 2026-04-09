import type {
  AdminActorContext,
  AdminRuntimeLike,
  OakRouterContext,
} from "@/admin/core/types.ts";
import { redirect } from "@/admin/support/utils.tsx";
import type { AdminState } from "@/admin/core/state.ts";
import type { TableRegistry } from "@/db/types.ts";
import {
  hasAdminPermission,
  resolveAdminActor,
  seedRegisteredAdminPermissions,
} from "@/admin/modules.ts";

export async function prepareAdminData<TTables extends TableRegistry>(
  state: AdminState<TTables>,
): Promise<void> {
  for (const seed of state.seeders) {
    await seed({ db: state.db });
  }

  await seedRegisteredAdminPermissions(
    state.db as never,
    {
      views: state.views,
      flows: state.flows,
      widgets: state.dashboardWidgets,
    },
  );
}

export async function resolveAdminRuntimeActor(
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<AdminActorContext | null> {
  await admin.prepareData();
  const token = await ctx.cookies.get(admin.session.cookieName);
  return await resolveAdminActor(
    admin.db as never,
    token,
    admin.session,
  );
}

export async function getAdminActorOrRedirect(
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
  permissionKey?: string,
): Promise<AdminActorContext | null> {
  const actor = await admin.resolveActor(ctx);

  if (!actor) {
    redirect(ctx, admin.getLoginPath());
    return null;
  }

  if (permissionKey && !hasAdminPermission(actor, permissionKey)) {
    admin.renderForbidden(ctx, actor);
    return null;
  }

  return actor;
}
