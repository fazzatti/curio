import type { RouteHandler } from "@/api/types.ts";
import type {
  HandlerSchemas,
  HandlerWithSchemas,
} from "@/api/with-schemas/types.ts";

/** Symbol used to store schema metadata on a handler function. */
export const handlerSchemasSymbol = Symbol("curio.handlerSchemas");

export type {
  HandlerSchemas,
  HandlerWithSchemas,
} from "@/api/with-schemas/types.ts";

/**
 * Attaches schema metadata to a handler.
 *
 * @param handler The handler to decorate.
 * @param schemas Request and response schema metadata to store on the handler.
 * @returns The same handler with non-enumerable schema metadata attached.
 *
 * @remarks
 * This helper does not change handler behavior. It exists so tooling can read
 * schema metadata later without changing the runtime handler shape.
 *
 * @example
 * ```ts
 * const handler = withSchemas(
 *   async (ctx) => {
 *     ctx.response.send({
 *       payload: { ok: true },
 *     });
 *   },
 *   {
 *     response: v.object({ ok: v.boolean() }),
 *   },
 * );
 * ```
 *
 * @typeParam TContext The context type accepted by the handler.
 * @typeParam TRequest The request schema metadata type.
 * @typeParam TResponse The response schema metadata type.
 */
export const withSchemas = <
  TContext,
  TRequest = unknown,
  TResponse = unknown,
>(
  handler: RouteHandler<TContext>,
  schemas: HandlerSchemas<TRequest, TResponse>,
): HandlerWithSchemas<TContext, TRequest, TResponse> => {
  Object.defineProperty(handler, handlerSchemasSymbol, {
    configurable: false,
    enumerable: false,
    value: schemas,
    writable: false,
  });

  return handler as HandlerWithSchemas<TContext, TRequest, TResponse>;
};

/**
 * Reads schema metadata from a handler.
 *
 * @param handler The handler to inspect.
 * @returns Attached schema metadata when present.
 *
 * @remarks
 * Plain handlers return `undefined`. Decorated handlers return the same schema
 * metadata that was attached through `withSchemas(...)`.
 *
 * @typeParam TContext The context type accepted by the handler.
 */
export const getHandlerSchemas = <TContext>(
  handler: RouteHandler<TContext>,
): HandlerSchemas | undefined => {
  return (handler as HandlerWithSchemas<TContext>)[handlerSchemasSymbol];
};
