// deno-coverage-ignore-start
import type {
  AdminNormalizedView,
  AdminViewRegistration,
} from "@/admin/core/types.ts";
// deno-coverage-ignore-stop

export const deriveViewPermissionKey = (slug: string): string => {
  return `views:${slug}`;
};

export const deriveViewPermissionLabel = (label: string): string => {
  return `Access ${label}`;
};

export const deriveViewPermissionDescription = (label: string): string => {
  return `Open the ${label} view in the admin.`;
};

export const normalizeViews = (
  registrations: Record<string, AdminViewRegistration>,
): Record<string, AdminNormalizedView> => {
  return Object.fromEntries(
    Object.entries(registrations).map(([_registrationKey, registration]) => {
      const config = registration.config;
      const slug = config.path;
      const label = config.label;

      return [
        slug,
        {
          slug,
          label,
          description: config.description,
          permissionKey: config.permission ?? deriveViewPermissionKey(slug),
          permissionLabel: config.permissionLabel ??
            deriveViewPermissionLabel(label),
          permissionDescription: config.permissionDescription ??
            deriveViewPermissionDescription(label),
          nav: {
            visible: config.nav?.visible ?? true,
            group: config.nav?.group ?? "Views",
            order: config.nav?.order ?? 0,
            groupOrder: config.nav?.groupOrder ?? 999,
          },
          navGroup: config.nav?.group ?? "Views",
          navOrder: config.nav?.order ?? 0,
          navGroupOrder: config.nav?.groupOrder ?? 999,
          live: config.live,
          load: config.load,
          render: config.render,
        },
      ];
    }),
  );
};
