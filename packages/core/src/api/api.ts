// deno-coverage-ignore-start
import type { CurioHttpContext, HttpAdapter } from "@/http/types.ts";
import type {
  EndpointMethod,
  KeyedRouteMiddlewareHandler,
  MiddlewareHaltOutput,
  PassThroughRouteMiddlewareHandler,
  RegisteredRoute,
  RouteHandler,
  RouteMethodEntry,
  RouteMethodOperation,
  RouteMiddleware,
  RouteSegment,
} from "@/api/types.ts";
import { getHandlerSchemas } from "@/api/with-schemas.ts";
import type { HandlerSchemas } from "@/api/with-schemas/types.ts";
// deno-coverage-ignore-stop

export type ApiBuildRoute<TContext = unknown> = RegisteredRoute<TContext> & {
  /** Runtime handler after Curio composes route middleware around the handler. */
  runtimeHandler: RouteHandler<TContext>;
  /** Optional request/response schema metadata attached through Curio helpers. */
  schemas?: HandlerSchemas;
};

export type ApiBuildResult<TRouter, TContext = unknown> = {
  /** Runtime router assembled through the selected HTTP adapter. */
  router: TRouter;
  /** Normalized route registrations used during router assembly. */
  routes: ApiBuildRoute<TContext>[];
};

/** Internal list of supported method keys during route flattening. */
const ENDPOINT_METHODS: EndpointMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
];

/** Normalizes a route segment before validation and joining. */
const normalizeSegment = (segment: string): string => {
  return segment.trim();
};

/** Joins a base path and a single relative route segment into a full path. */
const joinPath = (basePath: string, pathSegment: string): string => {
  const normalizedSegment = normalizeSegment(pathSegment);

  if (!normalizedSegment) {
    return basePath || "/";
  }

  const normalizedBasePath = basePath === "/" ? "" : basePath;
  return `${normalizedBasePath}/${normalizedSegment}`;
};

/** Thrown when a route node uses an invalid path segment. */
export class InvalidRouteSegmentError extends Error {
  /**
   * @param pathSegment The invalid segment that failed validation.
   */
  constructor(pathSegment: string) {
    super(
      `Invalid route segment "${pathSegment}". Route segments must contain at most one relative segment.`,
    );
    this.name = "InvalidRouteSegmentError";
  }
}

/** Thrown when sibling route nodes reuse the same segment. */
export class DuplicateRouteSegmentError extends Error {
  /**
   * @param path The resolved path where a duplicate sibling segment was found.
   */
  constructor(path: string) {
    super(`Duplicate route segment detected at "${path}".`);
    this.name = "DuplicateRouteSegmentError";
  }
}

/** Thrown when API assembly would register the same method/path twice. */
export class DuplicateRegisteredRouteError extends Error {
  /**
   * @param method The duplicated HTTP method.
   * @param path The duplicated resolved path.
   */
  constructor(method: EndpointMethod, path: string) {
    super(`Duplicate registered route detected for ${method} ${path}.`);
    this.name = "DuplicateRegisteredRouteError";
  }
}

/** Thrown when keyed route middleware reuses a middleware-data key. */
export class DuplicateMiddlewareDataKeyError extends Error {
  /**
   * @param key The duplicated middleware data key.
   * @param method The HTTP method where the duplicate appears.
   * @param path The resolved route path.
   */
  constructor(key: string, method: EndpointMethod, path: string) {
    super(
      `Duplicate middleware data key "${key}" detected for ${method} ${path}.`,
    );
    this.name = "DuplicateMiddlewareDataKeyError";
  }
}

/** Thrown when a method helper is attached under the wrong route method key. */
export class MismatchedRouteMethodError extends Error {
  /**
   * @param routeMethod The method key used in the route object.
   * @param operationMethod The method carried by the attached operation object.
   */
  constructor(routeMethod: EndpointMethod, operationMethod: EndpointMethod) {
    super(
      `Route method key "${routeMethod}" does not match operation method "${operationMethod}".`,
    );
    this.name = "MismatchedRouteMethodError";
  }
}

/** Validates that a route segment contains at most one relative path segment. */
const validatePathSegment = (pathSegment: string): void => {
  const normalizedSegment = normalizeSegment(pathSegment);

  if (!normalizedSegment) {
    return;
  }

  if (normalizedSegment.includes("/")) {
    throw new InvalidRouteSegmentError(pathSegment);
  }
};

/**
 * Validates sibling route segments recursively.
 *
 * @param routes The sibling routes to validate.
 * @param basePath The already-resolved parent path.
 *
 * @typeParam TContext The context type used by the route tree.
 */
const validateRouteSiblings = <TContext>(
  routes: RouteSegment<TContext>[],
  basePath = "",
): void => {
  const seenSegments = new Set<string>();

  for (const route of routes) {
    validatePathSegment(route.pathSegment);

    const normalizedSegment = normalizeSegment(route.pathSegment);
    const fullPath = joinPath(basePath, normalizedSegment);

    if (seenSegments.has(normalizedSegment)) {
      throw new DuplicateRouteSegmentError(fullPath);
    }

    seenSegments.add(normalizedSegment);

    if (route.children?.length) {
      validateRouteSiblings(route.children, fullPath);
    }
  }
};

/** Type guard for method-specific operation objects. */
const isRouteMethodOperation = <M extends EndpointMethod, TContext>(
  entry: RouteMethodEntry<M, TContext>,
): entry is RouteMethodOperation<M, unknown> => {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "method" in entry &&
    typeof entry.method === "string" &&
    "handler" in entry &&
    typeof entry.handler === "function"
  );
};

/** Type guard for explicit method config objects. */
const isRouteMethodConfig = <M extends EndpointMethod, TContext>(
  entry: RouteMethodEntry<M, TContext>,
): entry is Extract<
  RouteMethodEntry<M, TContext>,
  { handler: RouteHandler<TContext> }
> => {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "handler" in entry &&
    typeof entry.handler === "function" &&
    !("method" in entry)
  );
};

/**
 * Normalizes a method entry into a registered handler shape.
 *
 * @param method The route method key.
 * @param entry The method entry attached to the route.
 * @returns A normalized registered route payload without a resolved path.
 *
 * @typeParam M The HTTP method being normalized.
 * @typeParam TContext The context type accepted by the handler.
 */
const normalizeRouteMethodEntry = <M extends EndpointMethod, TContext>(
  method: M,
  entry: RouteMethodEntry<M, TContext>,
): RegisteredRoute<TContext> => {
  if (typeof entry === "function") {
    return {
      method,
      path: "",
      handler: entry,
    };
  }

  if (isRouteMethodOperation(entry)) {
    if (entry.method !== method) {
      throw new MismatchedRouteMethodError(method, entry.method);
    }

    return {
      method,
      path: "",
      handler: entry.handler as RouteHandler<TContext>,
      docs: entry.docs,
      middlewares: entry.middlewares,
    };
  }

  if (isRouteMethodConfig(entry)) {
    return {
      method,
      path: "",
      handler: entry.handler,
      docs: entry.docs,
      middlewares: entry.middlewares,
    };
  }

  throw new TypeError(`Unsupported route method entry for ${method}.`);
};

/**
 * Flattens a route tree into method/path/handler registrations.
 *
 * @param routes The route tree to flatten.
 * @param basePath The already-resolved parent path.
 * @returns Flat registered route entries ready for adapter registration.
 *
 * @typeParam TContext The context type accepted by the handlers.
 */
const flattenRoutes = <TContext>(
  routes: RouteSegment<TContext>[],
  basePath = "",
): RegisteredRoute<TContext>[] => {
  validateRouteSiblings(routes, basePath);

  const registeredRoutes: RegisteredRoute<TContext>[] = [];

  for (const route of routes) {
    const fullPath = joinPath(basePath, route.pathSegment);

    for (const method of ENDPOINT_METHODS) {
      const methodEntry = route[method];

      if (!methodEntry) {
        continue;
      }

      const normalizedMethod = normalizeRouteMethodEntry(method, methodEntry);

      registeredRoutes.push({
        method: normalizedMethod.method,
        path: fullPath || "/",
        handler: normalizedMethod.handler,
        docs: normalizedMethod.docs,
        middlewares: normalizedMethod.middlewares,
      });
    }

    if (route.children?.length) {
      registeredRoutes.push(...flattenRoutes(route.children, fullPath));
    }
  }

  return registeredRoutes;
};

class MiddlewareHaltError extends Error {
  constructor(readonly output: MiddlewareHaltOutput) {
    super("Route middleware halted the request.");
    this.name = "MiddlewareHaltError";
  }
}

const validateMiddlewareDataKeys = (
  middlewares: readonly RouteMiddleware[] | undefined,
  method: EndpointMethod,
  path: string,
): void => {
  if (!middlewares?.length) {
    return;
  }

  const seenKeys = new Set<string>();

  for (const middleware of middlewares) {
    if (middleware.kind !== "keyed") {
      continue;
    }

    if (seenKeys.has(middleware.key)) {
      throw new DuplicateMiddlewareDataKeyError(middleware.key, method, path);
    }

    seenKeys.add(middleware.key);
  }
};

const composeRouteHandler = <TContext extends CurioHttpContext>(
  handler: RouteHandler<TContext>,
  middlewares: readonly RouteMiddleware<any>[] | undefined,
): RouteHandler<TContext> => {
  if (!middlewares?.length) {
    return handler;
  }

  return async (ctx: TContext) => {
    const runChain = async (index: number): Promise<void> => {
      if (index >= middlewares.length) {
        await handler(ctx);
        return;
      }

      const middleware = middlewares[index];

      if (middleware.kind === "pass-through") {
        let nextAlreadyCalled = false;

        await (middleware.run as PassThroughRouteMiddlewareHandler<TContext>)(
          ctx,
          async () => {
            if (nextAlreadyCalled) {
              throw new Error(
                "Route middleware called next() more than once in a single pass.",
              );
            }

            nextAlreadyCalled = true;
            await runChain(index + 1);
          },
        );

        return;
      }

      const middlewareData = await (
        middleware.run as KeyedRouteMiddlewareHandler<TContext, unknown>
      )({
        ctx,
        halt(output) {
          throw new MiddlewareHaltError(output);
        },
      });

      (
        ctx.middlewareData as Record<string, unknown>
      )[middleware.key] = middlewareData;
      await runChain(index + 1);
    };

    try {
      await runChain(0);
    } catch (error) {
      if (error instanceof MiddlewareHaltError) {
        await ctx.response.send(error.output);
        return;
      }

      throw error;
    }
  };
};

/**
 * Validates that no resolved method/path pair is registered twice.
 *
 * @param routes The flattened registered routes to validate.
 *
 * @typeParam TContext The context type accepted by the handlers.
 */
const validateRegisteredRoutes = <TContext>(
  routes: RegisteredRoute<TContext>[],
): void => {
  const seenRouteHandlers = new Set<string>();

  for (const route of routes) {
    const routeIdentity = `${route.method} ${route.path}`;

    if (seenRouteHandlers.has(routeIdentity)) {
      throw new DuplicateRegisteredRouteError(route.method, route.path);
    }

    seenRouteHandlers.add(routeIdentity);
  }
};

const buildRegisteredRoutes = <TContext extends CurioHttpContext>(
  routes: RouteSegment<TContext>[],
): ApiBuildRoute<TContext>[] => {
  const registeredRoutes = flattenRoutes(routes);
  validateRegisteredRoutes(registeredRoutes);

  return registeredRoutes.map((route) => {
    validateMiddlewareDataKeys(route.middlewares, route.method, route.path);

    return {
      ...route,
      schemas: getHandlerSchemas(route.handler),
      runtimeHandler: composeRouteHandler(route.handler, route.middlewares),
    };
  });
};

/**
 * Creates an API factory bound to a specific HTTP adapter.
 *
 * @param adapter The HTTP adapter used to create and populate the router.
 * @returns An object with a `from(...)` helper that assembles the API.
 *
 * @typeParam TRouter The router/runtime type produced by the adapter.
 * @typeParam TRawContext The raw transport context type handled by the adapter.
 */
const createApiFactory = <TRouter, TRawContext>(
  adapter: HttpAdapter<TRouter, TRawContext>,
) => {
  return {
    build<TContext extends CurioHttpContext>(
      routes: RouteSegment<TContext>[],
    ): ApiBuildResult<TRouter, TContext> {
      const router = adapter.createRouter();
      const builtRoutes = buildRegisteredRoutes(routes);

      for (const route of builtRoutes) {
        adapter.registerRoute(
          router,
          route.method,
          route.path,
          route.runtimeHandler as RouteHandler<CurioHttpContext>,
        );
      }

      return {
        router,
        routes: builtRoutes,
      };
    },
    from<TContext extends CurioHttpContext>(routes: RouteSegment<TContext>[]) {
      return this.build(routes).router;
    },
  };
};

type ApiFactory<TRouter> = {
  build<TContext extends CurioHttpContext>(
    routes: RouteSegment<TContext>[],
  ): ApiBuildResult<TRouter, TContext>;
  from<TContext extends CurioHttpContext>(
    routes: RouteSegment<TContext>[],
  ): TRouter;
};

type ApiNamespace = {
  withHttp<TRouter, TRawContext>(
    adapter: HttpAdapter<TRouter, TRawContext>,
  ): ApiFactory<TRouter>;
};

/**
 * API assembly helpers.
 *
 * Turns route trees into runtime routers through an HTTP adapter.
 *
 * @remarks
 * This namespace is intentionally adapter-agnostic. Transport-specific
 * convenience entrypoints such as `@curio/core/http/oak` can layer their own
 * `API.from(...)` helper on top of it.
 */
export const API: ApiNamespace = {
  /**
   * Binds API assembly to a custom HTTP adapter.
   *
   * @param adapter The HTTP adapter to use for route registration.
   * @returns An API factory whose `from(...)` uses the provided adapter.
   *
   * @remarks
   * This keeps route authoring unchanged while swapping the runtime used to
   * register handlers.
   *
   * @example
   * ```ts
   * const api = API.withHttp(customAdapter);
   * const router = api.from(routes);
   * ```
   *
   * @typeParam TRouter The router/runtime type produced by the adapter.
   * @typeParam TRawContext The raw transport context type handled by the adapter.
   */
  withHttp<TRouter, TRawContext>(adapter: HttpAdapter<TRouter, TRawContext>) {
    return createApiFactory(adapter);
  },
};

/**
 * Internal helpers exposed for targeted testing and low-level inspection.
 */
export const INTERNALS = {
  buildRegisteredRoutes,
  composeRouteHandler,
  flattenRoutes,
  normalizeRouteMethodEntry,
  joinPath,
  validateMiddlewareDataKeys,
  validateRegisteredRoutes,
  validatePathSegment,
  validateRouteSiblings,
};
