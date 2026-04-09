/** @jsxImportSource preact */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { renderToString } from "preact-render-to-string";
import {
  DefaultAdminDashboardPage,
  DefaultAdminDetailPage,
  DefaultAdminFormPage,
  DefaultAdminListPage,
  DefaultAdminLoginPage,
  DefaultAdminShell,
  DefaultAdminTableCell,
} from "@/admin/components.tsx";
import { AdminIcon } from "@/admin/components/icons.tsx";
import { DefaultAdminCountWidget } from "@/admin/components/widgets.tsx";
import type {
  AdminDashboardPageProps,
  AdminDetailPageProps,
  AdminFormPageProps,
  AdminListPageProps,
  AdminShellProps,
} from "@/admin/components/types.ts";

const createShellProps = (): AdminShellProps => ({
  navigation: {
    homeItem: {
      href: "/admin",
      label: "Dashboard",
      badge: "3",
      active: true,
      kind: "home",
    },
    groups: [
      {
        label: "Admin",
        items: [
          {
            href: "/admin/resources/users",
            label: "Admin Users",
            badge: "12",
            active: true,
            kind: "resource",
          },
          {
            href: "/admin/flows/project-config",
            label: "Project Config",
            active: false,
            kind: "flow",
          },
        ],
      },
      {
        label: "API Access",
        items: [
          {
            href: "/admin/resources/api-accounts",
            label: "API Accounts",
            active: false,
            kind: "resource",
          },
        ],
      },
    ],
  },
  brandName: "Channel Admin",
  brandTagline: "Operations console.",
  currentUserEmail: "admin@example.com",
  title: "Control room",
  kicker: "Dashboard",
  subtitle: "Overview of the system.",
  headerActions: <a href="/admin/resources/users/new">New user</a>,
  flashes: [
    { tone: "success", message: "Saved." },
    { tone: "neutral", message: "Heads up." },
  ],
  logoutAction: "/admin/logout",
  children: <div>Body</div>,
});

describe("admin components", () => {
  it("renders the default shell with navigation, flashes, header actions, and logout", () => {
    const html = renderToString(<DefaultAdminShell {...createShellProps()} />);

    assertStringIncludes(html, "Channel Admin");
    assertStringIncludes(html, "Operations console.");
    assertStringIncludes(html, "Dashboard");
    assertStringIncludes(html, "Admin");
    assertStringIncludes(html, "Admin Users");
    assertStringIncludes(html, "Project Config");
    assertStringIncludes(html, "Saved.");
    assertStringIncludes(html, "Heads up.");
    assertStringIncludes(html, "New user");
    assertStringIncludes(html, 'action="/admin/logout"');
    assertStringIncludes(html, "Body");
    assertStringIncludes(html, "<details");
    assertStringIncludes(html, "API Access");
    assertStringIncludes(html, "data-curio-admin-nav-group-toggle");
    assertStringIncludes(html, 'data-group-key="admin"');
  });

  it("opens the active nav group by default and leaves inactive groups collapsed", () => {
    const html = renderToString(<DefaultAdminShell {...createShellProps()} />);

    assertStringIncludes(
      html,
      '<details data-curio-admin-nav-group="true" data-curio-admin-nav-collapsible="true" data-group-key="admin" open>',
    );
    assertStringIncludes(
      html,
      '<details data-curio-admin-nav-group="true" data-curio-admin-nav-collapsible="true" data-group-key="api-access">',
    );
  });

  it("renders flashes without an explicit tone as neutral entries", () => {
    const shell = createShellProps();
    const html = renderToString(
      <DefaultAdminShell
        {...shell}
        flashes={[{ message: "Untoned flash" }]}
      />,
    );

    assertStringIncludes(html, "Untoned flash");
    assertEquals(html.includes('data-tone="neutral"'), false);
  });

  it("omits optional shell sections when they are not provided", () => {
    const shell = createShellProps();
    const html = renderToString(
      <DefaultAdminShell
        {...shell}
        kicker={undefined}
        subtitle={undefined}
        currentUserEmail={undefined}
        headerActions={undefined}
        flashes={undefined}
      />,
    );

    assertEquals(html.includes("Sign out"), false);
    assertEquals(html.includes("Overview of the system."), false);
    assertEquals(html.includes("Saved."), false);
  });

  it("renders the default login page with explicit and fallback copy", () => {
    const explicitHtml = renderToString(
      <DefaultAdminLoginPage
        loginAction="/admin/login"
        brandName="Channel Admin"
        title="Admin Access"
        subtitle="Use your credentials."
        error="Invalid credentials"
        emailValue="admin@example.com"
      />,
    );

    assertStringIncludes(explicitHtml, "Admin Access");
    assertStringIncludes(explicitHtml, "Use your credentials.");
    assertStringIncludes(explicitHtml, "Invalid credentials");
    assertStringIncludes(explicitHtml, 'value="admin@example.com"');
    assertStringIncludes(explicitHtml, "Show");

    const fallbackHtml = renderToString(
      <DefaultAdminLoginPage
        loginAction="/admin/login"
        brandName="Channel Admin"
        brandTagline="Operations console."
      />,
    );

    assertStringIncludes(fallbackHtml, "Channel Admin");
    assertStringIncludes(fallbackHtml, "Operations console.");

    const defaultHtml = renderToString(
      <DefaultAdminLoginPage loginAction="/admin/login" />,
    );

    assertStringIncludes(defaultHtml, "Curio Admin");
    assertStringIncludes(
      defaultHtml,
      "Sign in to manage users, sessions, and records.",
    );
  });

  it("uses fallback branding, hides empty groups, and defaults nav kinds", () => {
    const shell = createShellProps();
    const html = renderToString(
      <DefaultAdminShell
        {...shell}
        brandName={undefined}
        brandTagline={undefined}
        navigation={{
          homeItem: {
            href: "/admin",
            label: "Dashboard",
            active: false,
          },
          groups: [
            {
              label: "Empty Group",
              items: [],
            },
            {
              label: "Resources",
              items: [{
                href: "/admin/resources/notes",
                label: "Notes",
                active: false,
              }],
            },
          ],
        }}
      />,
    );

    assertStringIncludes(html, "Curio Admin");
    assertStringIncludes(html, "Control room.");
    assertEquals(html.includes("Empty Group"), false);
    assertStringIncludes(html, 'data-kind="home"');
    assertStringIncludes(html, 'data-kind="resource"');
  });

  it("renders the descending sort icon", () => {
    const html = renderToString(<AdminIcon name="sort-desc" />);

    assertStringIncludes(html, "m3.6 9.9 1.8 1.9 1.8-1.9");
    assertStringIncludes(html, "M10.2 10.9h2.2");
  });

  it("renders dashboard pages with widgets and the default empty state", () => {
    const shell = createShellProps();
    const widgetProps: AdminDashboardPageProps = {
      shell,
      widgets: [
        {
          key: "users",
          size: "lg",
          pollIntervalMs: 5000,
          content: <div>Users widget</div>,
        },
      ],
    };

    const widgetHtml = renderToString(
      <DefaultAdminDashboardPage {...widgetProps} />,
    );
    assertStringIncludes(widgetHtml, "Users widget");
    assertStringIncludes(widgetHtml, 'data-size="lg"');
    assertStringIncludes(
      widgetHtml,
      'data-curio-admin-live-poll-interval="5000"',
    );

    const emptyHtml = renderToString(
      <DefaultAdminDashboardPage shell={shell} widgets={[]} />,
    );
    assertStringIncludes(emptyHtml, "No widgets available");
    assertStringIncludes(
      emptyHtml,
      "does not currently have access to any dashboard widgets.",
    );
  });

  it("renders list, detail, form, and table cell pages", () => {
    const shell = createShellProps();
    const listProps: AdminListPageProps = {
      shell,
      search: <div>Search block</div>,
      table: <div>Table block</div>,
      pagination: <div>Pagination block</div>,
    };
    const detailProps: AdminDetailPageProps = {
      shell,
      primary: <div>Primary block</div>,
      secondary: <div>Secondary block</div>,
    };
    const formProps: AdminFormPageProps = {
      shell,
      form: <div>Form block</div>,
    };

    assertStringIncludes(
      renderToString(<DefaultAdminListPage {...listProps} />),
      "Pagination block",
    );
    const detailHtml = renderToString(
      <DefaultAdminDetailPage {...detailProps} />,
    );
    assertStringIncludes(detailHtml, "Primary block");
    assertStringIncludes(detailHtml, "Secondary block");
    assertStringIncludes(
      renderToString(<DefaultAdminFormPage {...formProps} />),
      "Form block",
    );
    assertStringIncludes(
      renderToString(<DefaultAdminTableCell value={<strong>Value</strong>} />),
      "<strong>Value</strong>",
    );
  });

  it("renders default count widgets with and without links", () => {
    const linkedHtml = renderToString(
      <DefaultAdminCountWidget
        actor={{} as never}
        data={{ value: "12", copy: "Active users" }}
        href="/admin/resources/users"
        size="md"
        title="Users"
      />,
    );
    assertStringIncludes(linkedHtml, 'href="/admin/resources/users"');
    assertStringIncludes(linkedHtml, "Active users");

    const plainHtml = renderToString(
      <DefaultAdminCountWidget
        actor={{} as never}
        data={{ value: "8" }}
        size="sm"
        title="Sessions"
      />,
    );
    assertEquals(plainHtml.includes("data-curio-admin-widget-link"), false);
    assertStringIncludes(plainHtml, "Sessions");
  });
});
