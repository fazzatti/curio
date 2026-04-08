import type { RouterContext as OakRouterContext } from "@oak/oak";
import { API as CoreAPI } from "@/api/api.ts";
import type { EndpointOperations } from "@/api/endpoint-operations.ts";
import { createEndpointOperations } from "@/api/endpoint-operations.ts";
import type { MiddlewareFactory } from "@/api/middleware.ts";
import { createMiddlewareFactory } from "@/api/middleware.ts";
import { createRouteFactory } from "@/api/route.ts";
import type { RouteOptions, RouteSegment } from "@/api/types.ts";
import { oakHttpAdapter } from "@/http/oak.ts";
import type { CurioHttpContext } from "@/http/types.ts";

/**
 * Oak-bound Curio HTTP context.
 *
 * @remarks
 * This is the context type used by the Oak-specific helpers exported from
 * `@curio/sdk/http/oak`. `ctx.raw` remains the original Oak router context.
 */
export type OakHttpContext = CurioHttpContext<OakRouterContext<string>>;

type OakRouteFactory = (
  pathSegment: string,
  options?: RouteOptions<OakHttpContext>,
) => RouteSegment<OakHttpContext>;

type OakApiNamespace = {
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
  from<TContext extends OakHttpContext>(routes: RouteSegment<TContext>[]) {
    return apiFactory.from(routes);
  },
};

/**
 * Convenience namespace that groups the Oak-bound authoring helpers together.
 *
 * @example
 * ```ts
 * import { Oak } from "@curio/sdk/http/oak";
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
