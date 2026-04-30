import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  deriveFlowPermissionDescription,
  deriveFlowPermissionKey,
  deriveFlowPermissionLabel,
  normalizeFlows,
} from "@/admin/config/flows.ts";

describe("admin runtime flows", () => {
  it("derives default slugs, permissions, and visible navigation", () => {
    const normalized = normalizeFlows({
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
      deriveFlowPermissionKey("operations"),
    );
    assertEquals(
      normalized.operations.permissionLabel,
      deriveFlowPermissionLabel("Operations"),
    );
    assertEquals(
      normalized.operations.permissionDescription,
      deriveFlowPermissionDescription("Operations"),
    );
    assertEquals(normalized.operations.nav.visible, true);
    assertEquals(normalized.operations.navGroup, "Flows");
    assertEquals(normalized.operations.navOrder, 0);
    assertEquals(normalized.operations.navGroupOrder, 999);
  });

  it("preserves explicit flow overrides", () => {
    const load = () => Promise.resolve({ ok: true });
    const render = () => "flow";
    const submit = () => Promise.resolve({ redirectTo: "/admin/flows/ops" });
    const normalized = normalizeFlows({
      operations: {
        config: {
          path: "ops",
          label: "Operations",
          description: "Channel configuration",
          permission: "flows:ops",
          permissionLabel: "Run Ops",
          permissionDescription: "Access operations flow.",
          nav: {
            visible: false,
            group: "Operations",
            order: 10,
            groupOrder: 30,
          },
          load,
          render,
          submit,
        },
      },
    });

    assertEquals(normalized.ops.slug, "ops");
    assertEquals(normalized.ops.description, "Channel configuration");
    assertEquals(normalized.ops.permissionKey, "flows:ops");
    assertEquals(normalized.ops.permissionLabel, "Run Ops");
    assertEquals(
      normalized.ops.permissionDescription,
      "Access operations flow.",
    );
    assertEquals(normalized.ops.nav.visible, false);
    assertEquals(normalized.ops.navGroup, "Operations");
    assertEquals(normalized.ops.navOrder, 10);
    assertEquals(normalized.ops.navGroupOrder, 30);
    assertEquals(normalized.ops.load, load);
    assertEquals(normalized.ops.render, render);
    assertEquals(normalized.ops.submit, submit);
  });
});
