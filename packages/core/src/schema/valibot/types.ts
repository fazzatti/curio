import type { GenericSchema, InferOutput } from "@valibot/valibot";

/** Native Valibot schema type accepted by the built-in schema adapter. */
export type ValibotSchema = GenericSchema<unknown>;

/**
 * Infers the parsed output type from a Valibot schema.
 *
 * @typeParam TSchema The Valibot schema to inspect.
 */
export type InferValibotSchema<TSchema extends ValibotSchema> = InferOutput<
  TSchema
>;
