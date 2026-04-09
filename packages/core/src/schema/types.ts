/** Successful schema validation result. */
export type SchemaValidationSuccess<TOutput> = {
  /** Validation success discriminator. */
  success: true;
  /** Parsed output value. */
  output: TOutput;
};

/** Failed schema validation result. */
export type SchemaValidationFailure = {
  /** Validation failure discriminator. */
  success: false;
  /** Validation issues returned by the adapter. */
  issues: readonly unknown[];
  /** Optional partially-produced output. */
  output?: unknown;
};

/** Union of successful and failed schema validation outcomes. */
export type SchemaValidationResult<TOutput> =
  | SchemaValidationSuccess<TOutput>
  | SchemaValidationFailure;

/**
 * Minimal runtime schema adapter contract.
 *
 * @typeParam TSchema The native schema type accepted by the adapter.
 */
export interface SchemaAdapter<TSchema = unknown> {
  /**
   * Parses and validates an input value.
   *
   * @param schema The native schema instance.
   * @param input The raw value to validate.
   * @returns The validated and parsed output value.
   *
   * @typeParam TOutput The expected parsed output type.
   */
  parse<TOutput>(schema: TSchema, input: unknown): TOutput;
  /**
   * Parses and validates an input value without throwing.
   *
   * @param schema The native schema instance.
   * @param input The raw value to validate.
   * @returns A success or failure result.
   *
   * @typeParam TOutput The expected parsed output type.
   */
  safeParse<TOutput>(
    schema: TSchema,
    input: unknown,
  ): SchemaValidationResult<TOutput>;
}

/**
 * Error thrown when schema validation fails during adapter-backed parsing.
 *
 * @remarks
 * The error exposes adapter validation issues through `issues` and may also
 * carry a partial `output` when the adapter produced one before failing.
 */
export class SchemaValidationError extends Error {
  /** Validation issues reported by the adapter. */
  readonly issues: readonly unknown[];
  /** Optional partially-produced output. */
  readonly output?: unknown;

  /**
   * @param message Error message.
   * @param issues Validation issues returned by the adapter.
   * @param options Optional partial output or underlying cause.
   */
  constructor(
    message: string,
    issues: readonly unknown[],
    options?: { output?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "SchemaValidationError";
    this.issues = issues;
    this.output = options?.output;
  }
}
