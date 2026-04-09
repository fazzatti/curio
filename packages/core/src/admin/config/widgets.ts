// deno-coverage-ignore-start
import type {
  AdminDashboardWidgetRegistration,
  AdminNormalizedDashboardWidget,
} from "@/admin/core/types.ts";
// deno-coverage-ignore-stop

export const deriveWidgetPermissionKey = (key: string): string => {
  return `widgets:${key}`;
};

export const deriveWidgetPermissionLabel = (title: string): string => {
  return `Access ${title}`;
};

export const deriveWidgetPermissionDescription = (title: string): string => {
  return `View the ${title} widget on the admin dashboard.`;
};

export const normalizeWidgets = (
  registrations: Record<string, AdminDashboardWidgetRegistration>,
): Record<string, AdminNormalizedDashboardWidget> => {
  return Object.fromEntries(
    Object.entries(registrations).map(([registrationKey, registration]) => {
      const config = registration.config;
      const key = config.key;
      const title = config.title;

      return [
        key,
        {
          key,
          title,
          description: config.description,
          href: config.href,
          size: config.size ?? "md",
          permissionKey: config.permission ?? deriveWidgetPermissionKey(key),
          permissionLabel: config.permissionLabel ??
            deriveWidgetPermissionLabel(title),
          permissionDescription: config.permissionDescription ??
            deriveWidgetPermissionDescription(title),
          live: config.live,
          load: config.load,
          render: config.render,
        },
      ];
    }),
  );
};
