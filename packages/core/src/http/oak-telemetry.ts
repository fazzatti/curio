/**
 * Oak-specific OpenTelemetry integration helpers.
 *
 * @module
 *
 * @remarks
 * This entrypoint keeps OpenTelemetry explicit and transport-specific. Curio
 * enriches request telemetry with route-aware metadata for Oak apps, while
 * leaving exporter and provider bootstrapping to the Deno runtime.
 */
import type {
  Context as OakContext,
  RouterContext as OakRouterContext,
} from "@oak/oak";
import {
  SpanKind,
  type SpanOptions,
  SpanStatusCode,
  trace,
  type Tracer,
} from "@opentelemetry/api";
import type { ApiBuildResult, ApiBuildRoute } from "@/api/api.ts";
import type { oakHttpAdapter } from "@/http/oak.ts";
import type { CurioHttpContext } from "@/http/types.ts";

type TelemetryAttributes = Record<string, string | number | boolean>;

type TelemetrySpan = {
  end(): void;
  recordException(error: Error | string): void;
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: { code: unknown; message?: string }): void;
  updateName(name: string): void;
};

type TelemetryTracer = {
  startActiveSpan<T>(
    name: string,
    options: {
      attributes?: TelemetryAttributes;
      kind?: unknown;
    },
    run: (span: TelemetrySpan) => T | Promise<T>,
  ): T | Promise<T>;
};

type TelemetryRuntimeApi = {
  getActiveSpan(): TelemetrySpan | undefined;
  getTracer(name: string, version?: string): TelemetryTracer;
  SpanKind: {
    SERVER: unknown;
  };
  SpanStatusCode: {
    ERROR: unknown;
  };
};

type CompiledRoute<TContext extends OakTelemetryContext> = {
  pattern: RegExp;
  route: ApiBuildRoute<TContext>;
};

type TelemetryContext = {
  request: {
    method: string;
    url: URL;
  };
  response: {
    status?: number;
  };
};

const DEFAULT_TRACER_NAME = "@curio/core/http/oak";
const OPERATION_ID_ATTRIBUTE = "curio.route.operation_id";

const TELEMETRY_RUNTIME: TelemetryRuntimeApi = {
  getActiveSpan() {
    return trace.getActiveSpan() ?? undefined;
  },
  getTracer(name, version) {
    const tracer = trace.getTracer(name, version);

    return {
      startActiveSpan(spanName, options, run) {
        return tracer.startActiveSpan(
          spanName,
          options as SpanOptions,
          run,
        );
      },
    };
  },
  SpanKind,
  SpanStatusCode,
};

/** Oak-flavoured Curio HTTP context accepted by route-aware telemetry. */
export type OakTelemetryContext = CurioHttpContext<OakRouterContext<string>>;

/**
 * Oak API build artifact accepted by the telemetry helper.
 *
 * @remarks
 * Pass the result of `API.build(routes)` to `telemetry(...)` when you want an
 * explicit middleware factory, or call `runtime.telemetry()` from the Oak API
 * build result convenience surface.
 */
export type OakTelemetryRuntime<
  TContext extends OakTelemetryContext = OakTelemetryContext,
> = ApiBuildResult<ReturnType<typeof oakHttpAdapter.createRouter>, TContext>;

/**
 * Optional settings for Curio's Oak telemetry middleware.
 *
 * @remarks
 * Curio uses its own tracer name by default because this middleware is
 * framework instrumentation. Pass a custom tracer only when you have a
 * specific integration reason to do so.
 */
export type OakTelemetryOptions = {
  /** Explicit tracer instance used instead of the default Curio tracer. */
  tracer?: Tracer;
  /** Optional tracer name override used when `tracer` is omitted. */
  tracerName?: string;
  /** Optional tracer version used when `tracer` is omitted. */
  tracerVersion?: string;
};

/**
 * Oak middleware shape returned by Curio's telemetry helper.
 *
 * @remarks
 * Register the returned middleware before `runtime.router.routes()` so the
 * request span stays active while Oak dispatches the route handler.
 */
export type OakTelemetryMiddleware = (
  ctx: OakContext,
  next: () => Promise<unknown>,
) => Promise<void>;

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const compileRoutePattern = (path: string): RegExp => {
  if (path === "/") {
    return /^\/$/;
  }

  const segments = path.split("/").filter(Boolean);
  const pattern = segments.map((segment) =>
    segment.startsWith(":") ? "[^/]+" : escapeRegex(segment)
  ).join("/");

  return new RegExp(`^/${pattern}$`);
};

const compileRoutes = <TContext extends OakTelemetryContext>(
  routes: ApiBuildRoute<TContext>[],
): CompiledRoute<TContext>[] => {
  return routes.map((route) => ({
    pattern: compileRoutePattern(route.path),
    route,
  }));
};

const findMatchingRoute = <TContext extends OakTelemetryContext>(
  routes: CompiledRoute<TContext>[],
  method: string,
  pathname: string,
): ApiBuildRoute<TContext> | undefined => {
  for (const compiledRoute of routes) {
    if (compiledRoute.route.method !== method) {
      continue;
    }

    if (compiledRoute.pattern.test(pathname)) {
      return compiledRoute.route;
    }
  }

  return undefined;
};

const getOperationId = <TContext extends OakTelemetryContext>(
  route: ApiBuildRoute<TContext> | undefined,
): string | undefined => {
  const operationId = route?.docs?.operationId?.trim();
  return operationId ? operationId : undefined;
};

const resolveSpanName = <TContext extends OakTelemetryContext>(
  method: string,
  route: ApiBuildRoute<TContext> | undefined,
): string => {
  return route ? `${method} ${route.path}` : method;
};

const buildFallbackAttributes = <TContext extends OakTelemetryContext>(
  ctx: TelemetryContext,
  route: ApiBuildRoute<TContext> | undefined,
): TelemetryAttributes => {
  const attributes: TelemetryAttributes = {
    "http.request.method": ctx.request.method,
    "url.full": ctx.request.url.toString(),
    "url.path": ctx.request.url.pathname,
  };

  if (ctx.request.url.search.length > 1) {
    attributes["url.query"] = ctx.request.url.search.slice(1);
  }

  if (route) {
    attributes["http.route"] = route.path;
  }

  const operationId = getOperationId(route);

  if (operationId) {
    attributes[OPERATION_ID_ATTRIBUTE] = operationId;
  }

  return attributes;
};

const applyRouteMetadata = <TContext extends OakTelemetryContext>(
  span: TelemetrySpan,
  method: string,
  route: ApiBuildRoute<TContext> | undefined,
): void => {
  if (!route) {
    return;
  }

  span.updateName(resolveSpanName(method, route));
  span.setAttribute("http.route", route.path);

  const operationId = getOperationId(route);

  if (operationId) {
    span.setAttribute(OPERATION_ID_ATTRIBUTE, operationId);
  }
};

const recordSpanError = (
  span: TelemetrySpan,
  error: unknown,
  runtime: TelemetryRuntimeApi,
): void => {
  const exception = error instanceof Error ? error : String(error);

  span.recordException(exception);
  span.setStatus({
    code: runtime.SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
};

const resolveTracer = (
  options: OakTelemetryOptions,
  runtime: TelemetryRuntimeApi,
): TelemetryTracer => {
  if (options.tracer) {
    return {
      startActiveSpan(name, spanOptions, run) {
        return options.tracer!.startActiveSpan(
          name,
          spanOptions as SpanOptions,
          run,
        );
      },
    };
  }

  return runtime.getTracer(
    options.tracerName ?? DEFAULT_TRACER_NAME,
    options.tracerVersion,
  );
};

const createTelemetryMiddleware = <TContext extends OakTelemetryContext>(
  runtime: OakTelemetryRuntime<TContext>,
  options: OakTelemetryOptions,
  telemetryRuntime: TelemetryRuntimeApi,
): OakTelemetryMiddleware => {
  const compiledRoutes = compileRoutes(runtime.routes);
  const tracer = resolveTracer(options, telemetryRuntime);

  return async (ctx, next) => {
    const route = findMatchingRoute(
      compiledRoutes,
      ctx.request.method,
      ctx.request.url.pathname,
    );
    const activeSpan = telemetryRuntime.getActiveSpan();

    if (activeSpan) {
      applyRouteMetadata(activeSpan, ctx.request.method, route);

      try {
        await next();
      } catch (error) {
        recordSpanError(activeSpan, error, telemetryRuntime);
        throw error;
      }

      return;
    }

    await tracer.startActiveSpan(
      resolveSpanName(ctx.request.method, route),
      {
        kind: telemetryRuntime.SpanKind.SERVER,
        attributes: buildFallbackAttributes(ctx, route),
      },
      async (span) => {
        try {
          await next();

          if (typeof ctx.response.status === "number") {
            span.setAttribute(
              "http.response.status_code",
              ctx.response.status,
            );
          }
        } catch (error) {
          recordSpanError(span, error, telemetryRuntime);
          throw error;
        } finally {
          span.end();
        }
      },
    );
  };
};

/**
 * Builds Oak middleware that enriches request telemetry with Curio route
 * metadata.
 *
 * @param runtime The route build artifact returned by `API.build(routes)`.
 * @param options Optional tracer overrides for advanced integrations.
 * @returns Oak middleware that should run before `runtime.router.routes()`.
 *
 * @remarks
 * Curio does not bootstrap OpenTelemetry providers or exporters. In Deno,
 * runtime setup still comes from environment-driven OpenTelemetry support. This
 * middleware only adds Curio-aware route metadata and creates a fallback
 * request span when no active span already exists.
 */
export const telemetry = <TContext extends OakTelemetryContext>(
  runtime: OakTelemetryRuntime<TContext>,
  options: OakTelemetryOptions = {},
): OakTelemetryMiddleware => {
  return createTelemetryMiddleware(runtime, options, TELEMETRY_RUNTIME);
};

/**
 * Internal helpers exposed for focused telemetry tests.
 */
export const INTERNALS = {
  applyRouteMetadata,
  buildFallbackAttributes,
  compileRoutePattern,
  compileRoutes,
  createTelemetryMiddleware,
  findMatchingRoute,
  getOperationId,
  recordSpanError,
  resolveSpanName,
};
