/**
 * Oak-bound HTTP authoring helpers.
 *
 * @module
 *
 * @remarks
 * Import from this entrypoint when your Curio application uses Oak as the
 * HTTP server and you want route, middleware, and API builders typed against
 * Oak's router context.
 */
import type { RouterContext as OakRouterContext } from "@oak/oak";
import type { ApiBuildResult } from "@/api/api.ts";
import { API as CoreAPI } from "@/api/api.ts";
import type { EndpointOperations } from "@/api/endpoint-operations.ts";
import { createEndpointOperations } from "@/api/endpoint-operations.ts";
import type { MiddlewareFactory } from "@/api/middleware.ts";
import { createMiddlewareFactory } from "@/api/middleware.ts";
import { createRouteFactory } from "@/api/route.ts";
import type { RouteOptions, RouteSegment } from "@/api/types.ts";
import { oakHttpAdapter } from "@/http/oak.ts";
import {
  type OakTelemetryMiddleware,
  type OakTelemetryOptions,
  telemetry as buildTelemetryMiddleware,
} from "@/http/oak-telemetry.ts";
import type { CurioHttpContext } from "@/http/types.ts";

/**
 * Oak-bound Curio HTTP context.
 *
 * @remarks
 * This is the context type used by the Oak-specific helpers exported from
 * `@curio/core/http/oak`. `ctx.raw` remains the original Oak router context.
 */
export type OakHttpContext = CurioHttpContext<OakRouterContext<string>>;

type OakRouteFactory = (
  pathSegment: string,
  options?: RouteOptions<OakHttpContext>,
) => RouteSegment<OakHttpContext>;

/**
 * Oak route build artifact with telemetry convenience helpers.
 *
 * @remarks
 * This extends the generic `ApiBuildResult` with `runtime.telemetry(...)` so
 * Oak apps can attach Curio's route-aware OpenTelemetry middleware without
 * importing additional assembly helpers into the normal happy path.
 */
export type OakApiBuildResult<
  TContext extends OakHttpContext = OakHttpContext,
> = ApiBuildResult<ReturnType<typeof oakHttpAdapter.createRouter>, TContext> & {
  /**
   * Builds Oak middleware that enriches request spans with Curio route
   * metadata.
   *
   * @param options Optional tracer overrides for advanced integrations.
   * @returns Oak middleware that should run before `runtime.router.routes()`.
   */
  telemetry(options?: OakTelemetryOptions): OakTelemetryMiddleware;
};

type OakApiNamespace = {
  build<TContext extends OakHttpContext>(
    routes: RouteSegment<TContext>[],
  ): OakApiBuildResult<TContext>;
  from<TContext extends OakHttpContext>(
    routes: RouteSegment<TContext>[],
  ): ReturnType<typeof oakHttpAdapter.createRouter>;
};

const routeFactory: OakRouteFactory = createRouteFactory<OakHttpContext>();
const middlewareFactory: MiddlewareFactory<OakHttpContext> =
  createMiddlewareFactory<OakHttpContext>();
const endpointOperations: EndpointOperations<OakHttpContext> =
  createEndpointOperations<OakHttpContext>();
const apiFactory = CoreAPI.withHttp(oakHttpAdapter);

/**
 * Oak-bound route factory.
 *
 * @remarks
 * This is the recommended `Route(...)` helper for Oak apps because it keeps
 * handler and middleware contexts typed as `OakHttpContext`.
 */
export const Route = routeFactory;

/**
 * Oak-bound middleware helper.
 *
 * @remarks
 * Use this helper instead of the root `middleware(...)` when authoring Oak
 * routes so `ctx.raw` is typed as Oak's router context.
 */
export const middleware = middlewareFactory;

/** Oak-bound `GET(...)` helper. */
export const GET: EndpointOperations<OakHttpContext>["GET"] =
  endpointOperations.GET;

/** Oak-bound `POST(...)` helper. */
export const POST: EndpointOperations<OakHttpContext>["POST"] =
  endpointOperations.POST;

/** Oak-bound `PUT(...)` helper. */
export const PUT: EndpointOperations<OakHttpContext>["PUT"] =
  endpointOperations.PUT;

/** Oak-bound `PATCH(...)` helper. */
export const PATCH: EndpointOperations<OakHttpContext>["PATCH"] =
  endpointOperations.PATCH;

/** Oak-bound `DELETE(...)` helper. */
export const DELETE: EndpointOperations<OakHttpContext>["DELETE"] =
  endpointOperations.DELETE;

/**
 * Oak-first API namespace.
 *
 * @remarks
 * `API.from(...)` assembles an Oak router directly, so Oak backends do not
 * need to call the lower-level `API.withHttp(oakHttpAdapter)` API manually.
 */
export const API: OakApiNamespace = {
  build<TContext extends OakHttpContext>(routes: RouteSegment<TContext>[]) {
    const runtime = apiFactory.build(routes);

    return {
      ...runtime,
      telemetry(options?: OakTelemetryOptions) {
        return buildTelemetryMiddleware(runtime, options);
      },
    };
  },
  from<TContext extends OakHttpContext>(routes: RouteSegment<TContext>[]) {
    return apiFactory.from(routes);
  },
};

/**
 * Convenience namespace that groups the Oak-bound authoring helpers together.
 *
 * @example
 * ```ts
 * import { Oak } from "@curio/core/http/oak";
 *
 * const healthRoute = Oak.Route("health", {
 *   GET: Oak.GET({
 *     handler: () => ({
 *       payload: { ok: true },
 *     }),
 *   }),
 * });
 *
 * const router = Oak.API.from([healthRoute]);
 * ```
 */
export const Oak = {
  API,
  Route,
  middleware,
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
} as const;
