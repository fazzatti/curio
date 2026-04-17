/** @jsxImportSource preact */

import type {
  AdminActorContext,
  AdminNormalizedResource,
  AdminRuntimeLike,
  OakRouterContext,
} from "@/admin/core/types.ts";
import { sendHtml } from "@/admin/support/utils.tsx";

export function renderAdminForbidden(
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
  actor: AdminActorContext,
): void {
  const Shell = admin.components.Shell;
  sendHtml(
    ctx,
    admin.getDocumentTitle("Forbidden"),
    (
      <Shell
        navigation={admin.buildNavigation(actor)}
        brandName={admin.branding.name}
        brandTagline={admin.branding.tagline}
        currentUserEmail={(actor.user as unknown as { email: string }).email}
        title="Not permitted"
        kicker="Admin"
        subtitle="This account does not have permission to access the requested admin surface."
        logoutAction={admin.getLogoutPath()}
      >
        <section data-curio-admin-card>
          <div data-curio-admin-card-inner>
            <div data-curio-admin-flash data-tone="error">
              You do not have permission to access this page.
            </div>
          </div>
        </section>
      </Shell>
    ),
    admin.basePath,
    403,
    admin.branding,
  );
}

export function renderMissingAdminResource(
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): void {
  sendHtml(
    ctx,
    admin.getDocumentTitle("Not Found"),
    <div data-curio-admin-login>
      <div data-curio-admin-flash data-tone="error">
        Admin resource not found.
      </div>
    </div>,
    admin.basePath,
    404,
    admin.branding,
  );
}

export function renderMissingAdminView(
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): void {
  sendHtml(
    ctx,
    admin.getDocumentTitle("Not Found"),
    <div data-curio-admin-login>
      <div data-curio-admin-flash data-tone="error">
        Admin view not found.
      </div>
    </div>,
    admin.basePath,
    404,
    admin.branding,
  );
}

export function renderMissingAdminFlow(
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): void {
  sendHtml(
    ctx,
    admin.getDocumentTitle("Not Found"),
    <div data-curio-admin-login>
      <div data-curio-admin-flash data-tone="error">
        Admin flow not found.
      </div>
    </div>,
    admin.basePath,
    404,
    admin.branding,
  );
}

export function renderMissingAdminRecord(
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
  actor: AdminActorContext,
  resource: AdminNormalizedResource,
): void {
  const Shell = admin.components.Shell;
  sendHtml(
    ctx,
    admin.getDocumentTitle("Not Found"),
    (
      <Shell
        navigation={admin.buildNavigation(actor, {
          kind: "resource",
          slug: resource.slug,
        })}
        brandName={admin.branding.name}
        brandTagline={admin.branding.tagline}
        currentUserEmail={(actor.user as unknown as { email: string }).email}
        title="Record not found"
        kicker={resource.label}
        subtitle="The requested record no longer exists or is unavailable."
        logoutAction={admin.getLogoutPath()}
      >
        <section data-curio-admin-card>
          <div data-curio-admin-card-inner>
            <div data-curio-admin-flash data-tone="error">
              This record could not be found.
            </div>
          </div>
        </section>
      </Shell>
    ),
    admin.basePath,
    404,
    admin.branding,
  );
}
