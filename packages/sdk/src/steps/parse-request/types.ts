import type { CurioHttpContext } from "@/http/types.ts";

/**
 * Shared Convee run-context state used by the built-in HTTP pipelines.
 *
 * Parsed request pieces live here instead of being appended to the Curio HTTP
 * context itself.
 */
export type HttpPipelineState<
  TPathParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  TContext extends CurioHttpContext = CurioHttpContext,
> = {
  /** Current Curio HTTP context. */
  ctx?: TContext;
  /** Parsed path parameters. */
  pathParams?: TPathParams;
  /** Parsed query parameters. */
  query?: TQuery;
  /** Parsed request body for future non-GET pipelines. */
  body?: TBody;
};
