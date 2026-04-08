import type {
  AdminBranding,
  AdminNormalizedFlow,
  AdminNormalizedResource,
  AdminNormalizedView,
} from "@/admin/core/types.ts";

export function getAdminDocumentTitle(
  branding: AdminBranding,
  title: string,
): string {
  return `${title} • ${branding.name}`;
}

export function getAdminDashboardPath(basePath: string): string {
  return basePath;
}

export function getAdminLoginPath(basePath: string): string {
  return `${basePath}/login`;
}

export function getAdminLogoutPath(basePath: string): string {
  return `${basePath}/logout`;
}

export function getAdminResourcePath(
  basePath: string,
  resource: AdminNormalizedResource | string,
): string {
  const slug = typeof resource === "string" ? resource : resource.slug;
  return `${basePath}/resources/${slug}`;
}

export function getAdminResourceCreatePath(
  basePath: string,
  resource: AdminNormalizedResource | string,
): string {
  return `${getAdminResourcePath(basePath, resource)}/new`;
}

export function getAdminResourceDetailPath(
  basePath: string,
  resource: AdminNormalizedResource | string,
  id: string,
): string {
  return `${getAdminResourcePath(basePath, resource)}/${id}`;
}

export function getAdminResourceEditPath(
  basePath: string,
  resource: AdminNormalizedResource | string,
  id: string,
): string {
  return `${getAdminResourceDetailPath(basePath, resource, id)}/edit`;
}

export function getAdminResourceDeletePath(
  basePath: string,
  resource: AdminNormalizedResource | string,
  id: string,
): string {
  return `${getAdminResourceDetailPath(basePath, resource, id)}/delete`;
}

export function getAdminResourceResetPasswordPath(
  basePath: string,
  resource: AdminNormalizedResource | string,
  id: string,
): string {
  return `${getAdminResourceDetailPath(basePath, resource, id)}/reset-password`;
}

export function getAdminViewPath(
  basePath: string,
  view: AdminNormalizedView | string,
): string {
  const slug = typeof view === "string" ? view : view.slug;
  return `${basePath}/views/${slug}`;
}

export function getAdminFlowPath(
  basePath: string,
  flow: AdminNormalizedFlow | string,
): string {
  const slug = typeof flow === "string" ? flow : flow.slug;
  return `${basePath}/flows/${slug}`;
}
