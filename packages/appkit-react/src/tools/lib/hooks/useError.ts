import { useCallback } from 'react';
import * as m from '../../paraglide/messages.js';
import { AppError, ErrorDisplayMode } from "../error";
import { useErrorStore } from "../state/error-store";

export interface UseErrorOptions {
  /** デフォルトの表示モード */
  defaultDisplayMode?: ErrorDisplayMode;
  /** デフォルトの自動消去時間 (ミリ秒)。undefined で自動消去しない */
  defaultAutoDismiss?: number;
}

export interface ShowErrorOptions {
  /** 表示モードを上書き */
  displayMode?: ErrorDisplayMode;
  /** 自動消去時間 (ミリ秒) */
  autoDismiss?: number;
}

/**
 * エラー表示を管理するフック
 *
 * @example
 * ```tsx
 * const { showError, showErrorByCode, clearError, clearAll } = useError();
 *
 * // AppError を表示
 * showError(new AppError('auth/user-not-found', 'Not found'));
 *
 * // エラーコードから表示
 * showErrorByCode('auth/wrong-password');
 *
 * // 任意のエラーを表示 (自動変換)
 * showError(unknownError);
 * ```
 */
export function useError(options?: UseErrorOptions) {
  const { addError, removeError, clearErrors, errors, getErrorsByMode } = useErrorStore();

  /**
   * エラーを表示
   * @param error - エラーオブジェクト (AppError または任意の Error)
   * @param showOptions - 追加オプション
   * @returns エラー ID
   */
  const showError = useCallback(
    (error: unknown, showOptions?: ShowErrorOptions): string => {
      const appError = AppError.from(
        error,
        showOptions?.displayMode ?? options?.defaultDisplayMode,
      );

      return addError(appError, {
        autoDismiss: showOptions?.autoDismiss ?? options?.defaultAutoDismiss,
      });
    },
    [addError, options?.defaultDisplayMode, options?.defaultAutoDismiss],
  );

  /**
   * エラーコードから i18n メッセージを取得して表示
   * @param code - エラーコード (例: 'auth/user-not-found')
   * @param showOptions - 追加オプション
   * @returns エラー ID
   */
  const showErrorByCode = useCallback(
    (code: string, showOptions?: ShowErrorOptions & { displayMode?: ErrorDisplayMode }): string => {
      // i18n からメッセージを取得 (見つからなければコードをそのまま使用)
      // code format example: "auth/user-not-found" -> "errors_auth_user_not_found"
      const i18nKey = `errors_${code.replace(/[/.]/g, '_')}`;
      const messageFunc = (m as unknown as Record<string, () => string>)[i18nKey];
      const message = typeof messageFunc === 'function' ? messageFunc() : code;

      const appError = new AppError(code, message, {
        displayMode: showOptions?.displayMode ?? options?.defaultDisplayMode ?? 'notification',
      });

      return addError(appError, {
        autoDismiss: showOptions?.autoDismiss ?? options?.defaultAutoDismiss,
      });
    },
    [addError, options?.defaultDisplayMode, options?.defaultAutoDismiss],
  );

  /**
   * i18n からエラーメッセージを取得
   * (表示せずにメッセージだけ取得したい場合)
   */
  const getErrorMessage = useCallback((code: string): string => {
    const i18nKey = `errors_${code.replace(/[/.]/g, '_')}`;
    const messageFunc = (m as unknown as Record<string, () => string>)[i18nKey];
    return typeof messageFunc === 'function' ? messageFunc() : code;
  }, []);

  /**
   * 特定のエラーを消去
   */
  const clearError = useCallback(
    (id: string) => {
      removeError(id);
    },
    [removeError],
  );

  /**
   * すべてのエラーを消去
   */
  const clearAll = useCallback(() => {
    clearErrors();
  }, [clearErrors]);

  return {
    showError,
    showErrorByCode,
    getErrorMessage,
    clearError,
    clearAll,
    errors,
    getErrorsByMode,
  };
}
