import type {
  AdminActorContext,
  AdminNavigationTarget,
  AdminRuntimeLike,
} from "@/admin/core/types.ts";
import type { AdminNavigation } from "@/admin/components/types.ts";
import { hasAdminPermission } from "@/admin/modules.ts";

const NAV_KIND_ORDER = {
  view: 0,
  flow: 1,
  resource: 2,
} as const;

export function buildAdminNavigation(
  admin: AdminRuntimeLike,
  actor: AdminActorContext | null,
  currentTarget: AdminNavigationTarget = { kind: "dashboard" },
): AdminNavigation {
  const groupedItems = new Map<
    string,
    {
      label: string;
      order: number;
      items: Array<{
        href: string;
        label: string;
        active: boolean;
        kind: "view" | "flow" | "resource";
        order: number;
        badge?: string;
      }>;
    }
  >();

  const addNavItem = (
    groupLabel: string,
    groupOrder: number,
    item: {
      href: string;
      label: string;
      active: boolean;
      kind: "view" | "flow" | "resource";
      order: number;
      badge?: string;
    },
  ) => {
    const existing = groupedItems.get(groupLabel);

    if (existing) {
      existing.order = Math.min(existing.order, groupOrder);
      existing.items.push(item);
      return;
    }

    groupedItems.set(groupLabel, {
      label: groupLabel,
      order: groupOrder,
      items: [item],
    });
  };

  for (const view of Object.values(admin.views)) {
    if (
      view.nav.visible === false ||
      !hasAdminPermission(actor, view.permissionKey)
    ) {
      continue;
    }

    addNavItem(view.navGroup, view.navGroupOrder, {
      href: admin.getViewPath(view),
      label: view.label,
      active: currentTarget.kind === "view" && currentTarget.slug === view.slug,
      kind: "view",
      order: view.navOrder,
    });
  }

  for (const flow of Object.values(admin.flows)) {
    if (
      flow.nav.visible === false ||
      !hasAdminPermission(actor, flow.permissionKey)
    ) {
      continue;
    }

    addNavItem(flow.navGroup, flow.navGroupOrder, {
      href: admin.getFlowPath(flow),
      label: flow.label,
      active: currentTarget.kind === "flow" && currentTarget.slug === flow.slug,
      kind: "flow",
      order: flow.navOrder,
    });
  }

  for (const resource of Object.values(admin.resources)) {
    if (
      resource.nav.visible === false ||
      !(
        hasAdminPermission(actor, `${resource.slug}:list`) ||
        hasAdminPermission(actor, `${resource.slug}:view`)
      )
    ) {
      continue;
    }

    addNavItem(resource.navGroup, resource.navGroupOrder, {
      href: admin.getResourcePath(resource),
      label: resource.label,
      active: currentTarget.kind === "resource" &&
        currentTarget.slug === resource.slug,
      kind: "resource",
      order: resource.navOrder,
    });
  }

  return {
    homeItem: {
      href: admin.getDashboardPath(),
      label: "Dashboard",
      active: currentTarget.kind === "dashboard",
      kind: "home" as const,
    },
    groups: [...groupedItems.values()]
      .sort((left, right) =>
        left.order - right.order || left.label.localeCompare(right.label)
      )
      .map((group) => ({
        label: group.label,
        items: [...group.items]
          .sort((left, right) =>
            NAV_KIND_ORDER[left.kind] - NAV_KIND_ORDER[right.kind] ||
            left.order - right.order ||
            left.label.localeCompare(right.label)
          )
          .map((item) => ({
            href: item.href,
            label: item.label,
            active: item.active,
            kind: item.kind,
          })),
      })),
  };
}
