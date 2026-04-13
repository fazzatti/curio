import { safeParse } from "@valibot/valibot";
import {
  type SchemaAdapter,
  SchemaValidationError,
  type SchemaValidationResult,
} from "@/schema/types.ts";
import type { ValibotSchema } from "@/schema/valibot/types.ts";

export type {
  InferValibotSchema,
  ValibotSchema,
} from "@/schema/valibot/types.ts";

/**
 * Valibot implementation of the Curio schema adapter contract.
 *
 * @remarks
 * Built-in helpers use this adapter by default. `parse(...)` throws
 * `SchemaValidationError` on validation failure, while `safeParse(...)`
 * returns a failure result with adapter issues.
 */
export const valibotSchemaAdapter: SchemaAdapter<ValibotSchema> = {
  parse<TOutput>(schema: ValibotSchema, input: unknown): TOutput {
    const result = safeParse(schema, input);

    if (result.success) {
      return result.output as TOutput;
    }

    throw new SchemaValidationError(
      "Schema validation failed.",
      result.issues,
      {
        output: result.output,
      },
    );
  },
  safeParse<TOutput>(
    schema: ValibotSchema,
    input: unknown,
  ): SchemaValidationResult<TOutput> {
    const result = safeParse(schema, input);

    if (result.success) {
      return {
        success: true,
        output: result.output as TOutput,
      };
    }

    return {
      success: false,
      issues: result.issues,
      output: result.output,
    };
  },
};
