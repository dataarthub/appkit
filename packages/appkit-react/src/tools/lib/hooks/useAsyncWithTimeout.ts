import { useState, useCallback, useRef, useEffect } from 'react';
import { AppError, TimeoutError, ErrorDisplayMode } from "../error";
import { useError } from './useError';

/** デフォルトのタイムアウト時間 (30秒) */
const DEFAULT_TIMEOUT = 30000;

export interface UseAsyncWithTimeoutOptions<T> {
  /** 実行する非同期関数 */
  fn: () => Promise<T>;
  /** タイムアウト時間 (ミリ秒)。デフォルト: 30000 */
  timeout?: number;
  /** エラー発生時の表示モード */
  errorDisplayMode?: ErrorDisplayMode;
  /** エラー発生時に自動で表示するか。デフォルト: true */
  showErrorOnFailure?: boolean;
  /** 成功時のコールバック */
  onSuccess?: (data: T) => void;
  /** エラー時のコールバック */
  onError?: (error: AppError) => void;
}

export interface UseAsyncWithTimeoutReturn<T> {
  /** 非同期処理を実行 */
  execute: () => Promise<T | undefined>;
  /** 現在読み込み中か */
  isLoading: boolean;
  /** 最後に発生したエラー */
  error: AppError | null;
  /** 成功したデータ */
  data: T | undefined;
  /** エラー状態をリセット */
  reset: () => void;
}

/**
 * タイムアウト付き非同期処理フック
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error, data } = useAsyncWithTimeout({
 *     fn: async () => await api.fetchData(),
 *     timeout: 10000, // 10秒
 *     errorDisplayMode: 'notification',
 *     onSuccess: (data) => console.log('Success:', data),
 * });
 *
 * // ボタンクリックで実行
 * <button onClick={execute} disabled={isLoading}>
 *     {isLoading ? 'Loading...' : 'Fetch Data'}
 * </button>
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
 * タイムアウト付きで Promise を実行するユーティリティ関数
 * (フック外で使用する場合)
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
