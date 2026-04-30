/** @jsxImportSource preact */

import { assertEquals, assertStringIncludes } from "@std/assert";
import type { FunctionComponent } from "preact";
import type { AdminShellProps } from "@/admin/components/types.ts";
import {
  renderAdminForbidden,
  renderMissingAdminRecord,
} from "@/admin/core/responses.tsx";
import type {
  AdminActorContext,
  AdminNavigationTarget,
  AdminNormalizedResource,
  AdminRuntimeLike,
  AdminUserRecord,
  OakRouterContext,
} from "@/admin/core/types.ts";

const createContext = (): OakRouterContext => ({
  params: {},
  request: {
    url: new URL("http://localhost/admin"),
    headers: new Headers(),
    body: {
      type: () => "form",
      form: () => Promise.resolve(new URLSearchParams()),
      formData: () => Promise.resolve(new FormData()),
    },
    ip: "127.0.0.1",
  },
  response: {
    status: 200,
    headers: new Headers(),
    body: null,
  },
  cookies: {
    get: () => Promise.resolve(undefined),
    set: () => Promise.resolve(undefined),
    delete: () => Promise.resolve(undefined),
  },
});

const createActor = (): AdminActorContext => ({
  user: {
    id: "actor",
    email: "admin@example.com",
    passwordHash: "hash",
  } as AdminUserRecord,
  roles: [],
  permissions: [],
  session: {} as never,
  permissionKeys: new Set<string>(),
  bypass: false,
});

const resource = {
  slug: "users",
  label: "Users",
  model: {
    labels: {
      singular: "User",
      plural: "Users",
    },
  },
} as AdminNormalizedResource;

const navigationCalls: AdminNavigationTarget[] = [];

const CustomShell: FunctionComponent<AdminShellProps> = (
  { children, title, subtitle },
) => (
  <main
    data-curio-custom-shell
    data-title={title}
    data-subtitle={subtitle}
  >
    {children}
  </main>
);

const createAdmin = (): AdminRuntimeLike => ({
  basePath: "/admin",
  branding: {
    name: "Curio",
    tagline: "Internal tools",
  },
  components: {
    Shell: CustomShell,
  },
  buildNavigation: (
    _actor: AdminActorContext | null,
    currentTarget?: AdminNavigationTarget,
  ) => {
    if (currentTarget) {
      navigationCalls.push(currentTarget);
    }

    return {
      homeItem: {
        href: "/admin",
        label: "Home",
      },
      groups: [],
    };
  },
  getDocumentTitle: (title: string) => `Curio | ${title}`,
  getLogoutPath: () => "/admin/logout",
} as unknown as AdminRuntimeLike);

Deno.test("renderAdminForbidden uses the configured shell override", () => {
  navigationCalls.length = 0;

  const admin = createAdmin();
  const ctx = createContext();

  renderAdminForbidden(admin, ctx, createActor());

  assertEquals(ctx.response.status, 403);
  assertEquals(
    ctx.response.headers.get("content-type"),
    "text/html; charset=utf-8",
  );
  assertStringIncludes(String(ctx.response.body), "data-curio-custom-shell");
  assertStringIncludes(String(ctx.response.body), "Not permitted");
  assertStringIncludes(
    String(ctx.response.body),
    "You do not have permission to access this page.",
  );
  assertEquals(navigationCalls, []);
});

Deno.test("renderMissingAdminRecord uses the configured shell override and resource target", () => {
  navigationCalls.length = 0;

  const admin = createAdmin();
  const ctx = createContext();

  renderMissingAdminRecord(admin, ctx, createActor(), resource);

  assertEquals(ctx.response.status, 404);
  assertStringIncludes(String(ctx.response.body), "data-curio-custom-shell");
  assertStringIncludes(String(ctx.response.body), "Record not found");
  assertStringIncludes(
    String(ctx.response.body),
    "This record could not be found.",
  );
  assertEquals(navigationCalls, [{
    kind: "resource",
    slug: "users",
  }]);
});
