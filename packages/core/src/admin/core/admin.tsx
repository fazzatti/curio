import type { Application } from "@oak/oak";
import type { AdminFlashMessage, AdminNavigation } from "@/admin/components/types.ts";
import {
  getAdminActorOrRedirect,
  prepareAdminData,
  resolveAdminRuntimeActor,
} from "@/admin/core/actors.ts";
import { buildAdminNavigation } from "@/admin/core/navigation.ts";
import {
  getAdminDashboardPath,
  getAdminDocumentTitle,
  getAdminFlowPath,
  getAdminLoginPath,
  getAdminLogoutPath,
  getAdminResourceCreatePath,
  getAdminResourceDeletePath,
  getAdminResourceDetailPath,
  getAdminResourceEditPath,
  getAdminResourcePath,
  getAdminResourceResetPasswordPath,
  getAdminViewPath,
} from "@/admin/core/paths.ts";
import {
  countAdminResourceRecords,
  findAdminFlow,
  findAdminResource,
  findAdminView,
  formatAdminFieldForForm,
  getAdminDashboardWidgets,
  getAdminRecordTitle,
  getAdminRepository,
  resolveAdminFlashMessages,
} from "@/admin/core/repositories.ts";
import {
  renderAdminForbidden,
  renderMissingAdminFlow,
  renderMissingAdminRecord,
  renderMissingAdminResource,
  renderMissingAdminView,
} from "@/admin/core/responses.tsx";
import { mountAdminRoutes } from "@/admin/http/routing.ts";
import {
  createAdminState,
  type AdminState,
} from "@/admin/core/state.ts";
import type { BoundEntityClass } from "@/db/entity.ts";
import type { FieldDefinition } from "@/db/field.ts";
import type { DatabaseInstance, RawRecord, TableRegistry } from "@/db/types.ts";
import type {
  AdminActorContext,
  AdminBranding,
  AdminComponentOverrides,
  AdminCreateInput,
  AdminDashboardWidgetConfig,
  AdminDashboardWidgetRegistration,
  AdminFieldWidgetOverride,
  AdminFlowConfig,
  AdminFlowRegistration,
  AdminNavigationTarget,
  AdminNormalizedDashboardWidget,
  AdminNormalizedFlow,
  AdminNormalizedResource,
  AdminNormalizedView,
  AdminPreparedDashboardWidget,
  AdminPresetConfig,
  AdminResourceConfig,
  AdminResourceRegistration,
  AdminRuntimeLike,
  AdminSessionSettings,
  AdminViewConfig,
  AdminViewRegistration,
  OakRouterContext,
} from "@/admin/core/types.ts";

/**
 * Curio admin subsystem.
 *
 * @remarks
 * The admin is backend-mounted, server-rendered, and coupled directly to
 * Curio's DB layer. It does not consume the public HTTP API by default.
 */
export class Admin<TTables extends TableRegistry = TableRegistry>
  implements AdminRuntimeLike<TTables> {
  readonly #state: AdminState<TTables>;

  /** Registers a DB-backed resource surface for the admin. */
  static resource(
    entity: BoundEntityClass,
    config: AdminResourceConfig = {},
  ): AdminResourceRegistration {
    return { entity, config };
  }

  /** Registers a custom read-only admin page. */
  static view<
    const TTables extends TableRegistry = TableRegistry,
    const TData = unknown,
  >(
    config: AdminViewConfig<TTables, TData>,
  ): AdminViewRegistration {
    return {
      config: config as AdminViewRegistration["config"],
    };
  }

  /** Registers a custom form-based admin workflow. */
  static flow<
    const TTables extends TableRegistry = TableRegistry,
    const TData = unknown,
  >(
    config: AdminFlowConfig<TTables, TData>,
  ): AdminFlowRegistration {
    return {
      config: config as AdminFlowRegistration["config"],
    };
  }

  /** Registers a custom dashboard widget. */
  static widget<
    const TTables extends TableRegistry = TableRegistry,
    const TData = unknown,
  >(
    config: AdminDashboardWidgetConfig<TTables, TData>,
  ): AdminDashboardWidgetRegistration {
    return {
      config: config as AdminDashboardWidgetRegistration["config"],
    };
  }

  /** Wraps a reusable admin preset definition. */
  static preset<const TTables extends TableRegistry = TableRegistry>(
    config: AdminPresetConfig<TTables>,
  ): AdminPresetConfig<TTables> {
    return config;
  }

  /** Creates an admin runtime instance from registered resources and presets. */
  static create<const TTables extends TableRegistry>(
    input: AdminCreateInput<TTables>,
  ): Admin<TTables> {
    return new Admin<TTables>(input);
  }

  constructor(input: AdminCreateInput<TTables>) {
    this.#state = createAdminState(input);
  }

  get db(): DatabaseInstance<TTables> {
    return this.#state.db;
  }

  get basePath(): string {
    return this.#state.basePath;
  }

  get branding(): AdminBranding {
    return this.#state.branding;
  }

  get resources(): Record<string, AdminNormalizedResource> {
    return this.#state.resources;
  }

  get views(): Record<string, AdminNormalizedView> {
    return this.#state.views;
  }

  get flows(): Record<string, AdminNormalizedFlow> {
    return this.#state.flows;
  }

  get resourceByModelName(): Record<string, AdminNormalizedResource> {
    return this.#state.resourceByModelName;
  }

  get dashboardWidgets(): Record<string, AdminNormalizedDashboardWidget> {
    return this.#state.dashboardWidgets;
  }

  get components(): AdminComponentOverrides {
    return this.#state.components;
  }

  get fieldWidgets(): Record<string, AdminFieldWidgetOverride> {
    return this.#state.fieldWidgets;
  }

  get session(): AdminSessionSettings {
    return this.#state.session;
  }

  /**
   * Mounts the server-rendered admin routes on an Oak application.
   *
   * @remarks
   * This registers the admin assets, auth endpoints, resource CRUD routes,
   * custom views, and custom flows beneath `basePath`.
   */
  mount(app: Pick<Application, "use">): void {
    mountAdminRoutes(this, app);
  }

  async prepareData(): Promise<void> {
    await prepareAdminData(this.#state);
  }

  async resolveActor(
    ctx: OakRouterContext,
  ): Promise<AdminActorContext | null> {
    return await resolveAdminRuntimeActor(this, ctx);
  }

  buildNavigation(
    actor: AdminActorContext | null,
    currentTarget: AdminNavigationTarget = { kind: "dashboard" },
  ): AdminNavigation {
    return buildAdminNavigation(this, actor, currentTarget);
  }

  getDocumentTitle(title: string): string {
    return getAdminDocumentTitle(this.branding, title);
  }

  async getActorOrRedirect(
    ctx: OakRouterContext,
    permissionKey?: string,
  ): Promise<AdminActorContext | null> {
    return await getAdminActorOrRedirect(this, ctx, permissionKey);
  }

  renderForbidden(
    ctx: OakRouterContext,
    actor: AdminActorContext,
  ): void {
    renderAdminForbidden(this, ctx, actor);
  }

  findResource(slug?: string): AdminNormalizedResource | undefined {
    return findAdminResource(this, slug);
  }

  findView(slug?: string): AdminNormalizedView | undefined {
    return findAdminView(this, slug);
  }

  findFlow(slug?: string): AdminNormalizedFlow | undefined {
    return findAdminFlow(this, slug);
  }

  renderMissingResource(ctx: OakRouterContext): void {
    renderMissingAdminResource(this, ctx);
  }

  renderMissingView(ctx: OakRouterContext): void {
    renderMissingAdminView(this, ctx);
  }

  renderMissingFlow(ctx: OakRouterContext): void {
    renderMissingAdminFlow(this, ctx);
  }

  renderMissingRecord(
    ctx: OakRouterContext,
    actor: AdminActorContext,
    resource: AdminNormalizedResource,
  ): void {
    renderMissingAdminRecord(this, ctx, actor, resource);
  }

  async countResourceRecords(
    resource: AdminNormalizedResource,
  ): Promise<number> {
    return await countAdminResourceRecords(this, resource);
  }

  getRepository(
    resource: AdminNormalizedResource,
  ): AdminRuntimeLike<TTables>["getRepository"] extends (
    resource: AdminNormalizedResource,
  ) => infer TResult ? TResult : never {
    return getAdminRepository(this, resource);
  }

  resolveFlashes(
    searchParams: URLSearchParams,
  ): AdminFlashMessage[] | undefined {
    return resolveAdminFlashMessages(searchParams);
  }

  getRecordTitle(resource: AdminNormalizedResource, record: RawRecord): string {
    return getAdminRecordTitle(resource, record);
  }

  formatFieldForForm(field: FieldDefinition, value: unknown): string {
    return formatAdminFieldForForm(field, value);
  }

  async getDashboardWidgets(
    actor: AdminActorContext,
    ctx: OakRouterContext,
  ): Promise<AdminPreparedDashboardWidget[]> {
    return await getAdminDashboardWidgets(this, actor, ctx);
  }

  getDashboardPath(): string {
    return getAdminDashboardPath(this.basePath);
  }

  getLoginPath(): string {
    return getAdminLoginPath(this.basePath);
  }

  getLogoutPath(): string {
    return getAdminLogoutPath(this.basePath);
  }

  getResourcePath(resource: AdminNormalizedResource | string): string {
    return getAdminResourcePath(this.basePath, resource);
  }

  getResourceCreatePath(resource: AdminNormalizedResource | string): string {
    return getAdminResourceCreatePath(this.basePath, resource);
  }

  getResourceDetailPath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string {
    return getAdminResourceDetailPath(this.basePath, resource, id);
  }

  getResourceEditPath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string {
    return getAdminResourceEditPath(this.basePath, resource, id);
  }

  getResourceDeletePath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string {
    return getAdminResourceDeletePath(this.basePath, resource, id);
  }

  getResourceResetPasswordPath(
    resource: AdminNormalizedResource | string,
    id: string,
  ): string {
    return getAdminResourceResetPasswordPath(this.basePath, resource, id);
  }

  getViewPath(view: AdminNormalizedView | string): string {
    return getAdminViewPath(this.basePath, view);
  }

  getFlowPath(flow: AdminNormalizedFlow | string): string {
    return getAdminFlowPath(this.basePath, flow);
  }
}
