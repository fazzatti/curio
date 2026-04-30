import type {
  KeyedRouteMiddleware,
  KeyedRouteMiddlewareHandler,
  PassThroughRouteMiddleware,
  PassThroughRouteMiddlewareHandler,
} from "@/api/types.ts";
import type { CurioHttpContext } from "@/http/types.ts";

/**
 * Middleware factory shape used by Curio route helpers.
 *
 * @remarks
 * The single-argument overload builds pass-through middleware. The keyed
 * overload builds middleware that contributes typed data under
 * `ctx.middlewareData`.
 *
 * @typeParam TContext The Curio HTTP context type accepted by the middleware.
 */
export type MiddlewareFactory<
  TContext extends CurioHttpContext = CurioHttpContext,
> = {
  (
    run: PassThroughRouteMiddlewareHandler<TContext>,
  ): PassThroughRouteMiddleware<TContext>;
  <TKey extends string, TData>(
    key: TKey,
    run: KeyedRouteMiddlewareHandler<TContext, TData>,
  ): KeyedRouteMiddleware<TContext, TKey, Awaited<TData>>;
};

/**
 * Declares route middleware.
 *
 * @remarks
 * - `middleware(run)` creates pass-through middleware that can call `next()`
 * - `middleware("key", run)` creates keyed middleware whose return value is
 *   exposed on `ctx.middlewareData.key`
 *
 * @typeParam TContext The Curio HTTP context type accepted by the middleware.
 * @typeParam TKey The middleware data key for keyed middleware.
 * @typeParam TData The resolved middleware data type for keyed middleware.
 */
export function middleware<
  TContext extends CurioHttpContext = CurioHttpContext,
>(
  run: PassThroughRouteMiddlewareHandler<TContext>,
): PassThroughRouteMiddleware<TContext>;
export function middleware<
  TKey extends string,
  TData,
  TContext extends CurioHttpContext = CurioHttpContext,
>(
  key: TKey,
  run: KeyedRouteMiddlewareHandler<TContext, TData>,
): KeyedRouteMiddleware<TContext, TKey, Awaited<TData>>;
export function middleware<
  TKey extends string,
  TData,
  TContext extends CurioHttpContext = CurioHttpContext,
>(
  keyOrRun: TKey | PassThroughRouteMiddlewareHandler<TContext>,
  maybeRun?: KeyedRouteMiddlewareHandler<TContext, TData>,
) {
  if (typeof keyOrRun === "function") {
    return {
      kind: "pass-through" as const,
      run: keyOrRun,
    };
  }

  if (!maybeRun) {
    throw new TypeError(
      `Missing keyed middleware handler for "${keyOrRun}".`,
    );
  }

  return {
    kind: "keyed" as const,
    key: keyOrRun,
    run: maybeRun,
  };
}

/**
 * Creates a typed middleware helper for a specific Curio HTTP context.
 *
 * @remarks
 * Transport-specific entrypoints such as `@curio/core/http/oak` use this to
 * expose a `middleware(...)` helper whose `ctx.raw` matches the framework.
 *
 * @typeParam TContext The Curio HTTP context type accepted by the middleware.
 */
export const createMiddlewareFactory = <
  TContext extends CurioHttpContext = CurioHttpContext,
>(): MiddlewareFactory<TContext> => {
  function createMiddleware(
    run: PassThroughRouteMiddlewareHandler<TContext>,
  ): PassThroughRouteMiddleware<TContext>;
  function createMiddleware<TKey extends string, TData>(
    key: TKey,
    run: KeyedRouteMiddlewareHandler<TContext, TData>,
  ): KeyedRouteMiddleware<TContext, TKey, Awaited<TData>>;
  function createMiddleware<TKey extends string, TData>(
    keyOrRun: TKey | PassThroughRouteMiddlewareHandler<TContext>,
    maybeRun?: KeyedRouteMiddlewareHandler<TContext, TData>,
  ) {
    if (typeof keyOrRun === "function") {
      return {
        kind: "pass-through" as const,
        run: keyOrRun,
      };
    }

    if (!maybeRun) {
      throw new TypeError(
        `Missing keyed middleware handler for "${keyOrRun}".`,
      );
    }

    return {
      kind: "keyed" as const,
      key: keyOrRun,
      run: maybeRun,
    };
  }

  return createMiddleware;
};
