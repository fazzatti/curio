import type { RouteOptions, RouteSegment } from "@/api/types.ts";

/**
 * Creates a route-tree node.
 *
 * Combines a single relative path segment with its method entries and optional
 * children.
 *
 * @param pathSegment A single relative segment such as `"health"` or `":id"`.
 * @param options Route method entries and optional child segments.
 * @returns A route-tree node ready to be composed into an API factory.
 *
 * @remarks
 * `pathSegment` should contain only one segment. Full paths are assembled later
 * by walking the route tree.
 *
 * @example
 * ```ts
 * const transactionsRoute = Route("transactions", {
 *   GET: listTransactions,
 *   children: [
 *     Route(":id", {
 *       GET: getTransaction,
 *     }),
 *   ],
 * });
 * ```
 *
 * @typeParam TContext The context type passed to handlers and middlewares.
 */
export const Route = <TContext = unknown>(
  pathSegment: string,
  { children, ...methods }: RouteOptions<TContext> = {},
): RouteSegment<TContext> => ({
  pathSegment,
  children,
  ...methods,
});

/**
 * Creates a typed `Route(...)` helper for a specific handler context.
 *
 * @typeParam TContext The context type passed to handlers and middlewares.
 */
export const createRouteFactory = <TContext = unknown>() =>
  (
    pathSegment: string,
    options: RouteOptions<TContext> = {},
  ): RouteSegment<TContext> => Route<TContext>(pathSegment, options);
