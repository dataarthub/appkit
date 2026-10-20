import { useState, useCallback, useRef, useEffect } from 'react';
import { AppError, TimeoutError, ErrorDisplayMode } from "../error";
import { useError } from './useError';

/** Default timeout delay in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT = 30000;

/**
 * Host asynchronous operation and timeout/presentation settings.
 * @typeParam T - Operation result shape.
 * @see useAsyncWithTimeout for usage.
 */
export interface UseAsyncWithTimeoutOptions<T> {
    /**
   * Host operation invoked with no abort signal.
   * @returns Promise resolving the operation result; rejection is normalized by execute.
   */
  fn: () => Promise<T>;
    /**
   * Timeout in milliseconds; defaults to 30000. Does not cancel underlying work.
   */
  timeout?: number;
    /**
   * Display hint for newly wrapped errors; defaults to notification.
   */
  errorDisplayMode?: ErrorDisplayMode;
    /**
   * Add normalized failure to the shared error store; defaults to true.
   */
  showErrorOnFailure?: boolean;
    /**
   * Optional synchronous callback after a mounted success; errors are handled as execution failures.
   * @param data - Resolved operation result.
   * @returns No value.
   */
  onSuccess?: (data: T) => void;
    /**
   * Optional synchronous callback after mounted failure normalization/presentation.
   * @param error - Normalized AppError.
   * @returns No value; thrown callback errors reject execute.
   */
  onError?: (error: AppError) => void;
}

/**
 * Last result/status with explicit execute/reset controls.
 * @typeParam T - Host operation result shape.
 * @see useAsyncWithTimeout for usage.
 */
export interface UseAsyncWithTimeoutReturn<T> {
    /**
   * Race a new host operation against a timeout.
   * @returns Host result on success, or undefined on handled failure/unmounted rejection.
   * @throws Errors from onError/error-presentation callbacks may reject.
   */
  execute: () => Promise<T | undefined>;
    /**
   * Whether execute last set pending state; overlapping completions can overwrite this flag.
   */
  isLoading: boolean;
    /**
   * Most recent mounted execution failure or null.
   */
  error: AppError | null;
    /**
   * Last mounted success, initially undefined; errors do not clear prior data.
   */
  data: T | undefined;
    /**
   * Clear displayed loading/error/data state.
   * @returns No value; in-flight host work can still finish and update state on this mount.
   */
  reset: () => void;
}

/**
 * Runs explicit asynchronous work against a display timeout and tracks the last completion.
 * @typeParam T - Host operation result shape.
 * @param options - Host operation, timeout, presentation settings and synchronous outcome callbacks.
 * @returns Execute/reset controls and displayed loading, result and normalized error state.
 * @remarks Requires React and the shared error store; no context or styles are required by
 * the hook. The internal AbortController is never passed to fn: new executes, reset and
 * unmount do not cancel host work. Unmount suppresses state/callback updates; overlapping
 * operations on one mount can complete out of order. Timeout timers are not cleared on
 * settlement. onSuccess errors enter failure handling; onError errors may reject execute.
 * To display errors, mount a host renderer for useError's shared store.
 * @example
 * ```tsx
 * import { useAsyncWithTimeout } from '@alneas/appkit-react/tools/core';
 * export function Load({ load }: { load: () => Promise<string> }) {
 *   const task = useAsyncWithTimeout({ fn: load, timeout: 10000 });
 *   return <button disabled={task.isLoading} onClick={() => { void task.execute(); }}>{task.data ?? 'Load'}</button>;
 * }
 * ```
 */
export function useAsyncWithTimeout<T>(
  options: UseAsyncWithTimeoutOptions<T>,
): UseAsyncWithTimeoutReturn<T> {
  const {
    fn,
    timeout = DEFAULT_TIMEOUT,
    errorDisplayMode = 'notification',
    showErrorOnFailure = true,
    onSuccess,
    onError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [data, setData] = useState<T | undefined>(undefined);

  const { showError } = useError();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async (): Promise<T | undefined> => {
    // 既存のリクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    // タイムアウト用のPromise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError('The operation timed out', timeout));
      }, timeout);
    });

    try {
      // fetchとtimeoutのレース
      const result = await Promise.race([fn(), timeoutPromise]);

      if (isMountedRef.current) {
        setData(result);
        setIsLoading(false);
        onSuccess?.(result);
      }

      return result;
    } catch (err) {
      if (!isMountedRef.current) return undefined;

      const appError = AppError.from(err, errorDisplayMode);
      setError(appError);
      setIsLoading(false);

      if (showErrorOnFailure) {
        showError(appError);
      }

      onError?.(appError);
      return undefined;
    }
  }, [fn, timeout, errorDisplayMode, showErrorOnFailure, showError, onSuccess, onError]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(undefined);
    abortControllerRef.current?.abort();
  }, []);

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
}

/**
 * Races an existing promise against a timeout rejection without cancelling either task.
 * @typeParam T - Promise result shape.
 * @param promise - Already-started host operation.
 * @param timeout - Delay in milliseconds before TimeoutError rejection; defaults to 30000.
 * @returns Original result if it wins the race.
 * @throws Rejects with the original rejection or TimeoutError, whichever settles first.
 * @remarks No React context is required. The timer is not cleared when the host promise
 * settles; timeout does not abort the operation or roll back its effects.
 * @example
 * ```ts
 * import { withTimeout } from '@alneas/appkit-react/tools/core';
 * export function limited<T>(operation: Promise<T>) { return withTimeout(operation, 5000); }
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError('The operation timed out', timeout));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]);
}
