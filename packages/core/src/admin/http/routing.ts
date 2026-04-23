import type { Application } from "@oak/oak";
import { Router } from "@oak/oak";
import { ADMIN_CLIENT_SCRIPT, ADMIN_STYLESHEET } from "@/admin/assets.ts";
import { handleFlow, handleFlowSubmit } from "@/admin/http/flow-handlers.tsx";
import {
  handleCreate,
  handleDashboard,
  handleDelete,
  handleDeleteForm,
  handleDetail,
  handleEditForm,
  handleList,
  handleLoginPage,
  handleLoginSubmit,
  handleLogout,
  handleNewForm,
  handleResetPassword,
  handleResetPasswordForm,
  handleUpdate,
  handleView,
} from "@/admin/http/handlers.tsx";
import type { AdminRuntimeLike } from "@/admin/core/types.ts";

export function mountAdminRoutes(
  admin: AdminRuntimeLike,
  app: Pick<Application, "use">,
): void {
  const router = new Router();
  const basePath = admin.basePath;

  router.get(`${basePath}/assets/admin.css`, (ctx) => {
    ctx.response.status = 200;
    ctx.response.headers.set("content-type", "text/css; charset=utf-8");
    ctx.response.body = ADMIN_STYLESHEET;
  });

  router.get(`${basePath}/assets/admin.js`, (ctx) => {
    ctx.response.status = 200;
    ctx.response.headers.set(
      "content-type",
      "application/javascript; charset=utf-8",
    );
    ctx.response.body = ADMIN_CLIENT_SCRIPT;
  });

  router.get(admin.getLoginPath(), (ctx) => handleLoginPage(admin, ctx));
  router.post(admin.getLoginPath(), (ctx) => handleLoginSubmit(admin, ctx));
  router.post(admin.getLogoutPath(), (ctx) => handleLogout(admin, ctx));
  router.get(admin.getDashboardPath(), (ctx) => handleDashboard(admin, ctx));
  router.get(
    `${basePath}/resources/:resource/new`,
    (ctx) => handleNewForm(admin, ctx),
  );
  router.post(
    `${basePath}/resources/:resource/new`,
    (ctx) => handleCreate(admin, ctx),
  );
  router.get(
    `${basePath}/resources/:resource/:id/edit`,
    (ctx) => handleEditForm(admin, ctx),
  );
  router.post(
    `${basePath}/resources/:resource/:id/edit`,
    (ctx) => handleUpdate(admin, ctx),
  );
  router.get(
    `${basePath}/resources/:resource/:id/reset-password`,
    (ctx) => handleResetPasswordForm(admin, ctx),
  );
  router.post(
    `${basePath}/resources/:resource/:id/reset-password`,
    (ctx) => handleResetPassword(admin, ctx),
  );
  router.get(
    `${basePath}/resources/:resource/:id/delete`,
    (ctx) => handleDeleteForm(admin, ctx),
  );
  router.post(
    `${basePath}/resources/:resource/:id/delete`,
    (ctx) => handleDelete(admin, ctx),
  );
  router.get(
    `${basePath}/resources/:resource/:id`,
    (ctx) => handleDetail(admin, ctx),
  );
  router.get(
    `${basePath}/resources/:resource`,
    (ctx) => handleList(admin, ctx),
  );
  router.get(`${basePath}/views/:view`, (ctx) => handleView(admin, ctx));
  router.get(`${basePath}/flows/:flow`, (ctx) => handleFlow(admin, ctx));
  router.post(
    `${basePath}/flows/:flow`,
    (ctx) => handleFlowSubmit(admin, ctx),
  );

  app.use(router.routes());
  app.use(router.allowedMethods());
}
