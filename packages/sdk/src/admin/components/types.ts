import type { ComponentChildren } from "preact";

export type AdminNavItem = {
  href: string;
  label: string;
  badge?: string;
  active?: boolean;
  kind?: "home" | "view" | "flow" | "resource";
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export type AdminNavigation = {
  homeItem: AdminNavItem;
  groups: AdminNavGroup[];
};

export type AdminDashboardWidgetSize = "sm" | "md" | "lg" | "full";

export type AdminDashboardWidgetFrame = {
  key: string;
  size: AdminDashboardWidgetSize;
  content: ComponentChildren;
  pollIntervalMs?: number;
};

export type AdminFlashMessage = {
  tone?: "error" | "success" | "neutral";
  message: string;
};

export type AdminShellProps = {
  navigation: AdminNavigation;
  brandName?: string;
  brandTagline?: string;
  currentUserEmail?: string;
  title: string;
  kicker?: string;
  subtitle?: string;
  children: ComponentChildren;
  headerActions?: ComponentChildren;
  flashes?: AdminFlashMessage[];
  logoutAction: string;
};

export type AdminLoginPageProps = {
  loginAction: string;
  brandName?: string;
  brandTagline?: string;
  title?: string;
  subtitle?: string;
  error?: string;
  emailValue?: string;
};

export type AdminDashboardPageProps = {
  shell: Omit<AdminShellProps, "children">;
  widgets: AdminDashboardWidgetFrame[];
  emptyState?: ComponentChildren;
};

export type AdminListPageProps = {
  shell: Omit<AdminShellProps, "children">;
  search: ComponentChildren;
  table: ComponentChildren;
  pagination?: ComponentChildren;
};

export type AdminDetailPageProps = {
  shell: Omit<AdminShellProps, "children">;
  primary: ComponentChildren;
  secondary?: ComponentChildren;
};

export type AdminFormPageProps = {
  shell: Omit<AdminShellProps, "children">;
  form: ComponentChildren;
};

export type AdminTableCellProps = {
  value: ComponentChildren;
};

export type AdminAssignmentOption = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
};

export type AdminAssignmentFieldProps = {
  label: string;
  name: string;
  options: AdminAssignmentOption[];
  selectedIds: readonly string[];
  helperText?: string;
  emptyText?: string;
  filterPlaceholder?: string;
};
