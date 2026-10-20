import { useCallback } from 'react';
import * as m from '../../paraglide/messages.js';
import { AppError, ErrorDisplayMode } from "../error";
import { useErrorStore } from "../state/error-store";

/**
 * Default normalization and queued-error lifetime settings.
 * @see useError for usage.
 */
export interface UseErrorOptions {
    /**
   * Default hint for newly wrapped errors; omission uses notification. Existing AppError values retain their own mode.
   */
  defaultDisplayMode?: ErrorDisplayMode;
    /**
   * Default positive removal delay in milliseconds; omission leaves errors queued.
   */
  defaultAutoDismiss?: number;
}

/**
 * Per-call display/lifetime overrides for queued errors.
 * @see useError for usage.
 */
export interface ShowErrorOptions {
    /**
   * Per-call hint for newly wrapped errors; does not override an existing AppError instance.
   */
  displayMode?: ErrorDisplayMode;
    /**
   * Per-call removal delay in milliseconds, overriding the default when non-nullish; positive values schedule removal.
   */
  autoDismiss?: number;
}

/**
 * Normalizes unknown errors and manages their entries in the shared error queue.
 * @param options - Optional default display hint and auto-dismiss delay.
 * @returns Queue, display/filter/message helpers and individual/all removal controls.
 * @remarks Requires React; no provider or CSS is needed by the hook. A host renderer must
 * display queued errors. Existing AppError values retain their mode even when a display
 * option is supplied. Code localization replaces slash/dot with underscores; unsupported
 * message keys fall back to the code. State/timers belong to the module, not this hook.
 * @example
 * ```tsx
 * import { useError } from '@alneas/appkit-react/tools/core';
 * export function Report({ failure }: { failure: unknown }) { const { showError } = useError(); return <button onClick={() => showError(failure)}>Report</button>; }
 * ```
 */
export function useError(options?: UseErrorOptions) {
  const { addError, removeError, clearErrors, errors, getErrorsByMode } = useErrorStore();

  /**
 * Normalize and enqueue an unknown error.
 * @param error - AppError, Error or arbitrary thrown value.
 * @param showOptions - Optional display hint and removal delay.
 * @returns Generated error ID.
 * @example
 * ```tsx
 * import { useError } from '@alneas/appkit-react/tools/core';
 * export function Controls() { const errors = useError(); return <button onClick={() => errors.showError(new Error('Unavailable'))}>Error action</button>; }
 * ```
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
 * Enqueue a new AppError using a localized code lookup.
 * @param code - Host error code; unknown codes are displayed unchanged.
 * @param showOptions - Optional display hint and removal delay.
 * @returns Generated error ID.
 * @example
 * ```tsx
 * import { useError } from '@alneas/appkit-react/tools/core';
 * export function Controls() { const errors = useError(); return <button onClick={() => errors.showErrorByCode('error/example')}>Error action</button>; }
 * ```
 */
  const showErrorByCode = useCallback(
    (code: string, showOptions?: ShowErrorOptions & {
      /** Per-call display hint, defaulting to hook settings then notification. */
      displayMode?: ErrorDisplayMode;
    }): string => {
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
 * Resolve the current localized error message without queuing it.
 * @param code - Error code mapped by replacing slash/dot with underscores.
 * @returns Localized message or the original code when no message function exists.
 * @example
 * ```tsx
 * import { useError } from '@alneas/appkit-react/tools/core';
 * export function Controls() { const errors = useError(); return <button onClick={() => console.log(errors.getErrorMessage('error/example'))}>Error action</button>; }
 * ```
 */
  const getErrorMessage = useCallback((code: string): string => {
    const i18nKey = `errors_${code.replace(/[/.]/g, '_')}`;
    const messageFunc = (m as unknown as Record<string, () => string>)[i18nKey];
    return typeof messageFunc === 'function' ? messageFunc() : code;
  }, []);

  /**
 * Remove one error from the queue.
 * @param id - Generated error ID; unknown IDs are ignored.
 * @returns No value after removal.
 * @example
 * ```tsx
 * import { useError } from '@alneas/appkit-react/tools/core';
 * export function Controls() { const errors = useError(); return <button onClick={() => errors.clearError('host-selected-id')}>Error action</button>; }
 * ```
 */
  const clearError = useCallback(
    (id: string) => {
      removeError(id);
    },
    [removeError],
  );

  /**
 * Remove all currently queued errors.
 * @returns No value; scheduled timers remain harmlessly pending.
 * @example
 * ```tsx
 * import { useError } from '@alneas/appkit-react/tools/core';
 * export function Controls() { const errors = useError(); return <button onClick={() => errors.clearAll()}>Error action</button>; }
 * ```
 */
  const clearAll = useCallback(() => {
    clearErrors();
  }, [clearErrors]);

  return {
/**
 * Normalize and queue errors; see the local showError declaration for argument/result details.
 */
    showError,
/**
 * Queue a localized code; see the local showErrorByCode declaration.
 */
    showErrorByCode,
/**
 * Look up localized text; see the local getErrorMessage declaration.
 */
    getErrorMessage,
/**
 * Remove an error by ID; see the local clearError declaration.
 */
    clearError,
/**
 * Clear queued errors; see the local clearAll declaration.
 */
    clearAll,
/**
 * Current errors in insertion order.
 */
    errors,
/**
 * Current store filter operation; see ErrorState.getErrorsByMode.
 */
    getErrorsByMode,
  };
}
