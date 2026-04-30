type MaybePromise<T> = T | Promise<T>;

/**
 * Memoizes a zero-argument factory so all callers share the same in-flight or
 * resolved value until a rejection occurs.
 *
 * @param factory The zero-argument factory to run once.
 * @returns A callable that reuses the same result across repeated calls.
 *
 * @remarks
 * Rejected executions clear the cached promise so callers may retry.
 */
export const once = <T>(
  factory: () => MaybePromise<T>,
): () => Promise<T> => {
  let cachedValue: Promise<T> | undefined;

  return (): Promise<T> => {
    if (!cachedValue) {
      cachedValue = Promise.resolve()
        .then(factory)
        .catch((error) => {
          cachedValue = undefined;
          throw error;
        });
    }

    return cachedValue;
  };
};
