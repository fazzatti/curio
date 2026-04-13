import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  deriveViewPermissionDescription,
  deriveViewPermissionKey,
  deriveViewPermissionLabel,
  normalizeViews,
} from "@/admin/config/views.ts";

describe("admin runtime views", () => {
  it("derives default slugs, permissions, and visible navigation", () => {
    const normalized = normalizeViews({
      operations: {
        config: {
          path: "operations",
          label: "Operations",
          render: () => "operations",
        },
      },
    });

    assertEquals(normalized.operations.slug, "operations");
    assertEquals(
      normalized.operations.permissionKey,
      deriveViewPermissionKey("operations"),
    );
    assertEquals(
      normalized.operations.permissionLabel,
      deriveViewPermissionLabel("Operations"),
    );
    assertEquals(
      normalized.operations.permissionDescription,
      deriveViewPermissionDescription("Operations"),
    );
    assertEquals(normalized.operations.nav.visible, true);
    assertEquals(normalized.operations.navGroup, "Views");
    assertEquals(normalized.operations.navOrder, 0);
    assertEquals(normalized.operations.navGroupOrder, 999);
  });

  it("preserves explicit view overrides", () => {
    const load = () => Promise.resolve({ ok: true });
    const render = () => "custom";
    const normalized = normalizeViews({
      operations: {
        config: {
          path: "ops",
          label: "Operations",
          description: "Queue status",
          permission: "views:ops",
          permissionLabel: "Open Ops",
          permissionDescription: "Open operations.",
          nav: { visible: false, group: "Operations", order: 5, groupOrder: 20 },
          live: { mode: "poll", intervalMs: 5000 },
          load,
          render,
        },
      },
    });

    assertEquals(normalized.ops.slug, "ops");
    assertEquals(normalized.ops.description, "Queue status");
    assertEquals(normalized.ops.permissionKey, "views:ops");
    assertEquals(normalized.ops.permissionLabel, "Open Ops");
    assertEquals(normalized.ops.permissionDescription, "Open operations.");
    assertEquals(normalized.ops.nav.visible, false);
    assertEquals(normalized.ops.navGroup, "Operations");
    assertEquals(normalized.ops.navOrder, 5);
    assertEquals(normalized.ops.navGroupOrder, 20);
    assertEquals(normalized.ops.live, { mode: "poll", intervalMs: 5000 });
    assertEquals(normalized.ops.load, load);
    assertEquals(normalized.ops.render, render);
  });
});
