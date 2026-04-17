/** @jsxImportSource preact */

// deno-coverage-ignore-start
import { hashPassword } from "@/auth/password.ts";
import {
  authenticateAdminUser,
  destroyAdminSession,
  hasAdminPermission,
  loadRecentAuditEventsForRecord,
  recordAdminAuditEvent,
} from "@/admin/modules.ts";
import { getSessionRepo, getUserRepo } from "@/admin/modules/repositories.ts";
import {
  getFormValue,
  getRequestIpAddress,
  getRequestUserAgent,
  parsePage,
  readForm,
  redirect,
  sendHtml,
  toQueryString,
} from "@/admin/support/utils.tsx";
import { formatUnknownError } from "@/support/errors.ts";
import {
  createRecord,
  deleteRecord,
  renderCreateForm,
  renderDeleteForm,
  renderEditForm,
  renderResetPasswordForm,
  updateRecord,
} from "@/admin/rendering/forms.tsx";
import {
  renderDetailHeaderActions,
  renderDetailPrimary,
  renderDetailSecondary,
} from "@/admin/rendering/details.tsx";
import {
  loadListState,
  renderListHeaderActions,
  renderListTable,
  renderPagination,
  renderSearchAndFilters,
} from "@/admin/rendering/listing.tsx";
import type {
  AdminDatabase,
  AdminRuntimeLike,
  AdminUserRecord,
  OakRouterContext,
} from "@/admin/core/types.ts";
import type { RawRecord } from "@/db/types.ts";
// deno-coverage-ignore-stop

export const handleLoginPage = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const actor = await admin.resolveActor(ctx);

  if (actor) {
    redirect(ctx, admin.getDashboardPath());
    return;
  }

  const LoginPage = admin.components.LoginPage;
  sendHtml(
    ctx,
    admin.getDocumentTitle("Login"),
    (
      <LoginPage
        loginAction={admin.getLoginPath()}
        brandName={admin.branding.name}
        brandTagline={admin.branding.tagline}
        error={ctx.request.url.searchParams.get("error") ?? undefined}
        emailValue={ctx.request.url.searchParams.get("email") ?? undefined}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const handleLoginSubmit = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const form = await readForm(ctx);
  const email = getFormValue(form, "email");
  const password = getFormValue(form, "password");
  await admin.prepareData();

  const loginResult = await authenticateAdminUser(
    admin.db as unknown as AdminDatabase,
    email,
    password,
    admin.session,
    {
      ipAddress: getRequestIpAddress(ctx),
      userAgent: getRequestUserAgent(ctx),
    },
  );

  if (!loginResult) {
    await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
      eventType: "auth.login_failed",
      summary: `Failed admin login attempt for ${email || "unknown email"}.`,
      resource: "auth",
      payload: { email },
      ipAddress: getRequestIpAddress(ctx),
      userAgent: getRequestUserAgent(ctx),
    });

    const params = new URLSearchParams();
    params.set("error", "Invalid credentials or missing admin access.");

    if (email) {
      params.set("email", email);
    }

    redirect(ctx, `${admin.getLoginPath()}${toQueryString(params)}`);
    return;
  }

  const { actor, token } = loginResult;

  await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
    actorUserId: (actor.user as AdminUserRecord).id,
    eventType: "auth.login_succeeded",
    summary: `Admin login succeeded for ${
      (actor.user as AdminUserRecord).email
    }.`,
    resource: "auth",
    ipAddress: getRequestIpAddress(ctx),
    userAgent: getRequestUserAgent(ctx),
  });

  await ctx.cookies.set(admin.session.cookieName, token, {
    httpOnly: true,
    sameSite: admin.session.sameSite.toLowerCase() as "strict" | "lax",
    path: admin.basePath,
    secure: ctx.request.url.protocol === "https:",
    maxAge: Math.floor(admin.session.ttlMs / 1000),
  });

  redirect(ctx, admin.getDashboardPath());
};

export const handleLogout = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const token = await ctx.cookies.get(admin.session.cookieName);
  const actor = await admin.resolveActor(ctx);

  if (actor) {
    await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
      actorUserId: (actor.user as AdminUserRecord).id,
      eventType: "auth.logout",
      summary: `Admin logout for ${(actor.user as AdminUserRecord).email}.`,
      resource: "auth",
      ipAddress: getRequestIpAddress(ctx),
      userAgent: getRequestUserAgent(ctx),
    });
  }

  await destroyAdminSession(admin.db as unknown as AdminDatabase, token);
  await ctx.cookies.delete(admin.session.cookieName, {
    path: admin.basePath,
  });
  redirect(ctx, admin.getLoginPath());
};

export const handleDashboard = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const actor = await admin.getActorOrRedirect(ctx);

  if (!actor) {
    return;
  }

  const DashboardPage = admin.components.DashboardPage;
  const dashboardWidgets = await admin.getDashboardWidgets(actor, ctx);

  sendHtml(
    ctx,
    admin.getDocumentTitle("Dashboard"),
    (
      <DashboardPage
        shell={{
          navigation: admin.buildNavigation(actor, { kind: "dashboard" }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: "Control room",
          kicker: "Dashboard",
          subtitle:
            "Monitor your admin surfaces and move directly into daily operations.",
          logoutAction: admin.getLogoutPath(),
        }}
        widgets={dashboardWidgets.map(({ widget, data }) => {
          const Renderer = widget.render;

          return {
            key: widget.key,
            size: widget.size,
            pollIntervalMs: widget.live?.mode === "poll"
              ? widget.live.intervalMs
              : undefined,
            content: (
              <Renderer
                actor={actor}
                data={data}
                href={widget.href}
                size={widget.size}
                title={widget.title}
              />
            ),
          };
        })}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const handleList = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:list`);

  if (!actor) {
    return;
  }

  const page = parsePage(ctx.request.url.searchParams.get("page"));
  const listState = await loadListState(
    admin,
    resource,
    ctx.request.url.searchParams,
  );
  const ListPage = resource.components.ListPage ?? admin.components.ListPage;
  const table = await renderListTable(
    admin,
    resource,
    actor,
    listState.records,
    ctx.request.url.searchParams,
  );

  sendHtml(
    ctx,
    admin.getDocumentTitle(resource.label),
    (
      <ListPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "resource",
            slug: resource.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: resource.label,
          kicker: "Resource",
          subtitle: `Browse and inspect ${resource.label.toLowerCase()}.`,
          logoutAction: admin.getLogoutPath(),
          headerActions: renderListHeaderActions(admin, resource, actor),
          flashes: admin.resolveFlashes(ctx.request.url.searchParams),
        }}
        search={renderSearchAndFilters(resource, ctx.request.url.searchParams)}
        table={table}
        pagination={renderPagination(
          admin,
          resource,
          page,
          listState.hasNext,
          ctx.request.url.searchParams,
        )}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const handleDetail = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:view`);

  if (!actor) {
    return;
  }

  const record = await admin.getRepository(resource).findById(
    String(ctx.params.id),
  );

  if (!record) {
    admin.renderMissingRecord(ctx, actor, resource);
    return;
  }

  const DetailPage = resource.components.DetailPage ??
    admin.components.DetailPage;
  const recentAudit = hasAdminPermission(actor, "audit:list")
    ? await loadRecentAuditEventsForRecord(
      admin.db as unknown as AdminDatabase,
      resource.slug,
      String(ctx.params.id),
    )
    : [];

  sendHtml(
    ctx,
    admin.getDocumentTitle(resource.label),
    (
      <DetailPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "resource",
            slug: resource.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: resource.model.labels.singular,
          kicker: resource.label,
          subtitle:
            `Inspect this ${resource.model.labels.singular.toLowerCase()} and its current state.`,
          logoutAction: admin.getLogoutPath(),
          headerActions: renderDetailHeaderActions(
            admin,
            resource,
            actor,
            String(ctx.params.id),
          ),
          flashes: admin.resolveFlashes(ctx.request.url.searchParams),
        }}
        primary={await renderDetailPrimary(
          admin,
          actor,
          resource,
          record as unknown as RawRecord,
        )}
        secondary={await renderDetailSecondary(
          admin,
          resource,
          actor,
          record as unknown as RawRecord,
          recentAudit,
        )}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const handleNewForm = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:create`);

  if (!actor) {
    return;
  }

  if (!resource.actions.create) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  await renderCreateForm(admin, ctx, actor, resource);
};

export const handleCreate = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:create`);

  if (!actor) {
    return;
  }

  if (!resource.actions.create) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  const form = await readForm(ctx);

  try {
    const createdId = await createRecord(admin, resource, actor, form, ctx);
    const params = new URLSearchParams();
    params.set(
      "flash",
      `${resource.model.labels.singular} created.`,
    );
    params.set("tone", "success");
    redirect(
      ctx,
      `${admin.getResourceDetailPath(resource, createdId)}${
        toQueryString(params)
      }`,
    );
  } catch (error) {
    await renderCreateForm(
      admin,
      ctx,
      actor,
      resource,
      formatUnknownError(error),
      form,
    );
  }
};

export const handleEditForm = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:update`);

  if (!actor) {
    return;
  }

  if (!resource.actions.update) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  const record = await admin.getRepository(resource).findById(
    String(ctx.params.id),
  );

  if (!record) {
    admin.renderMissingRecord(ctx, actor, resource);
    return;
  }

  await renderEditForm(
    admin,
    ctx,
    actor,
    resource,
    record as unknown as RawRecord,
  );
};

export const handleUpdate = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:update`);

  if (!actor) {
    return;
  }

  if (!resource.actions.update) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  const form = await readForm(ctx);

  try {
    await updateRecord(
      admin,
      resource,
      actor,
      String(ctx.params.id),
      form,
      ctx,
    );
    const params = new URLSearchParams();
    params.set(
      "flash",
      `${resource.model.labels.singular} updated.`,
    );
    params.set("tone", "success");
    redirect(
      ctx,
      `${admin.getResourceDetailPath(resource, String(ctx.params.id))}${
        toQueryString(params)
      }`,
    );
  } catch (error) {
    const record = await admin.getRepository(resource).findById(
      String(ctx.params.id),
    );

    if (!record) {
      admin.renderMissingRecord(ctx, actor, resource);
      return;
    }

    await renderEditForm(
      admin,
      ctx,
      actor,
      resource,
      record as unknown as RawRecord,
      formatUnknownError(error),
      form,
    );
  }
};

export const handleResetPasswordForm = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (
    !resource || resource.slug !== "users" || !resource.actions.reset_password
  ) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, "users:reset_password");

  if (!actor) {
    return;
  }

  const record = await admin.getRepository(resource).findById(
    String(ctx.params.id),
  );

  if (!record) {
    admin.renderMissingRecord(ctx, actor, resource);
    return;
  }

  const FormPage = resource.components.FormPage ?? admin.components.FormPage;
  sendHtml(
    ctx,
    admin.getDocumentTitle("Reset Password"),
    (
      <FormPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "resource",
            slug: resource.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: "Reset password",
          kicker: "Users",
          subtitle: `Set a new password for ${
            (record as AdminUserRecord).email
          }.`,
          logoutAction: admin.getLogoutPath(),
        }}
        form={renderResetPasswordForm(admin, resource, String(ctx.params.id))}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const handleResetPassword = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource || resource.slug !== "users") {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, "users:reset_password");

  if (!actor) {
    return;
  }

  if (!resource.actions.reset_password) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  const form = await readForm(ctx);
  const password = getFormValue(form, "password");
  const confirmation = getFormValue(form, "passwordConfirmation");

  if (!password || password !== confirmation) {
    await handleResetPasswordForm(admin, ctx);
    return;
  }

  const passwordHash = await hashPassword(password);
  await admin.db.transaction(async (database) => {
    const tx = database as unknown as AdminDatabase;
    const sessionRepo = getSessionRepo(tx);
    await getUserRepo(tx).updateById(
      String(ctx.params.id),
      {
        passwordHash,
        updatedAt: new Date(),
      },
    );

    const sessions = await sessionRepo.findMany({
      where: { userId: String(ctx.params.id) },
    }) as Array<{ id: string }>;

    for (const session of sessions) {
      await sessionRepo.deleteById(session.id);
    }
  });

  await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
    actorUserId: (actor.user as AdminUserRecord).id,
    eventType: "admin.users.reset_password",
    resource: "users",
    recordId: String(ctx.params.id),
    summary: `Password reset for user ${String(ctx.params.id)}.`,
    ipAddress: getRequestIpAddress(ctx),
    userAgent: getRequestUserAgent(ctx),
  });

  const params = new URLSearchParams();
  params.set("flash", "Password reset completed.");
  params.set("tone", "success");
  redirect(
    ctx,
    `${admin.getResourceDetailPath("users", String(ctx.params.id))}${
      toQueryString(params)
    }`,
  );
};

export const handleDeleteForm = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:delete`);

  if (!actor) {
    return;
  }

  if (!resource.actions.delete) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  const record = await admin.getRepository(resource).findById(
    String(ctx.params.id),
  );

  if (!record) {
    admin.renderMissingRecord(ctx, actor, resource);
    return;
  }

  const FormPage = resource.components.FormPage ?? admin.components.FormPage;
  sendHtml(
    ctx,
    admin.getDocumentTitle(
      `Delete ${resource.model.labels.singular}`,
    ),
    (
      <FormPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "resource",
            slug: resource.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: `Delete ${
            admin.getRecordTitle(resource, record as unknown as RawRecord)
          }`,
          kicker: resource.label,
          subtitle:
            "This action is irreversible. Confirm deliberately before continuing.",
          logoutAction: admin.getLogoutPath(),
        }}
        form={renderDeleteForm(admin, resource, String(ctx.params.id))}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const handleDelete = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const resource = admin.findResource(ctx.params.resource);

  if (!resource) {
    admin.renderMissingResource(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, `${resource.slug}:delete`);

  if (!actor) {
    return;
  }

  if (!resource.actions.delete) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  const form = await readForm(ctx);

  if (getFormValue(form, "confirmDelete") !== "true") {
    await handleDeleteForm(admin, ctx);
    return;
  }

  await deleteRecord(admin, resource, actor, String(ctx.params.id), ctx);

  const params = new URLSearchParams();
  params.set("flash", `${resource.model.labels.singular} deleted.`);
  params.set("tone", "success");
  redirect(
    ctx,
    `${admin.getResourcePath(resource)}${toQueryString(params)}`,
  );
};

export const handleView = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const view = admin.findView(ctx.params.view);

  if (!view) {
    admin.renderMissingView(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, view.permissionKey);

  if (!actor) {
    return;
  }

  const DetailPage = admin.components.DetailPage;
  const ViewRenderer = view.render;
  const data = view.load
    ? await view.load({
      db: admin.db,
      actor,
      ctx,
    })
    : undefined;

  sendHtml(
    ctx,
    admin.getDocumentTitle(view.label),
    (
      <DetailPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "view",
            slug: view.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: view.label,
          kicker: "View",
          subtitle: view.description,
          logoutAction: admin.getLogoutPath(),
          flashes: admin.resolveFlashes(ctx.request.url.searchParams),
        }}
        primary={view.live?.mode === "poll"
          ? (
            <div
              data-curio-admin-live-poll-interval={view.live.intervalMs}
            >
              <ViewRenderer actor={actor} data={data} />
            </div>
          )
          : <ViewRenderer actor={actor} data={data} />}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};
