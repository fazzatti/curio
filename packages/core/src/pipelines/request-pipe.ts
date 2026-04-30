import { pipe, step, type StepThis } from "@convee";
import type { CurioHttpContext } from "@/http/types.ts";
import type { SchemaAdapter } from "@/schema/types.ts";
import type { InferValibotSchema, ValibotSchema } from "@/schema/valibot.ts";
import {
  createParseBodyStep,
  createParsePathParamsStep,
  createParseQueryStep,
  createPassThroughHttpContextStep,
  createSeedHttpContextStep,
  type HttpPipelineState,
} from "@/steps/parse-request.ts";
import type {
  BuiltInPipe,
  BuiltInPipeHandlerInput,
  BuiltInPipeHandlerOutput,
  BuiltInPipeOptions,
} from "@/pipelines/request-pipe/types.ts";

export type {
  BuiltInPipe,
  BuiltInPipeHandlerInput,
  BuiltInPipeHandlerOutput,
  BuiltInPipeOptions,
  BuiltInPipeRequestSchema,
} from "@/pipelines/request-pipe/types.ts";

type BuiltInResponsePayload<
  TResponseSchema extends ValibotSchema | undefined = undefined,
> = TResponseSchema extends ValibotSchema ? InferValibotSchema<TResponseSchema>
  : unknown;

type BuiltInPipeState<
  TPathParamsSchema extends ValibotSchema | undefined,
  TQuerySchema extends ValibotSchema | undefined,
  TBodySchema extends ValibotSchema | undefined,
  TContext extends CurioHttpContext,
> = HttpPipelineState<
  TPathParamsSchema extends ValibotSchema
    ? InferValibotSchema<TPathParamsSchema>
    : never,
  TQuerySchema extends ValibotSchema ? InferValibotSchema<TQuerySchema> : never,
  TBodySchema extends ValibotSchema ? InferValibotSchema<TBodySchema> : never,
  TContext
>;

const createBuildHandlerInputStep = <
  TPathParamsSchema extends ValibotSchema | undefined,
  TQuerySchema extends ValibotSchema | undefined,
  TBodySchema extends ValibotSchema | undefined,
  TContext extends CurioHttpContext,
>() =>
  step.withContext<
    BuiltInPipeState<TPathParamsSchema, TQuerySchema, TBodySchema, TContext>
  >()(
    function (
      this: StepThis<
        BuiltInPipeState<
          TPathParamsSchema,
          TQuerySchema,
          TBodySchema,
          TContext
        >
      >,
      _ctx: CurioHttpContext,
    ) {
      const input: Record<string, unknown> = {};
      const pathParams = this.context().state.get("pathParams");
      const query = this.context().state.get("query");
      const body = this.context().state.get("body");

      if (pathParams !== undefined) {
        Object.assign(input, { pathParams });
      }

      if (query !== undefined) {
        Object.assign(input, { query });
      }

      if (body !== undefined) {
        Object.assign(input, { body });
      }

      return input as BuiltInPipeHandlerInput<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema
      >;
    },
    {
      id: "build-handler-input",
    },
  );

const createSendResponseStep = <
  TPathParamsSchema extends ValibotSchema | undefined,
  TQuerySchema extends ValibotSchema | undefined,
  TBodySchema extends ValibotSchema | undefined,
  TResponseSchema extends ValibotSchema | undefined,
  TContext extends CurioHttpContext,
>(
  schemaAdapter: SchemaAdapter<ValibotSchema>,
  responseSchema?: TResponseSchema,
) =>
  step.withContext<
    BuiltInPipeState<TPathParamsSchema, TQuerySchema, TBodySchema, TContext>
  >()(
    async function (
      this: StepThis<
        BuiltInPipeState<
          TPathParamsSchema,
          TQuerySchema,
          TBodySchema,
          TContext
        >
      >,
      output: BuiltInPipeHandlerOutput<BuiltInResponsePayload<TResponseSchema>>,
    ) {
      const ctx = this.context().state.get("ctx");

      if (!ctx) {
        throw new Error("Missing HTTP context in pipeline state.");
      }

      const payload = responseSchema
        ? schemaAdapter.parse<BuiltInResponsePayload<TResponseSchema>>(
          responseSchema,
          output.payload,
        )
        : output.payload;

      await ctx.response.send({
        payload,
        status: output.status,
        headers: output.headers,
      });

      return ctx;
    },
    {
      id: "send-response",
    },
  );

const createInvokeHandlerWithContextStep = <
  TPathParamsSchema extends ValibotSchema | undefined,
  TQuerySchema extends ValibotSchema | undefined,
  TBodySchema extends ValibotSchema | undefined,
  TResponseSchema extends ValibotSchema | undefined,
  TContext extends CurioHttpContext,
>(
  handler: NonNullable<
    BuiltInPipeOptions<
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext
    >["handler"]
  >,
) =>
  step.withContext<
    BuiltInPipeState<TPathParamsSchema, TQuerySchema, TBodySchema, TContext>
  >()(
    function (
      this: StepThis<
        BuiltInPipeState<
          TPathParamsSchema,
          TQuerySchema,
          TBodySchema,
          TContext
        >
      >,
      input: BuiltInPipeHandlerInput<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema
      >,
    ) {
      const ctx = this.context().state.get("ctx");

      if (!ctx) {
        throw new Error("Missing HTTP context in pipeline state.");
      }

      return (
        handler as (
          input: BuiltInPipeHandlerInput<
            TPathParamsSchema,
            TQuerySchema,
            TBodySchema
          >,
          ctx: TContext,
        ) => BuiltInPipeHandlerOutput<BuiltInResponsePayload<TResponseSchema>>
      )(input, ctx);
    },
    {
      id: "invoke-handler-with-context",
    },
  );

export const createRequestPipe = <
  TPathParamsSchema extends ValibotSchema | undefined = undefined,
  TQuerySchema extends ValibotSchema | undefined = undefined,
  TBodySchema extends ValibotSchema | undefined = undefined,
  TResponseSchema extends ValibotSchema | undefined = undefined,
  TContext extends CurioHttpContext = CurioHttpContext,
>(
  options: BuiltInPipeOptions<
    TPathParamsSchema,
    TQuerySchema,
    TBodySchema,
    TResponseSchema,
    TContext
  >,
): BuiltInPipe<TContext> => {
  const { handler, requestSchema, responseSchema, schemaAdapter } = options;
  const pipelineState = createSeedHttpContextStep<
    BuiltInPipeState<TPathParamsSchema, TQuerySchema, TBodySchema, TContext>
  >();
  const parsePathParamsStep = requestSchema?.pathParams
    ? createParsePathParamsStep<
      Extract<TPathParamsSchema, ValibotSchema>,
      InferValibotSchema<Extract<TPathParamsSchema, ValibotSchema>>,
      BuiltInPipeState<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema,
        TContext
      >
    >(
      schemaAdapter as SchemaAdapter<
        Extract<TPathParamsSchema, ValibotSchema>
      >,
      requestSchema.pathParams as Extract<TPathParamsSchema, ValibotSchema>,
    )
    : createPassThroughHttpContextStep<
      BuiltInPipeState<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema,
        TContext
      >
    >("skip-path-params");
  const parseQueryStep = requestSchema?.query
    ? createParseQueryStep<
      Extract<TQuerySchema, ValibotSchema>,
      InferValibotSchema<Extract<TQuerySchema, ValibotSchema>>,
      BuiltInPipeState<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema,
        TContext
      >
    >(
      schemaAdapter as SchemaAdapter<Extract<TQuerySchema, ValibotSchema>>,
      requestSchema.query as Extract<TQuerySchema, ValibotSchema>,
    )
    : createPassThroughHttpContextStep<
      BuiltInPipeState<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema,
        TContext
      >
    >("skip-query");
  const parseBodyStep = requestSchema?.body
    ? createParseBodyStep<
      Extract<TBodySchema, ValibotSchema>,
      InferValibotSchema<Extract<TBodySchema, ValibotSchema>>,
      BuiltInPipeState<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema,
        TContext
      >
    >(
      schemaAdapter as SchemaAdapter<Extract<TBodySchema, ValibotSchema>>,
      requestSchema.body as Extract<TBodySchema, ValibotSchema>,
    )
    : createPassThroughHttpContextStep<
      BuiltInPipeState<
        TPathParamsSchema,
        TQuerySchema,
        TBodySchema,
        TContext
      >
    >("skip-body");
  const buildHandlerInputStep = createBuildHandlerInputStep<
    TPathParamsSchema,
    TQuerySchema,
    TBodySchema,
    TContext
  >();
  const invokeHandlerStep = handler.length >= 2
    ? createInvokeHandlerWithContextStep<
      TPathParamsSchema,
      TQuerySchema,
      TBodySchema,
      TResponseSchema,
      TContext
    >(handler)
    : handler;

  const sendResponseStep = createSendResponseStep<
    TPathParamsSchema,
    TQuerySchema,
    TBodySchema,
    TResponseSchema,
    TContext
  >(schemaAdapter, responseSchema);
  const steps = [
    pipelineState,
    parsePathParamsStep,
    parseQueryStep,
    parseBodyStep,
    buildHandlerInputStep,
    invokeHandlerStep, // preserves step handlers while still allowing `(input, ctx)` plain handlers
    sendResponseStep,
  ] as const;

  return pipe.withContext<
    BuiltInPipeState<TPathParamsSchema, TQuerySchema, TBodySchema, TContext>
  >()(steps as never, {
    id: "request-pipeline",
  }) as unknown as BuiltInPipe<TContext>;
};
