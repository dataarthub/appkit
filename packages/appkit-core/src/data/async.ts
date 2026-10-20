/**
 * Identifies an elapsed deadline without cancelling the underlying operation.
 * @example
 * ```ts
 * import { OperationTimeoutError } from '@alneas/appkit-core/data/async';
 * const error = new OperationTimeoutError(250);
 * console.log(error.timeout, error.name); // 250, 'OperationTimeoutError'
 * ```
 */
export class OperationTimeoutError extends Error {
  /**
   * Creates an error carrying the caller's deadline in milliseconds.
   * @param timeout - Deadline to record; the constructor does not validate its range.
   * @example
   * ```ts
   * import { OperationTimeoutError } from '@alneas/appkit-core/data/async';
   * throw new OperationTimeoutError(1_000);
   * ```
   */
  constructor(readonly timeout: number) {
    super(`The operation timed out after ${timeout}ms`);
    this.name = 'OperationTimeoutError';
  }
}
/**
 * Races an existing promise against a deadline and clears the timer on every outcome.
 * The promise has already started; timing out does not abort it or undo its effects.
 * @typeParam T - Value resolved by the underlying promise.
 * @param promise - Work whose fulfillment or rejection is forwarded if it wins the race.
 * @param timeout - Timer delay in milliseconds; defaults to 30,000. Zero schedules the next timer opportunity rather than rejecting synchronously.
 * @param errorFactory - Builds the timeout rejection; defaults to OperationTimeoutError. A thrown factory error also becomes the rejection.
 * @returns A promise settling with the first result or deadline failure. Fractional timer delays follow the host timer's behavior.
 * @throws Rejects for non-finite, negative or greater-than-2,147,483,647 delays, the underlying rejection, or the timeout factory's error.
 * @example
 * ```ts
 * import { withTimeout } from '@alneas/appkit-core/data/async';
 * export async function readWithDeadline(request: Promise<string>) {
 *   return withTimeout(request, 1_000);
 * }
 * ```
 */
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
