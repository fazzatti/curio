/** @jsxImportSource preact */

import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { handleFlow, handleFlowSubmit } from "@/admin/http/flow-handlers.tsx";
import type {
  AdminActorContext,
  AdminNormalizedFlow,
  AdminRuntimeLike,
  OakRouterContext,
} from "@/admin/core/types.ts";
import type { FieldDefinition } from "@/db/field.ts";

const actor = {
  user: {
    email: "admin@example.com",
  },
  roles: [],
  permissions: [],
  session: {},
  permissionKeys: new Set<string>(["flows:setup"]),
  bypass: false,
} as unknown as AdminActorContext;

const createContext = (
  params: Record<string, string> = { flow: "setup" },
  formValues: Record<string, string> = {},
): OakRouterContext => ({
  params,
  request: {
    url: new URL("http://localhost/admin/flows/setup"),
    headers: new Headers(),
    body: {
      type: () => "form",
      form: async () => new URLSearchParams(formValues),
      formData: async () => {
        const data = new FormData();

        for (const [key, value] of Object.entries(formValues)) {
          data.set(key, value);
        }

        return data;
      },
    },
    ip: "127.0.0.1",
  },
  response: {
    status: 200,
    headers: new Headers(),
    body: null,
  },
  cookies: {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
  },
});

const createFlow = (
  overrides: Partial<AdminNormalizedFlow> = {},
): AdminNormalizedFlow => ({
  slug: "setup",
  label: "Setup",
  description: "Run setup tasks.",
  permissionKey: "flows:setup",
  permissionLabel: "Access setup",
  permissionDescription: "Access the setup flow.",
  nav: {},
  navGroup: "Configuration",
  navOrder: 0,
  navGroupOrder: 0,
  load: () => ({
    ready: false,
  }),
  render: ({ action, error, form }) => (
    <form action={action} method="post">
      {error ? <p>{error}</p> : null}
      <input
        name="confirm"
        value={typeof form?.get === "function"
          ? String(form.get("confirm") ?? "")
          : ""}
      />
      <button type="submit">Run setup</button>
    </form>
  ),
  submit: async ({ form }) => {
    const confirm = "get" in form ? form.get("confirm") : null;

    if (String(confirm ?? "") !== "yes") {
      throw new Error("Confirm setup.");
    }

    return {
      redirectTo: "/admin/flows/setup",
      flash: {
        tone: "success",
        message: "Setup complete.",
      },
    };
  },
  ...overrides,
});

const createAdmin = (
  flow: AdminNormalizedFlow | undefined,
): AdminRuntimeLike => ({
  db: {} as never,
  basePath: "/admin",
  branding: {
    name: "Test Admin",
    tagline: "Operator deck.",
  },
  resources: {},
  views: {},
  flows: flow ? { [flow.slug]: flow } : {},
  resourceByModelName: {},
  dashboardWidgets: {},
  components: {},
  fieldWidgets: {},
  session: {
    cookieName: "session",
    ttlMs: 1000,
    rolling: true,
    sameSite: "Strict",
  },
  prepareData: async () => {},
  resolveActor: async () => actor,
  buildNavigation: () => ({
    homeItem: {
      href: "/admin",
      label: "Dashboard",
      kind: "home",
      active: false,
    },
    groups: [],
  }),
  getActorOrRedirect: async () => actor,
  renderForbidden(ctx: OakRouterContext) {
    ctx.response.status = 403;
    ctx.response.body = "forbidden";
  },
  findResource: () => undefined,
  renderMissingResource() {},
  renderMissingView() {},
  renderMissingFlow(ctx: OakRouterContext) {
    ctx.response.status = 404;
    ctx.response.body = "missing flow";
  },
  renderMissingRecord() {},
  countResourceRecords: async () => 0,
  getRepository: () => {
    throw new Error("not used");
  },
  resolveFlashes: () => undefined,
  getRecordTitle: () => "",
  formatFieldForForm: (field: FieldDefinition, value: unknown) =>
    String(value ?? field.column),
  findView: () => undefined,
  findFlow(slug?: string) {
    if (!flow || slug !== flow.slug) {
      return undefined;
    }

    return flow;
  },
  getDashboardWidgets: async () => [],
  getDashboardPath: () => "/admin",
  getDocumentTitle: (title: string) => `${title} | Test Admin`,
  getLoginPath: () => "/admin/login",
  getLogoutPath: () => "/admin/logout",
  getResourcePath: () => "/admin/resources/unused",
  getResourceCreatePath: () => "/admin/resources/unused/new",
  getResourceDetailPath: () => "/admin/resources/unused/id",
  getResourceEditPath: () => "/admin/resources/unused/id/edit",
  getResourceDeletePath: () => "/admin/resources/unused/id/delete",
  getResourceResetPasswordPath: () => "/admin/resources/unused/id/reset-password",
  getViewPath: () => "/admin/views/unused",
  getFlowPath: () => "/admin/flows/setup",
} as unknown as AdminRuntimeLike);

describe("admin runtime flow handlers", () => {
  it("renders missing flows and regular flow pages", async () => {
    const missingAdmin = createAdmin(undefined);
    const missingContext = createContext();

    await handleFlow(missingAdmin, missingContext);

    assertEquals(missingContext.response.status, 404);
    assertEquals(missingContext.response.body, "missing flow");

    const flowAdmin = createAdmin(createFlow());
    const flowContext = createContext();

    await handleFlow(flowAdmin, flowContext);

    assertEquals(flowContext.response.status, 200);
    assertStringIncludes(String(flowContext.response.body), "Setup");
    assertStringIncludes(String(flowContext.response.body), "Run setup");
  });

  it("renders forbidden when a flow has no submit handler", async () => {
    const admin = createAdmin(createFlow({
      submit: undefined,
    }));
    const ctx = createContext();

    await handleFlowSubmit(admin, ctx);

    assertEquals(ctx.response.status, 403);
    assertEquals(ctx.response.body, "forbidden");
  });

  it("redirects successful flow submissions with flash params and re-renders failures", async () => {
    const admin = createAdmin(createFlow());
    const successContext = createContext({ flow: "setup" }, { confirm: "yes" });

    await handleFlowSubmit(admin, successContext);

    assertEquals(successContext.response.status, 303);
    assertEquals(
      successContext.response.headers.get("location"),
      "/admin/flows/setup?flash=Setup+complete.&tone=success",
    );

    const failureContext = createContext({ flow: "setup" }, { confirm: "no" });

    await handleFlowSubmit(admin, failureContext);

    assertEquals(failureContext.response.status, 200);
    assertStringIncludes(String(failureContext.response.body), "Confirm setup.");
    assertStringIncludes(String(failureContext.response.body), 'value="no"');
  });

  it("handles missing submit flows, neutral flashes, query redirects, and non-error failures", async () => {
    const missingAdmin = createAdmin(undefined);
    const missingContext = createContext();

    await handleFlowSubmit(missingAdmin, missingContext);

    assertEquals(missingContext.response.status, 404);
    assertEquals(missingContext.response.body, "missing flow");

    const neutralAdmin = createAdmin(createFlow({
      submit: async () => ({
        redirectTo: "/admin/flows/setup?tab=advanced",
        flash: {
          tone: "neutral",
          message: "Saved.",
        },
      }),
    }));
    const neutralContext = createContext({ flow: "setup" }, { confirm: "yes" });

    await handleFlowSubmit(neutralAdmin, neutralContext);

    assertEquals(
      neutralContext.response.headers.get("location"),
      "/admin/flows/setup?tab=advanced&flash=Saved.",
    );

    const plainRedirectAdmin = createAdmin(createFlow({
      submit: async () => ({
        redirectTo: "/admin/flows/setup?tab=advanced",
      }),
    }));
    const plainRedirectContext = createContext(
      { flow: "setup" },
      { confirm: "yes" },
    );

    await handleFlowSubmit(plainRedirectAdmin, plainRedirectContext);

    assertEquals(
      plainRedirectContext.response.headers.get("location"),
      "/admin/flows/setup?tab=advanced",
    );

    const stringErrorAdmin = createAdmin(createFlow({
      submit: async () => {
        throw "plain failure";
      },
    }));
    const stringErrorContext = createContext({ flow: "setup" }, { confirm: "yes" });

    await handleFlowSubmit(stringErrorAdmin, stringErrorContext);

    assertStringIncludes(
      String(stringErrorContext.response.body),
      "plain failure",
    );
  });
});
