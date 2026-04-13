import type {
  EnsureUniqueMiddlewareKeys,
  EndpointMethod,
  MiddlewareDataFromDefinitions,
  RouteMethodDocs,
  RouteMiddleware,
  RouteMethodOperation,
  WithMiddlewareData,
} from "@/api/types.ts";
import type { CurioHttpContext } from "@/http/types.ts";
import {
  createRequestPipe,
  type BuiltInPipeHandlerInput,
  type BuiltInPipeHandlerOutput,
  type BuiltInPipeOptions,
  type BuiltInPipeRequestSchema,
} from "@/pipelines/request-pipe.ts";
import { withSchemas } from "@/api/with-schemas.ts";
import {
  type InferValibotSchema,
  valibotSchemaAdapter,
  type ValibotSchema,
} from "@/schema/valibot.ts";

type ReadRequestSchema<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
> = {
  pathParams?: TPathParamsSchema;
  query?: TQuerySchema;
  body?: never;
};

type ReadHandlerInput<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
> = BuiltInPipeHandlerInput<TPathParamsSchema, TQuerySchema, undefined>;

type WriteRequestSchema<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
> = BuiltInPipeRequestSchema<TPathParamsSchema, TQuerySchema, TBodySchema>;

type WriteHandlerInput<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
> = BuiltInPipeHandlerInput<TPathParamsSchema, TQuerySchema, TBodySchema>;

type OperationPayload<
  TResponseSchema extends ValibotSchema | undefined = undefined,
> = TResponseSchema extends ValibotSchema
  ? InferValibotSchema<TResponseSchema>
  : unknown;

type OperationOutput<
  TResponseSchema extends ValibotSchema | undefined = undefined,
> = BuiltInPipeHandlerOutput<OperationPayload<TResponseSchema>>;

type ReadOperationOptions<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TResponseSchema extends ValibotSchema | undefined = undefined,
  TContext extends CurioHttpContext = CurioHttpContext,
  TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
    undefined,
> = {
  requestSchema?: ReadRequestSchema<TPathParamsSchema, TQuerySchema>;
  responseSchema?: TResponseSchema;
  docs?: RouteMethodDocs;
  middlewares?: EnsureUniqueMiddlewareKeys<TContext, TMiddlewares>;
  handler(
    input: ReadHandlerInput<TPathParamsSchema, TQuerySchema>,
    ctx: WithMiddlewareData<
      TContext,
      MiddlewareDataFromDefinitions<TContext, TMiddlewares>
    >,
  ): OperationOutput<TResponseSchema> | Promise<OperationOutput<TResponseSchema>>;
};

type WriteOperationOptions<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
  TResponseSchema extends ValibotSchema | undefined = undefined,
  TContext extends CurioHttpContext = CurioHttpContext,
  TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
    undefined,
> = {
  requestSchema?: WriteRequestSchema<
    TPathParamsSchema,
    TQuerySchema,
    TBodySchema
  >;
  responseSchema?: TResponseSchema;
  docs?: RouteMethodDocs;
  middlewares?: EnsureUniqueMiddlewareKeys<TContext, TMiddlewares>;
  handler(
    input: WriteHandlerInput<TPathParamsSchema, TQuerySchema, TBodySchema>,
    ctx: WithMiddlewareData<
      TContext,
      MiddlewareDataFromDefinitions<TContext, TMiddlewares>
    >,
  ): OperationOutput<TResponseSchema> | Promise<OperationOutput<TResponseSchema>>;
};

type ReadOperationBuilder<
  M extends "GET" | "DELETE",
  TContext extends CurioHttpContext = CurioHttpContext,
> = <
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TResponseSchema extends ValibotSchema | undefined = undefined,
  TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
    undefined,
>(
  options: ReadOperationOptions<
    TPathParamsSchema,
    TQuerySchema,
    TResponseSchema,
    TContext,
    TMiddlewares
  >,
) => RouteMethodOperation<
  M,
  WithMiddlewareData<
    TContext,
    MiddlewareDataFromDefinitions<TContext, TMiddlewares>
  >
>;

type WriteOperationBuilder<
  M extends "POST" | "PUT" | "PATCH",
  TContext extends CurioHttpContext = CurioHttpContext,
> = <
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
  TResponseSchema extends ValibotSchema | undefined = undefined,
  TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
    undefined,
>(
  options: WriteOperationOptions<
    TPathParamsSchema,
    TQuerySchema,
    TBodySchema,
    TResponseSchema,
    TContext,
    TMiddlewares
  >,
) => RouteMethodOperation<
  M,
  WithMiddlewareData<
    TContext,
    MiddlewareDataFromDefinitions<TContext, TMiddlewares>
  >
>;

/**
 * Built-in method helpers available for a Curio HTTP context.
 *
 * @remarks
 * These helpers construct method-specific operation objects such as
 * `GET(...)` and `POST(...)` with typed parsed input and validated responses.
 *
 * @typeParam TContext The Curio HTTP context type accepted by the handlers.
 */
export type EndpointOperations<
  TContext extends CurioHttpContext = CurioHttpContext,
> = {
  GET: ReadOperationBuilder<"GET", TContext>;
  POST: WriteOperationBuilder<"POST", TContext>;
  PUT: WriteOperationBuilder<"PUT", TContext>;
  PATCH: WriteOperationBuilder<"PATCH", TContext>;
  DELETE: ReadOperationBuilder<"DELETE", TContext>;
};

const createMethodOperation = <
  M extends EndpointMethod,
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
  TResponseSchema extends ValibotSchema | undefined = undefined,
  TContext extends CurioHttpContext = CurioHttpContext,
  TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
    undefined,
>(
  method: M,
  options: Omit<
    BuiltInPipeOptions<
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      WithMiddlewareData<
        TContext,
        MiddlewareDataFromDefinitions<TContext, TMiddlewares>
      >
  >,
  "schemaAdapter"
  > & {
    docs?: RouteMethodDocs;
    middlewares?: EnsureUniqueMiddlewareKeys<TContext, TMiddlewares>;
  },
): RouteMethodOperation<
  M,
  WithMiddlewareData<
    TContext,
    MiddlewareDataFromDefinitions<TContext, TMiddlewares>
  >
> => {
  const builtPipe = createRequestPipe({
    ...options,
    schemaAdapter: valibotSchemaAdapter,
  });

  const handler = async (
    ctx: WithMiddlewareData<
      TContext,
      MiddlewareDataFromDefinitions<TContext, TMiddlewares>
    >,
  ) => {
    await builtPipe(ctx);
  };

  return {
    method,
    handler: withSchemas(handler, {
      request: options.requestSchema,
      response: options.responseSchema,
    }),
    docs: options.docs,
    middlewares: options.middlewares as readonly RouteMiddleware[] | undefined,
  } satisfies RouteMethodOperation<
    M,
    WithMiddlewareData<
      TContext,
      MiddlewareDataFromDefinitions<TContext, TMiddlewares>
    >
  >;
};

/**
 * Creates typed method helpers for a specific Curio HTTP context.
 *
 * @remarks
 * Transport-specific entrypoints such as `@curio/core/http/oak` use this to
 * expose `GET(...)`, `POST(...)`, and the other built-in method helpers while
 * preserving the correct `ctx.raw` type for handlers and middlewares.
 *
 * @typeParam TContext The Curio HTTP context type accepted by the handlers.
 */
export const createEndpointOperations = <
  TContext extends CurioHttpContext = CurioHttpContext,
>(): EndpointOperations<TContext> => {
  const GET = <
    TPathParamsSchema extends ValibotSchema | undefined = undefined,
    TQuerySchema extends ValibotSchema | undefined = undefined,
    TResponseSchema extends ValibotSchema | undefined = undefined,
    TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
      undefined,
  >(
    options: ReadOperationOptions<
      TPathParamsSchema,
      TQuerySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >,
  ) => {
    return createMethodOperation<
      "GET",
      TPathParamsSchema,
      TQuerySchema,
      undefined,
      TResponseSchema,
      TContext,
      TMiddlewares
    >("GET", options);
  };

  const POST = <
    TPathParamsSchema extends ValibotSchema | undefined = undefined,
    TQuerySchema extends ValibotSchema | undefined = undefined,
    TBodySchema extends ValibotSchema | undefined = undefined,
    TResponseSchema extends ValibotSchema | undefined = undefined,
    TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
      undefined,
  >(
    options: WriteOperationOptions<
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >,
  ) => {
    return createMethodOperation<
      "POST",
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >("POST", options);
  };

  const PUT = <
    TPathParamsSchema extends ValibotSchema | undefined = undefined,
    TQuerySchema extends ValibotSchema | undefined = undefined,
    TBodySchema extends ValibotSchema | undefined = undefined,
    TResponseSchema extends ValibotSchema | undefined = undefined,
    TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
      undefined,
  >(
    options: WriteOperationOptions<
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >,
  ) => {
    return createMethodOperation<
      "PUT",
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >("PUT", options);
  };

  const PATCH = <
    TPathParamsSchema extends ValibotSchema | undefined = undefined,
    TQuerySchema extends ValibotSchema | undefined = undefined,
    TBodySchema extends ValibotSchema | undefined = undefined,
    TResponseSchema extends ValibotSchema | undefined = undefined,
    TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
      undefined,
  >(
    options: WriteOperationOptions<
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >,
  ) => {
    return createMethodOperation<
      "PATCH",
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >("PATCH", options);
  };

  const DELETE = <
    TPathParamsSchema extends ValibotSchema | undefined = undefined,
    TQuerySchema extends ValibotSchema | undefined = undefined,
    TResponseSchema extends ValibotSchema | undefined = undefined,
    TMiddlewares extends readonly RouteMiddleware<TContext>[] | undefined =
      undefined,
  >(
    options: ReadOperationOptions<
      TPathParamsSchema,
      TQuerySchema,
      TResponseSchema,
      TContext,
      TMiddlewares
    >,
  ) => {
    return createMethodOperation<
      "DELETE",
      TPathParamsSchema,
      TQuerySchema,
      undefined,
      TResponseSchema,
      TContext,
      TMiddlewares
    >("DELETE", options);
  };

  return {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE,
  };
};

const defaultEndpointOperations: EndpointOperations<CurioHttpContext> =
  createEndpointOperations<CurioHttpContext>();

/** Root-context `GET(...)` helper. */
export const GET: EndpointOperations<CurioHttpContext>["GET"] =
  defaultEndpointOperations.GET;
/** Root-context `POST(...)` helper. */
export const POST: EndpointOperations<CurioHttpContext>["POST"] =
  defaultEndpointOperations.POST;
/** Root-context `PUT(...)` helper. */
export const PUT: EndpointOperations<CurioHttpContext>["PUT"] =
  defaultEndpointOperations.PUT;
/** Root-context `PATCH(...)` helper. */
export const PATCH: EndpointOperations<CurioHttpContext>["PATCH"] =
  defaultEndpointOperations.PATCH;
/** Root-context `DELETE(...)` helper. */
export const DELETE: EndpointOperations<CurioHttpContext>["DELETE"] =
  defaultEndpointOperations.DELETE;
