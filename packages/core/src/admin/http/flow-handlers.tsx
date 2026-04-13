/** @jsxImportSource preact */

// deno-coverage-ignore-start
import { readForm, redirect, sendHtml } from "@/admin/support/utils.tsx";
import { formatUnknownError } from "@/support/errors.ts";
import type {
  AdminActorContext,
  AdminFlowSubmitResult,
  AdminNormalizedFlow,
  AdminRuntimeLike,
  AdminUserRecord,
  OakRouterContext,
} from "@/admin/core/types.ts";
// deno-coverage-ignore-stop

const renderFlowPage = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
  actor: AdminActorContext,
  flow: AdminNormalizedFlow,
  error?: string,
  form?: URLSearchParams | FormData,
): Promise<void> => {
  const FormPage = admin.components.FormPage;
  const FlowRenderer = flow.render;
  const data = flow.load
    ? await flow.load({
      db: admin.db,
      actor,
      ctx,
    })
    : undefined;

  sendHtml(
    ctx,
    admin.getDocumentTitle(flow.label),
    (
      <FormPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "flow",
            slug: flow.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: flow.label,
          kicker: "Flow",
          subtitle: flow.description,
          logoutAction: admin.getLogoutPath(),
          flashes: admin.resolveFlashes(ctx.request.url.searchParams),
        }}
        form={
          <FlowRenderer
            action={admin.getFlowPath(flow)}
            actor={actor}
            data={data}
            error={error}
            form={form}
          />
        }
      />
    ),
    admin.basePath,
  );
};

const resolveFlowRedirect = (
  admin: AdminRuntimeLike,
  flow: AdminNormalizedFlow,
  result?: AdminFlowSubmitResult | void,
): string => {
  const location = result?.redirectTo ?? admin.getFlowPath(flow);
  const flash = result?.flash;

  if (!flash) {
    return location;
  }

  const separator = location.includes("?") ? "&" : "?";
  const params = new URLSearchParams();
  params.set("flash", flash.message);

  if (flash.tone && flash.tone !== "neutral") {
    params.set("tone", flash.tone);
  }

  return `${location}${separator}${params.toString()}`;
};

export const handleFlow = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const flow = admin.findFlow(ctx.params.flow);

  if (!flow) {
    admin.renderMissingFlow(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, flow.permissionKey);

  if (!actor) {
    return;
  }

  await renderFlowPage(admin, ctx, actor, flow);
};

export const handleFlowSubmit = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
): Promise<void> => {
  const flow = admin.findFlow(ctx.params.flow);

  if (!flow) {
    admin.renderMissingFlow(ctx);
    return;
  }

  const actor = await admin.getActorOrRedirect(ctx, flow.permissionKey);

  if (!actor) {
    return;
  }

  if (!flow.submit) {
    admin.renderForbidden(ctx, actor);
    return;
  }

  const form = await readForm(ctx);

  try {
    const data = flow.load
      ? await flow.load({
        db: admin.db,
        actor,
        ctx,
      })
      : undefined;
    const result = await flow.submit({
      db: admin.db,
      actor,
      ctx,
      form,
      data,
    });

    redirect(ctx, resolveFlowRedirect(admin, flow, result));
  } catch (error) {
    await renderFlowPage(
      admin,
      ctx,
      actor,
      flow,
      formatUnknownError(error),
      form,
    );
  }
};
