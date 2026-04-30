import type { CurioHttpContext } from "@/http/types.ts";
import type { SchemaAdapter } from "@/schema/types.ts";
import type { InferValibotSchema, ValibotSchema } from "@/schema/valibot.ts";

type MaybePromise<T> = T | Promise<T>;

export type BuiltInPipeRequestSchema<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
> = {
  pathParams?: TPathParamsSchema;
  query?: TQuerySchema;
  body?: TBodySchema;
};

export type BuiltInPipeHandlerInput<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
> =
  & (TPathParamsSchema extends ValibotSchema
    ? { pathParams: InferValibotSchema<TPathParamsSchema> }
    : Record<never, never>)
  & (TQuerySchema extends ValibotSchema
    ? { query: InferValibotSchema<TQuerySchema> }
    : Record<never, never>)
  & (TBodySchema extends ValibotSchema
    ? { body: InferValibotSchema<TBodySchema> }
    : Record<never, never>);

export type BuiltInPipeHandlerOutput<TPayload = unknown> = {
  payload: TPayload;
  status?: number;
  headers?: HeadersInit;
};

type BuiltInResponsePayload<
  TResponseSchema extends ValibotSchema | undefined = undefined,
> = TResponseSchema extends ValibotSchema ? InferValibotSchema<TResponseSchema>
  : unknown;

export type BuiltInPipeOptions<
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
  TResponseSchema extends ValibotSchema | undefined = undefined,
  TContext extends CurioHttpContext = CurioHttpContext,
> = {
  requestSchema?: BuiltInPipeRequestSchema<
    TPathParamsSchema,
    TQuerySchema,
    TBodySchema
  >;
  responseSchema?: TResponseSchema;
  schemaAdapter: SchemaAdapter<ValibotSchema>;
  handler:
    | ((
      input: BuiltInPipeHandlerInput<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema
      >,
    ) => MaybePromise<
      BuiltInPipeHandlerOutput<BuiltInResponsePayload<TResponseSchema>>
    >)
    | ((
      input: BuiltInPipeHandlerInput<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema
      >,
      ctx: TContext,
    ) => MaybePromise<
      BuiltInPipeHandlerOutput<BuiltInResponsePayload<TResponseSchema>>
    >);
};

export type BuiltInPipe<TContext extends CurioHttpContext = CurioHttpContext> =
  (
    ctx: TContext,
  ) => Promise<TContext>;
