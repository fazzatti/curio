import type { EndpointMethod, RouteHandler } from "@/api/types.ts";

/** HTTP response headers accepted by the Curio response helpers. */
export type HttpResponseHeaders = HeadersInit;

/** Response payload written by `ctx.response.send(...)`. */
export type HttpResponseOutput = {
  /** Body payload to send to the client. */
  payload: unknown;
  /** Optional HTTP status override. */
  status?: number;
  /** Optional headers to merge into the response. */
  headers?: HttpResponseHeaders;
};

/** Curio-owned request surface exposed to handlers and built-in pipes. */
export type CurioHttpRequest = {
  /** Raw HTTP method such as `GET` or `POST`. */
  method: string;
  /** Resolved request path. */
  path: string;
  /** Raw request headers. */
  headers: Headers;
  /** Raw search parameters. */
  query: URLSearchParams;
  /** Raw path parameter strings. */
  params: Record<string, string>;
  /** Reads the raw request body. */
  body(): Promise<unknown>;
};

/** Curio-owned response surface exposed to handlers and built-in pipes. */
export type CurioHttpResponse = {
  /** Sets the response status immediately on the underlying transport. */
  setStatus(status: number): void;
  /** Sets response headers immediately on the underlying transport. */
  setHeaders(headers: HttpResponseHeaders): void;
  /** Sets the response body payload immediately on the underlying transport. */
  setPayload(payload: unknown): void;
  /** Sends a full response payload in one call. */
  send(output: HttpResponseOutput): void | Promise<void>;
};

/**
 * Curio-owned HTTP context.
 *
 * Parsed values are intentionally kept out of this shape. Built-in pipelines
 * store parsed request state in Convee run context instead.
 *
 * @typeParam TRaw The underlying framework context type.
 * @typeParam TMiddlewareData Data populated by route middlewares.
 */
export type CurioHttpContext<
  TRaw = unknown,
  TMiddlewareData extends Record<string, unknown> = Record<never, never>,
> = {
  /** Escape hatch to the raw framework context. */
  raw: TRaw;
  /** Raw request surface. */
  request: CurioHttpRequest;
  /** Response mutation helpers. */
  response: CurioHttpResponse;
  /** Data added by Curio route middlewares before the handler runs. */
  middlewareData: TMiddlewareData;
};

/**
 * Minimal HTTP adapter contract used by API assembly.
 *
 * @typeParam TRouter The router/runtime type produced by the adapter.
 * @typeParam TRawContext The raw transport context accepted by the adapter.
 * @typeParam TContext The Curio context shape created from the raw context.
 */
export type HttpAdapter<
  TRouter,
  TRawContext = unknown,
  TContext extends CurioHttpContext<TRawContext> = CurioHttpContext<TRawContext>,
> = {
  /** Creates an empty router/runtime container. */
  createRouter(): TRouter;
  /** Converts a raw framework context into the Curio HTTP context shape. */
  createContext(rawContext: TRawContext): TContext;
  /** Registers a method/path/handler pair on the adapter router. */
  registerRoute(
    router: TRouter,
    method: EndpointMethod,
    path: string,
    handler: RouteHandler<CurioHttpContext>,
  ): void;
};
