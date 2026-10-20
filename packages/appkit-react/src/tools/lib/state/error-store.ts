import { create } from 'zustand';
import { AppError, ErrorDisplayMode, ErrorSeverity } from "../error";

/**
 * One error queued for a host renderer with creation time and optional removal delay.
 * @see useErrorStore for usage.
 */
export interface ErrorItem {
  /**
   * Generated error identifier used for removal.
   */
  id: string;
  /**
   * AppError instance retained by reference.
   */
  error: AppError;
  /**
   * Copied presentation hint from the error.
   */
  displayMode: ErrorDisplayMode;
  /**
   * Copied severity from the error.
   */
  severity: ErrorSeverity;
  /**
   * Creation time in milliseconds since Unix epoch.
   */
  timestamp: number;
  /**
   * Optional positive removal delay in milliseconds; omission/nonpositive values do not schedule removal.
   */
  autoDismiss?: number; // ミリ秒 (undefined の場合は自動消去しない)
}

/**
 * Module-shared error list and operations; see useErrorStore.
 */
interface ErrorState {
    /**
   * Errors in insertion order; no count limit is imposed.
   */
  errors: ErrorItem[];

    /**
   * Append an error and optionally schedule its removal.
   * @param error - AppError retained by reference; displayMode/severity are copied.
   * @param options - Optional positive autoDismiss delay in milliseconds.
   * @returns Generated error identifier.
   */
  addError: (error: AppError, options?: {
    /** Positive removal delay in milliseconds; omission disables automatic removal. */
    autoDismiss?: number;
  }) => string;

    /**
   * Remove all entries matching an ID.
   * @param id - Generated error identifier; unknown IDs are ignored.
   * @returns No value after store update.
   */
  removeError: (id: string) => void;

    /**
   * Remove every currently queued error.
   * @returns No value; previously scheduled timers are not cancelled.
   */
  clearErrors: () => void;

    /**
   * Filter the current list by display mode.
   * @param mode - Desired presentation hint.
   * @returns New array of matching entries, possibly empty.
   */
  getErrorsByMode: (mode: ErrorDisplayMode) => ErrorItem[];
}

let errorIdCounter = 0;
const generateErrorId = () => `error-${Date.now()}-${++errorIdCounter}`;

/**
 * Subscribes to the module-shared error queue and its add/remove/filter operations.
 * @param selector - Optional Zustand selector; omission returns the whole error state.
 * @returns Selected reactive state; getState/setState/subscribe are supplied by Zustand.
 * @remarks No provider or CSS is required; the host must render errors. State is shared
 * within the module, including SSR imports, and is not persisted. Auto-dismiss timers
 * survive clearing entries and are not tied to component lifecycle.
 * @example
 * ```tsx
 * import { useErrorStore } from '@alneas/appkit-react/tools/core';
 * export function ErrorCount() { return <output>{useErrorStore(state => state.errors.length)}</output>; }
 * ```
 */
export const useErrorStore = create<ErrorState>((set, get) => ({
  errors: [],

  addError: (error, options) => {
    const id = generateErrorId();
    const item: ErrorItem = {
      id,
      error,
      displayMode: error.displayMode,
      severity: error.severity,
      timestamp: Date.now(),
      autoDismiss: options?.autoDismiss,
    };

    set((state) => ({
      errors: [...state.errors, item],
    }));

    // 自動消去が指定されている場合
    if (options?.autoDismiss && options.autoDismiss > 0) {
      setTimeout(() => {
        get().removeError(id);
      }, options.autoDismiss);
    }

    return id;
  },

  removeError: (id) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    }));
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  getErrorsByMode: (mode) => {
    return get().errors.filter((e) => e.displayMode === mode);
  },
}));
