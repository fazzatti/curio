import type { RouteHandler } from "@/api/types.ts";
import { handlerSchemasSymbol } from "@/api/with-schemas.ts";

/**
 * Schema metadata attached to a handler.
 *
 * @typeParam TRequest The request schema metadata type.
 * @typeParam TResponse The response schema metadata type.
 */
export type HandlerSchemas<TRequest = unknown, TResponse = unknown> = {
  /** Optional request schema metadata. */
  request?: TRequest;
  /** Optional response schema metadata. */
  response?: TResponse;
};

/**
 * Route handler carrying optional schema metadata.
 *
 * @typeParam TContext The context type accepted by the handler.
 * @typeParam TRequest The request schema metadata type.
 * @typeParam TResponse The response schema metadata type.
 */
export type HandlerWithSchemas<
  TContext = unknown,
  TRequest = unknown,
  TResponse = unknown,
> = RouteHandler<TContext> & {
  [handlerSchemasSymbol]?: HandlerSchemas<TRequest, TResponse>;
};
