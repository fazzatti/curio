import type { CurioHttpContext } from "@/http/types.ts";

/** Supported HTTP methods for route entries. */
export type EndpointMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type MaybePromise<T> = T | Promise<T>;

type Simplify<T> = { [K in keyof T]: T[K] } & Record<never, never>;

type UnionToIntersection<TUnion> =
  (TUnion extends unknown ? (value: TUnion) => void : never) extends
    (value: infer TIntersection) => void ? TIntersection
    : never;

type MiddlewareDataEntry<
  TContext extends CurioHttpContext,
  TMiddleware,
> = TMiddleware extends KeyedRouteMiddleware<TContext, infer TKey, infer TData>
  ? { [K in TKey]: Awaited<TData> }
  : Record<never, never>;

type MiddlewareKeyOf<
  TContext extends CurioHttpContext,
  TMiddleware,
> = TMiddleware extends KeyedRouteMiddleware<TContext, infer TKey, unknown>
  ? TKey
  : never;

type DuplicateMiddlewareKeys<
  TContext extends CurioHttpContext,
  TMiddlewares extends readonly unknown[],
  TSeen extends string = never,
> = TMiddlewares extends readonly [infer THead, ...infer TTail]
  ? MiddlewareKeyOf<TContext, THead> extends never
    ? DuplicateMiddlewareKeys<TContext, TTail, TSeen>
  : MiddlewareKeyOf<TContext, THead> extends TSeen ?
      | MiddlewareKeyOf<TContext, THead>
      | DuplicateMiddlewareKeys<TContext, TTail, TSeen>
  : DuplicateMiddlewareKeys<
    TContext,
    TTail,
    TSeen | MiddlewareKeyOf<TContext, THead>
  >
  : never;

/** Output passed to `halt(...)` from keyed route middleware. */
export type MiddlewareHaltOutput = {
  payload: unknown;
  status?: number;
  headers?: HeadersInit;
};

/**
 * Terminates request handling from keyed middleware.
 *
 * @remarks
 * Curio converts this output into an immediate HTTP response and skips the
 * remaining middleware chain and route handler.
 */
export type MiddlewareHalt = (output: MiddlewareHaltOutput) => never;

/**
 * Pass-through middleware handler.
 *
 * @remarks
 * Pass-through middleware can inspect or mutate the context and must call
 * `next()` when it wants downstream middleware and the route handler to run.
 */
export type PassThroughRouteMiddlewareHandler<
  TContext extends CurioHttpContext = CurioHttpContext,
> = (
  ctx: TContext,
  next: () => Promise<void>,
) => MaybePromise<void>;

/**
 * Keyed middleware handler.
 *
 * @remarks
 * Keyed middleware does not receive `next()`. Instead, it returns typed data
 * that Curio stores under `ctx.middlewareData[key]`, or calls `halt(...)` to
 * short-circuit the request.
 */
export type KeyedRouteMiddlewareHandler<
  TContext extends CurioHttpContext = CurioHttpContext,
  TData = unknown,
> = (
  input: {
    ctx: TContext;
    halt: MiddlewareHalt;
  },
) => MaybePromise<TData>;

/** Registered pass-through middleware definition. */
export type PassThroughRouteMiddleware<
  TContext extends CurioHttpContext = CurioHttpContext,
> = {
  kind: "pass-through";
  run: PassThroughRouteMiddlewareHandler<TContext>;
};

/** Registered keyed middleware definition. */
export type KeyedRouteMiddleware<
  TContext extends CurioHttpContext = CurioHttpContext,
  TKey extends string = string,
  TData = unknown,
> = {
  kind: "keyed";
  key: TKey;
  run: KeyedRouteMiddlewareHandler<TContext, TData>;
};

/**
 * Plain callable route handler.
 *
 * @param ctx The runtime HTTP context for the current request.
 * @returns Nothing, or a promise that resolves when request handling finishes.
 *
 * @typeParam TContext The context type received by the handler.
 */
export type RouteHandler<TContext = unknown> = (
  ctx: TContext,
) => Promise<void> | void;

/**
 * Route middleware entry accepted by route configs and built-in operations.
 *
 * @typeParam TContext The context type passed to the middleware.
 */
export type RouteMiddleware<
  TContext extends CurioHttpContext = CurioHttpContext,
> =
  | PassThroughRouteMiddleware<TContext>
  | KeyedRouteMiddleware<TContext, string, unknown>;

/**
 * Compile-time guard that rejects duplicate keyed middleware data keys.
 *
 * @remarks
 * This helper is intentionally type-only. It makes invalid middleware arrays
 * resolve to `never`, which causes Curio helper calls to fail type-checking.
 */
export type EnsureUniqueMiddlewareKeys<
  TContext extends CurioHttpContext,
  TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined,
> = TMiddlewares extends readonly RouteMiddleware<TContext>[]
  ? [DuplicateMiddlewareKeys<TContext, TMiddlewares>] extends [never]
    ? TMiddlewares
  : never
  : TMiddlewares;

/**
 * Derives the aggregated `ctx.middlewareData` shape from a middleware array.
 *
 * @typeParam TMiddlewares The route middleware array to inspect.
 */
export type MiddlewareDataFromDefinitions<
  TContext extends CurioHttpContext,
  TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined,
> = Simplify<
  UnionToIntersection<
    MiddlewareDataEntry<
      TContext,
      TMiddlewares extends readonly RouteMiddleware<TContext>[]
        ? TMiddlewares[number]
        : never
    >
  >
>;

/**
 * Replaces the `middlewareData` portion of a Curio HTTP context.
 *
 * @remarks
 * Curio uses this to thread typed keyed-middleware output into handlers and
 * built-in operation helpers.
 */
export type WithMiddlewareData<
  TContext extends CurioHttpContext,
  TMiddlewareData extends Record<string, unknown>,
> = TContext extends CurioHttpContext<infer TRaw, infer TExistingMiddlewareData>
  ? CurioHttpContext<
    TRaw,
    Simplify<TExistingMiddlewareData & TMiddlewareData>
  >
  : never;

/** Optional response documentation metadata for a documented route method. */
export type RouteResponseDocs = {
  /** Human-readable description for the response status. */
  description?: string;
};

/**
 * Optional documentation metadata attached to a route method.
 *
 * @remarks
 * This is primarily consumed by advanced tooling such as
 * `@curio/core/openapi`, while leaving the default runtime behavior unchanged.
 */
export type RouteMethodDocs = {
  /** Short one-line summary for the operation. */
  summary?: string;
  /** Longer operation description. */
  description?: string;
  /** OpenAPI tag grouping. */
  tags?: readonly string[];
  /** Stable operation identifier. */
  operationId?: string;
  /** Whether the operation should be marked as deprecated. */
  deprecated?: boolean;
  /** Success status used for the primary response schema. Defaults to `200`. */
  successStatus?: `${number}`;
  /** Additional documented responses keyed by status code. */
  responses?: Record<string, RouteResponseDocs>;
};

/**
 * Canonical per-method route config.
 *
 * Use this shape when you want to attach metadata like middlewares while still
 * providing a plain custom handler.
 *
 * @typeParam TContext The context type passed to the handler and middlewares.
 */
export type RouteMethodConfig<TContext = unknown> = {
  /** Handler invoked for the HTTP method at this route segment. */
  handler: RouteHandler<TContext>;
  /** Optional method-scoped middleware chain. */
  middlewares?: readonly RouteMiddleware[];
  /** Optional documentation metadata for advanced tooling. */
  docs?: RouteMethodDocs;
  /** Reserved so operation objects remain distinguishable from config objects. */
  method?: never;
};

/**
 * Method-specific operation object.
 *
 * Built-in helpers such as `GET(...)` return this shape so the route key and
 * the operation method can be checked for compatibility.
 *
 * @typeParam M The HTTP method represented by the operation.
 * @typeParam TContext The context type passed to the handler and middlewares.
 */
export type RouteMethodOperation<
  M extends EndpointMethod = EndpointMethod,
  TContext = unknown,
> = {
  /** HTTP method bound to this operation. */
  method: M;
  /** Handler invoked for the HTTP method at this route segment. */
  handler: RouteHandler<TContext>;
  /** Optional method-scoped middleware chain. */
  middlewares?: readonly RouteMiddleware[];
  /** Optional documentation metadata for advanced tooling. */
  docs?: RouteMethodDocs;
};

/**
 * Route method entry accepted under a method key like `GET` or `DELETE`.
 *
 * It can be:
 * - a plain handler shorthand
 * - an explicit object config
 * - a built-in operation object
 *
 * @typeParam M The HTTP method represented by the route key.
 * @typeParam TContext The context type passed to handlers and middlewares.
 */
export type RouteMethodEntry<
  M extends EndpointMethod = EndpointMethod,
  TContext = unknown,
> =
  | RouteHandler<TContext>
  | RouteMethodConfig<TContext>
  | RouteMethodOperation<M, never>;

/**
 * Methods available on a single route segment.
 *
 * @typeParam TContext The context type passed to handlers and middlewares.
 */
export type Endpoint<TContext = unknown> = {
  [K in EndpointMethod]?: RouteMethodEntry<K, TContext>;
};

/**
 * Single route-tree node.
 *
 * `pathSegment` must contain only one relative segment such as `"health"` or
 * `":id"`. Child routes extend the full path during API assembly.
 *
 * @typeParam TContext The context type passed to handlers and middlewares.
 */
export type RouteSegment<TContext = unknown> = {
  /** Single relative segment for this node. */
  pathSegment: string;
  /** Optional child segments mounted beneath this node. */
  children?: RouteSegment<TContext>[];
} & Endpoint<TContext>;

/**
 * Options accepted by `Route(...)`.
 *
 * @typeParam TContext The context type passed to handlers and middlewares.
 */
export type RouteOptions<TContext = unknown> = Endpoint<TContext> & {
  /** Optional child segments mounted beneath this node. */
  children?: RouteSegment<TContext>[];
};

/**
 * Flattened route entry produced during API assembly.
 *
 * @typeParam TContext The context type passed to the registered handler.
 */
export type RegisteredRoute<TContext = unknown> = {
  /** Resolved HTTP method. */
  method: EndpointMethod;
  /** Full resolved path for the route. */
  path: string;
  /** Registered runtime handler. */
  handler: RouteHandler<TContext>;
  /** Optional method-scoped middleware chain. */
  middlewares?: readonly RouteMiddleware[];
  /** Optional documentation metadata for advanced tooling. */
  docs?: RouteMethodDocs;
};
