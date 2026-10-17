/** Deadline failure; the underlying operation is not cancelled. */
export class OperationTimeoutError extends Error {
  constructor(readonly timeout: number) {
    super(`The operation timed out after ${timeout}ms`);
    this.name = 'OperationTimeoutError';
  }
}
/** Race a promise against a deadline, clearing the timer on every outcome. Does not abort work. */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout = 30_000,
  errorFactory: (timeout: number) => Error = (ms) => new OperationTimeoutError(ms),
): Promise<T> {
  if (!Number.isFinite(timeout) || timeout < 0 || timeout > 2_147_483_647)
    throw new Error('Timeout must be a finite number between 0 and 2147483647ms.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          try {
            reject(errorFactory(timeout));
          } catch (error) {
            reject(error);
          }
        }, timeout);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
