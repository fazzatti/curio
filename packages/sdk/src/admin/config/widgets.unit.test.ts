import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  deriveWidgetPermissionDescription,
  deriveWidgetPermissionKey,
  deriveWidgetPermissionLabel,
  normalizeWidgets,
} from "@/admin/config/widgets.ts";

describe("admin runtime widgets", () => {
  it("derives default keys, permissions, and medium sizing", () => {
    const normalized = normalizeWidgets({
      users: {
        config: {
          key: "users",
          title: "Users",
          render: () => "users",
        },
      },
    });

    assertEquals(normalized.users.key, "users");
    assertEquals(normalized.users.size, "md");
    assertEquals(
      normalized.users.permissionKey,
      deriveWidgetPermissionKey("users"),
    );
    assertEquals(
      normalized.users.permissionLabel,
      deriveWidgetPermissionLabel("Users"),
    );
    assertEquals(
      normalized.users.permissionDescription,
      deriveWidgetPermissionDescription("Users"),
    );
  });

  it("preserves explicit widget overrides", () => {
    const load = async () => ({ value: "12" });
    const render = () => "widget";
    const normalized = normalizeWidgets({
      users: {
        config: {
          key: "user-stats",
          title: "Users",
          description: "Active users",
          href: "/admin/resources/users",
          size: "lg",
          permission: "widgets:user-stats",
          permissionLabel: "View user stats",
          permissionDescription: "View the users widget.",
          live: { mode: "poll", intervalMs: 2500 },
          load,
          render,
        },
      },
    });

    assertEquals(normalized["user-stats"].key, "user-stats");
    assertEquals(normalized["user-stats"].description, "Active users");
    assertEquals(
      normalized["user-stats"].href,
      "/admin/resources/users",
    );
    assertEquals(normalized["user-stats"].size, "lg");
    assertEquals(normalized["user-stats"].permissionKey, "widgets:user-stats");
    assertEquals(
      normalized["user-stats"].permissionLabel,
      "View user stats",
    );
    assertEquals(
      normalized["user-stats"].permissionDescription,
      "View the users widget.",
    );
    assertEquals(
      normalized["user-stats"].live,
      { mode: "poll", intervalMs: 2500 },
    );
    assertEquals(normalized["user-stats"].load, load);
    assertEquals(normalized["user-stats"].render, render);
  });
});
