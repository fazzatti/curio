import { step, type StepThis } from "@convee";
import type { CurioHttpContext } from "@/http/types.ts";
import type { SchemaAdapter } from "@/schema/types.ts";
import type { HttpPipelineState } from "@/steps/parse-request/types.ts";

export type { HttpPipelineState } from "@/steps/parse-request/types.ts";

/**
 * Converts raw `URLSearchParams` into a plain string map.
 *
 * @param searchParams Raw URL search parameters.
 * @returns A plain object with one string value per query key.
 *
 * @remarks
 * This is used before schema parsing so adapters receive a plain object instead
 * of `URLSearchParams`.
 */
export const searchParamsToObject = (
  searchParams: URLSearchParams,
): Record<string, string> => {
  return Object.fromEntries(searchParams.entries());
};

/**
 * Creates the first built-in HTTP step that seeds the Curio HTTP context into
 * Convee run context.
 *
 * @returns A step that stores `ctx` in run context and passes it through.
 *
 * @remarks
 * This step is intended to run first so later parsing and response steps can
 * read the current Curio HTTP context from shared run state.
 *
 * @typeParam TShared The shared run-context shape.
 */
export const createSeedHttpContextStep = <
  TShared extends HttpPipelineState = HttpPipelineState,
>() =>
  step.withContext<TShared>()(
    function (this: StepThis<TShared>, ctx: CurioHttpContext) {
      this.context().state.set("ctx", ctx as TShared["ctx"]);
      return ctx;
    },
    {
      id: "seed-http-context",
    },
  );

/**
 * Creates a no-op context pass-through step.
 *
 * This is used to keep the built-in pipeline shape stable when a particular
 * request part has no schema and therefore no parsing step is needed.
 *
 * @param id Step id used by Convee.
 * @returns A step that returns the incoming Curio HTTP context unchanged.
 *
 * @remarks
 * This keeps the setup portion of the pipeline structurally stable without
 * introducing extra wrapper payloads.
 *
 * @typeParam TShared The shared run-context shape.
 */
export const createPassThroughHttpContextStep = <
  TShared extends HttpPipelineState = HttpPipelineState,
>(
  id: string,
) =>
  step.withContext<TShared>()(
    function (_ctx: CurioHttpContext) {
      return _ctx;
    },
    {
      id,
    },
  );

/**
 * Creates a path-params parsing step.
 *
 * @param schemaAdapter Schema adapter used to parse the raw string params.
 * @param schema Native schema used for parsing.
 * @returns A step that stores parsed path params in run context and passes `ctx` through.
 *
 * @remarks
 * The raw `ctx.request.params` values remain unchanged. Parsed values are
 * written to Convee run context instead.
 *
 * @throws SchemaValidationError
 * Thrown when the adapter rejects the raw path params.
 *
 * @typeParam TSchema The native schema type accepted by the adapter.
 * @typeParam TParsedPathParams The parsed path params output type.
 * @typeParam TShared The shared run-context shape.
 */
export const createParsePathParamsStep = <
  TSchema,
  TParsedPathParams,
  TShared extends HttpPipelineState<TParsedPathParams> = HttpPipelineState<
    TParsedPathParams
  >,
>(
  schemaAdapter: SchemaAdapter<TSchema>,
  schema: TSchema,
) =>
  step.withContext<TShared>()(
    function (this: StepThis<TShared>, ctx: CurioHttpContext) {
      const pathParams = schemaAdapter.parse<TParsedPathParams>(
        schema,
        ctx.request.params,
      );

      this.context().state.set(
        "pathParams",
        pathParams as TShared["pathParams"],
      );

      return ctx;
    },
    {
      id: "parse-path-params",
    },
  );

/**
 * Creates a query parsing step.
 *
 * @param schemaAdapter Schema adapter used to parse the raw query object.
 * @param schema Native schema used for parsing.
 * @returns A step that stores parsed query values in run context and passes `ctx` through.
 *
 * @remarks
 * The raw `ctx.request.query` values remain unchanged. Parsed values are
 * written to Convee run context instead.
 *
 * @throws SchemaValidationError
 * Thrown when the adapter rejects the raw query values.
 *
 * @typeParam TSchema The native schema type accepted by the adapter.
 * @typeParam TParsedQuery The parsed query output type.
 * @typeParam TShared The shared run-context shape.
 */
export const createParseQueryStep = <
  TSchema,
  TParsedQuery,
  TShared extends HttpPipelineState<unknown, TParsedQuery> = HttpPipelineState<
    unknown,
    TParsedQuery
  >,
>(
  schemaAdapter: SchemaAdapter<TSchema>,
  schema: TSchema,
) =>
  step.withContext<TShared>()(
    function (this: StepThis<TShared>, ctx: CurioHttpContext) {
      const query = schemaAdapter.parse<TParsedQuery>(
        schema,
        searchParamsToObject(ctx.request.query),
      );

      this.context().state.set("query", query as TShared["query"]);

      return ctx;
    },
    {
      id: "parse-query",
    },
  );

/**
 * Creates a body parsing step.
 *
 * @param schemaAdapter Schema adapter used to parse the raw request body.
 * @param schema Native schema used for parsing.
 * @returns A step that stores parsed body values in run context and passes `ctx` through.
 *
 * @remarks
 * The raw `ctx.request.body()` result remains outside the Curio HTTP context.
 * Parsed values are written to Convee run context instead.
 *
 * @throws SchemaValidationError
 * Thrown when the adapter rejects the raw request body.
 *
 * @typeParam TSchema The native schema type accepted by the adapter.
 * @typeParam TParsedBody The parsed body output type.
 * @typeParam TShared The shared run-context shape.
 */
export const createParseBodyStep = <
  TSchema,
  TParsedBody,
  TShared extends HttpPipelineState<unknown, unknown, TParsedBody> =
    HttpPipelineState<unknown, unknown, TParsedBody>,
>(
  schemaAdapter: SchemaAdapter<TSchema>,
  schema: TSchema,
) =>
  step.withContext<TShared>()(
    async function (this: StepThis<TShared>, ctx: CurioHttpContext) {
      const body = schemaAdapter.parse<TParsedBody>(
        schema,
        await ctx.request.body(),
      );

      this.context().state.set("body", body as TShared["body"]);

      return ctx;
    },
    {
      id: "parse-body",
    },
  );
