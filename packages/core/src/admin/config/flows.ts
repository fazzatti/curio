// deno-coverage-ignore-start
import type {
  AdminFlowRegistration,
  AdminNormalizedFlow,
} from "@/admin/core/types.ts";
// deno-coverage-ignore-stop

export const deriveFlowPermissionKey = (slug: string): string => {
  return `flows:${slug}`;
};

export const deriveFlowPermissionLabel = (label: string): string => {
  return `Access ${label}`;
};

export const deriveFlowPermissionDescription = (label: string): string => {
  return `Access the ${label} flow in the admin.`;
};

export const normalizeFlows = (
  registrations: Record<string, AdminFlowRegistration>,
): Record<string, AdminNormalizedFlow> => {
  return Object.fromEntries(
    Object.entries(registrations).map(([registrationKey, registration]) => {
      const config = registration.config;
      const slug = config.path;
      const label = config.label;

      return [
        slug,
        {
          slug,
          label,
          description: config.description,
          permissionKey: config.permission ?? deriveFlowPermissionKey(slug),
          permissionLabel: config.permissionLabel ??
            deriveFlowPermissionLabel(label),
          permissionDescription: config.permissionDescription ??
            deriveFlowPermissionDescription(label),
          nav: {
            visible: config.nav?.visible ?? true,
            group: config.nav?.group ?? "Flows",
            order: config.nav?.order ?? 0,
            groupOrder: config.nav?.groupOrder ?? 999,
          },
          navGroup: config.nav?.group ?? "Flows",
          navOrder: config.nav?.order ?? 0,
          navGroupOrder: config.nav?.groupOrder ?? 999,
          load: config.load,
          render: config.render,
          submit: config.submit,
        },
      ];
    }),
  );
};
