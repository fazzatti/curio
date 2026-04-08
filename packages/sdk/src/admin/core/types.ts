import type { ComponentChildren, FunctionComponent } from "preact";
import type {
  AdminDashboardPageProps,
  AdminDashboardWidgetSize,
  AdminDetailPageProps,
  AdminFlashMessage,
  AdminFormPageProps,
  AdminListPageProps,
  AdminLoginPageProps,
  AdminNavigation,
  AdminShellProps,
  AdminTableCellProps,
} from "@/admin/components/types.ts";
import type {
  AdminActorContext,
  AdminAuditEventRecord,
  AdminDatabase,
  AdminRoleRecord,
  AdminSessionSettings,
  AdminUserRecord,
  RepositoryLike,
} from "@/admin/modules/types.ts";
import type { BoundEntityClass, Entity } from "@/db/entity.ts";
import type { FieldDefinition } from "@/db/field.ts";
import type { Model } from "@/db/model.ts";
import type {
  DatabaseInstance,
  OrderByClause,
  RawRecord,
  TableRegistry,
} from "@/db/types.ts";

/** Form-like input source used by admin hooks and flows. */
export type FormSource = URLSearchParams | FormData;

type OakCookieOptions = {
  path?: string;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax";
  secure?: boolean;
  maxAge?: number;
};

type OakBodyReader = {
  type(): string;
  form(): Promise<URLSearchParams>;
  formData(): Promise<FormData>;
};

/**
 * Minimal Oak router context surface consumed by Curio admin.
 *
 * @remarks
 * The admin runtime intentionally depends on only a narrow subset of Oak's
 * context API so the surrounding code stays easier to test.
 */
export type OakRouterContext = {
  params: Record<string, string | undefined>;
  request: {
    url: URL;
    headers: Headers;
    body: OakBodyReader;
    ip?: string;
  };
  response: {
    status: number;
    headers: Headers;
    body: unknown;
  };
  cookies: {
    get(name: string): Promise<string | undefined>;
    set(
      name: string,
      value: string,
      options?: OakCookieOptions,
    ): Promise<unknown>;
    delete(
      name: string,
      options?: Pick<OakCookieOptions, "path">,
    ): Promise<unknown>;
  };
};

/** Built-in CRUD-style actions recognized by admin resources. */
export type AdminAction =
  | "list"
  | "view"
  | "create"
  | "update"
  | "delete"
  | "reset_password";

/** Supported built-in filter widgets for admin list pages. */
export type AdminFilterType = "text" | "select" | "boolean" | "date";

/**
 * Polling configuration for live admin surfaces.
 *
 * @remarks
 * Live polling refreshes only the page's live root fragment instead of
 * reloading the whole document.
 */
export type AdminLiveConfig = {
  mode: "poll";
  intervalMs: number;
};

/** Branding metadata shown in the admin shell. */
export type AdminBranding = {
  name: string;
  tagline: string;
};

/** Navigation metadata for admin resources, views, and flows. */
export type AdminNavConfig = {
  visible?: boolean;
  group?: string;
  order?: number;
  groupOrder?: number;
};

/** Filter configuration rendered on list pages. */
export type AdminFilterConfig = {
  field: string;
  label?: string;
  type?: AdminFilterType;
  options?: Array<{ label: string; value: string }>;
};

/** Field-level admin metadata reserved for future finer-grained visibility rules. */
export type AdminFieldAccessConfig = {
  visible?: boolean;
  editable?: boolean;
  editableOnCreate?: boolean;
  editableOnUpdate?: boolean;
};

/** Widget renderer props passed to custom field widgets. */
export type AdminWidgetRendererProps = {
  mode: "list" | "detail" | "form";
  resourceKey: string;
  fieldName: string;
  field: FieldDefinition;
  record?: RawRecord;
  value?: unknown;
  inputName?: string;
  db?: DatabaseInstance<TableRegistry>;
  actor?: AdminActorContext;
};

/** Small render override for field widgets. */
export type AdminFieldWidgetOverride = Partial<{
  list: (
    props: AdminWidgetRendererProps,
  ) => ComponentChildren | Promise<ComponentChildren>;
  detail: (
    props: AdminWidgetRendererProps,
  ) => ComponentChildren | Promise<ComponentChildren>;
  form: (
    props: AdminWidgetRendererProps,
  ) => ComponentChildren | Promise<ComponentChildren>;
}>;

/** Component slots accepted by Curio admin. */
export type AdminComponentOverrides = Partial<{
  Shell: FunctionComponent<AdminShellProps>;
  LoginPage: FunctionComponent<AdminLoginPageProps>;
  DashboardPage: FunctionComponent<AdminDashboardPageProps>;
  ListPage: FunctionComponent<AdminListPageProps>;
  DetailPage: FunctionComponent<AdminDetailPageProps>;
  FormPage: FunctionComponent<AdminFormPageProps>;
  TableCell: FunctionComponent<AdminTableCellProps>;
}>;

/** Resource configuration accepted by `Admin.resource(...)`. */
export type AdminResourceConfig = {
  path?: string;
  label?: string;
  columns?: string[];
  searchFields?: string[];
  defaultOrder?: OrderByClause<RawRecord>;
  actions?: Partial<Record<AdminAction, boolean>>;
  readOnly?: boolean;
  filters?: AdminFilterConfig[];
  fieldAccess?: Record<string, AdminFieldAccessConfig>;
  fieldLabels?: Record<string, string>;
  fieldDescriptions?: Record<string, string>;
  fieldWidgets?: Record<string, AdminFieldWidgetOverride>;
  components?: AdminComponentOverrides;
  nav?: AdminNavConfig;
  hooks?: Partial<{
    create: (args: {
      db: DatabaseInstance<TableRegistry>;
      actor: AdminActorContext;
      ctx: OakRouterContext;
      form: FormSource;
      input: RawRecord;
    }) => Promise<string>;
    update: (args: {
      db: DatabaseInstance<TableRegistry>;
      actor: AdminActorContext;
      ctx: OakRouterContext;
      id: string;
      form: FormSource;
      input: RawRecord;
    }) => Promise<void>;
  }>;
};

/** Registration entry returned by `Admin.resource(...)`. */
export type AdminResourceRegistration = {
  entity: BoundEntityClass;
  config: AdminResourceConfig;
};

/** Load arguments passed to `Admin.view(...).load`. */
export type AdminViewLoadArgs<
  TTables extends TableRegistry = TableRegistry,
> = {
  db: DatabaseInstance<TTables>;
  actor: AdminActorContext;
  ctx: OakRouterContext;
};

/** Render props passed to `Admin.view(...).render`. */
export type AdminViewRenderProps<TData = unknown> = {
  data: TData;
  actor: AdminActorContext;
};

/** Configuration accepted by `Admin.view(...)`. */
export type AdminViewConfig<
  TTables extends TableRegistry = TableRegistry,
  TData = unknown,
> = {
  path: string;
  label: string;
  description?: string;
  permission?: string;
  permissionLabel?: string;
  permissionDescription?: string;
  nav?: AdminNavConfig;
  live?: AdminLiveConfig;
  load?: (
    args: AdminViewLoadArgs<TTables>,
  ) => Promise<TData> | TData;
  render: FunctionComponent<AdminViewRenderProps<TData>>;
};

/** Registration object returned by `Admin.view(...)`. */
export type AdminViewRegistration = {
  config: {
    path: string;
    label: string;
    description?: string;
    permission?: string;
    permissionLabel?: string;
    permissionDescription?: string;
    nav?: AdminNavConfig;
    live?: AdminLiveConfig;
    load?: (
      args: AdminViewLoadArgs<TableRegistry>,
    ) => Promise<unknown> | unknown;
    render: FunctionComponent<AdminViewRenderProps<unknown>>;
  };
};

/** Load arguments passed to `Admin.flow(...).load`. */
export type AdminFlowLoadArgs<
  TTables extends TableRegistry = TableRegistry,
> = {
  db: DatabaseInstance<TTables>;
  actor: AdminActorContext;
  ctx: OakRouterContext;
};

/** Render props passed to `Admin.flow(...).render`. */
export type AdminFlowRenderProps<TData = unknown> = {
  data: TData;
  actor: AdminActorContext;
  action: string;
  error?: string;
  form?: FormSource;
};

/** Result returned by `Admin.flow(...).submit`. */
export type AdminFlowSubmitResult = {
  redirectTo?: string;
  flash?: AdminFlashMessage;
};

/** Submit arguments passed to `Admin.flow(...).submit`. */
export type AdminFlowSubmitArgs<
  TTables extends TableRegistry = TableRegistry,
  TData = unknown,
> = {
  db: DatabaseInstance<TTables>;
  actor: AdminActorContext;
  ctx: OakRouterContext;
  form: FormSource;
  data: TData;
};

/** Configuration accepted by `Admin.flow(...)`. */
export type AdminFlowConfig<
  TTables extends TableRegistry = TableRegistry,
  TData = unknown,
> = {
  path: string;
  label: string;
  description?: string;
  permission?: string;
  permissionLabel?: string;
  permissionDescription?: string;
  nav?: AdminNavConfig;
  load?: (
    args: AdminFlowLoadArgs<TTables>,
  ) => Promise<TData> | TData;
  render: FunctionComponent<AdminFlowRenderProps<TData>>;
  submit?: (
    args: AdminFlowSubmitArgs<TTables, TData>,
  ) => Promise<AdminFlowSubmitResult | void> | AdminFlowSubmitResult | void;
};

/** Registration object returned by `Admin.flow(...)`. */
export type AdminFlowRegistration = {
  config: {
    path: string;
    label: string;
    description?: string;
    permission?: string;
    permissionLabel?: string;
    permissionDescription?: string;
    nav?: AdminNavConfig;
    load?: (
      args: AdminFlowLoadArgs<TableRegistry>,
    ) => Promise<unknown> | unknown;
    render: FunctionComponent<AdminFlowRenderProps<unknown>>;
    submit?: (
      args: AdminFlowSubmitArgs<TableRegistry, unknown>,
    ) => Promise<AdminFlowSubmitResult | void> | AdminFlowSubmitResult | void;
  };
};

/** Load arguments passed to `Admin.widget(...).load`. */
export type AdminWidgetLoadArgs<
  TTables extends TableRegistry = TableRegistry,
> = {
  db: DatabaseInstance<TTables>;
  actor: AdminActorContext;
};

/** Render props passed to `Admin.widget(...).render`. */
export type AdminDashboardWidgetRenderProps<TData = unknown> = {
  data: TData;
  actor: AdminActorContext;
  title: string;
  href?: string;
  size: AdminDashboardWidgetSize;
};

/** Configuration accepted by `Admin.widget(...)`. */
export type AdminDashboardWidgetConfig<
  TTables extends TableRegistry = TableRegistry,
  TData = unknown,
> = {
  key: string;
  title: string;
  description?: string;
  href?: string;
  size?: AdminDashboardWidgetSize;
  permission?: string;
  permissionLabel?: string;
  permissionDescription?: string;
  live?: AdminLiveConfig;
  load?: (
    args: AdminWidgetLoadArgs<TTables>,
  ) => Promise<TData> | TData;
  render: FunctionComponent<AdminDashboardWidgetRenderProps<TData>>;
};

/** Registration object returned by `Admin.widget(...)`. */
export type AdminDashboardWidgetRegistration = {
  config: {
    key: string;
    title: string;
    description?: string;
    href?: string;
    size?: AdminDashboardWidgetSize;
    permission?: string;
    permissionLabel?: string;
    permissionDescription?: string;
    live?: AdminLiveConfig;
    load?: (
      args: AdminWidgetLoadArgs<TableRegistry>,
    ) => Promise<unknown> | unknown;
    render: FunctionComponent<AdminDashboardWidgetRenderProps<unknown>>;
  };
};

/** Seed context passed to admin presets. */
export type AdminPresetSeedContext<
  TTables extends TableRegistry = TableRegistry,
> = {
  db: DatabaseInstance<TTables>;
};

/** Configuration accepted by `Admin.preset(...)`. */
export type AdminPresetConfig<
  TTables extends TableRegistry = TableRegistry,
> = {
  name?: string;
  resources?: Record<string, AdminResourceRegistration>;
  views?: Record<string, AdminViewRegistration>;
  flows?: Record<string, AdminFlowRegistration>;
  widgets?: Record<string, AdminDashboardWidgetRegistration>;
  fieldWidgets?: Record<string, AdminFieldWidgetOverride>;
  components?: AdminComponentOverrides;
  seed?: (
    context: AdminPresetSeedContext<TTables>,
  ) => Promise<void>;
};

/** Preset input accepted by `Admin.create({ presets })`. */
export type AdminPresetInput<TTables extends TableRegistry = TableRegistry> =
  | "default"
  | AdminPresetConfig<TTables>;

/** Create input accepted by `Admin.create(...)`. */
export type AdminCreateInput<TTables extends TableRegistry = TableRegistry> = {
  db: DatabaseInstance<TTables>;
  presets?: readonly AdminPresetInput<TTables>[];
  basePath?: string;
  branding?: Partial<AdminBranding>;
  session?: Partial<AdminSessionSettings>;
  resources?: Record<string, AdminResourceRegistration>;
  views?: Record<string, AdminViewRegistration>;
  flows?: Record<string, AdminFlowRegistration>;
  widgets?: Record<string, AdminDashboardWidgetRegistration>;
  fieldWidgets?: Record<string, AdminFieldWidgetOverride>;
  components?: AdminComponentOverrides;
};

export type AdminNormalizedResource = {
  slug: string;
  label: string;
  entity: BoundEntityClass;
  model: Model;
  columns: string[];
  searchFields: string[];
  defaultOrder?: OrderByClause<RawRecord>;
  actions: Record<AdminAction, boolean>;
  readOnly: boolean;
  filters: AdminFilterConfig[];
  fieldAccess: Record<string, AdminFieldAccessConfig>;
  fieldLabels: Record<string, string>;
  fieldDescriptions: Record<string, string>;
  fieldWidgets: Record<string, AdminFieldWidgetOverride>;
  components: AdminComponentOverrides;
  hooks: NonNullable<AdminResourceConfig["hooks"]>;
  nav: AdminNavConfig;
  navGroup: string;
  navOrder: number;
  navGroupOrder: number;
  kind: "generic" | "users" | "roles" | "permissions" | "sessions" | "audit";
};

export type AdminNormalizedView = {
  slug: string;
  label: string;
  description?: string;
  permissionKey: string;
  permissionLabel: string;
  permissionDescription: string;
  nav: AdminNavConfig;
  navGroup: string;
  navOrder: number;
  navGroupOrder: number;
  live?: AdminLiveConfig;
  load?: (args: AdminViewLoadArgs) => Promise<unknown> | unknown;
  render: FunctionComponent<AdminViewRenderProps<unknown>>;
};

export type AdminNormalizedFlow = {
  slug: string;
  label: string;
  description?: string;
  permissionKey: string;
  permissionLabel: string;
  permissionDescription: string;
  nav: AdminNavConfig;
  navGroup: string;
  navOrder: number;
  navGroupOrder: number;
  load?: (args: AdminFlowLoadArgs) => Promise<unknown> | unknown;
  render: FunctionComponent<AdminFlowRenderProps<unknown>>;
  submit?: (
    args: AdminFlowSubmitArgs<TableRegistry, unknown>,
  ) => Promise<AdminFlowSubmitResult | void> | AdminFlowSubmitResult | void;
};

export type AdminNormalizedDashboardWidget = {
  key: string;
  title: string;
  description?: string;
  href?: string;
  size: AdminDashboardWidgetSize;
  permissionKey: string;
  permissionLabel: string;
  permissionDescription: string;
  live?: AdminLiveConfig;
  load?: (args: AdminWidgetLoadArgs) => Promise<unknown> | unknown;
  render: FunctionComponent<AdminDashboardWidgetRenderProps<unknown>>;
};

export type AdminPreparedDashboardWidget = {
  widget: AdminNormalizedDashboardWidget;
  data: unknown;
};

export type AdminNavigationTarget =
  | { kind: "dashboard" }
  | { kind: "resource"; slug: string }
  | { kind: "view"; slug: string }
  | { kind: "flow"; slug: string };

export type AdminRuntimeLike<
  TTables extends TableRegistry = TableRegistry,
> = {
  db: DatabaseInstance<TTables>;
  basePath: string;
  branding: AdminBranding;
  resources: Record<string, AdminNormalizedResource>;
  views: Record<string, AdminNormalizedView>;
  flows: Record<string, AdminNormalizedFlow>;
  resourceByModelName: Record<string, AdminNormalizedResource>;
  dashboardWidgets: Record<string, AdminNormalizedDashboardWidget>;
  components: AdminComponentOverrides;
  fieldWidgets: Record<string, AdminFieldWidgetOverride>;
  session: AdminSessionSettings;
  prepareData(): Promise<void>;
  resolveActor(ctx: OakRouterContext): Promise<AdminActorContext | null>;
  buildNavigation(
    actor: AdminActorContext | null,
    currentTarget?: AdminNavigationTarget,
  ): AdminNavigation;
  getActorOrRedirect(
    ctx: OakRouterContext,
    permissionKey?: string,
  ): Promise<AdminActorContext | null>;
  renderForbidden(ctx: OakRouterContext, actor: AdminActorContext): void;
  findResource(slug?: string): AdminNormalizedResource | undefined;
  renderMissingResource(ctx: OakRouterContext): void;
  renderMissingView(ctx: OakRouterContext): void;
  renderMissingFlow(ctx: OakRouterContext): void;
  renderMissingRecord(
    ctx: OakRouterContext,
    actor: AdminActorContext,
    resource: AdminNormalizedResource,
  ): void;
  countResourceRecords(resource: AdminNormalizedResource): Promise<number>;
  getRepository(resource: AdminNormalizedResource): RepositoryLike<Entity>;
  resolveFlashes(
    searchParams: URLSearchParams,
  ): AdminFlashMessage[] | undefined;
  getRecordTitle(resource: AdminNormalizedResource, record: RawRecord): string;
  formatFieldForForm(field: FieldDefinition, value: unknown): string;
  findView(slug?: string): AdminNormalizedView | undefined;
  findFlow(slug?: string): AdminNormalizedFlow | undefined;
  getDashboardWidgets(
    actor: AdminActorContext,
    ctx: OakRouterContext,
  ): Promise<AdminPreparedDashboardWidget[]>;
  getDashboardPath(): string;
  getDocumentTitle(title: string): string;
  getLoginPath(): string;
  getLogoutPath(): string;
  getResourcePath(resource: AdminNormalizedResource | string): string;
  getResourceCreatePath(resource: AdminNormalizedResource | string): string;
  getResourceDetailPath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string;
  getResourceEditPath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string;
  getResourceDeletePath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string;
  getResourceResetPasswordPath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string;
  getViewPath(view: AdminNormalizedView | string): string;
  getFlowPath(flow: AdminNormalizedFlow | string): string;
};

export type {
  AdminActorContext,
  AdminAuditEventRecord,
  AdminDatabase,
  AdminRoleRecord,
  AdminSessionSettings,
  AdminUserRecord,
};
