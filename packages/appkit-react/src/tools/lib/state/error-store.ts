import { create } from 'zustand';
import { AppError, ErrorDisplayMode, ErrorSeverity } from "../error";

/** エラー項目のインターフェース */
export interface ErrorItem {
  id: string;
  error: AppError;
  displayMode: ErrorDisplayMode;
  severity: ErrorSeverity;
  timestamp: number;
  autoDismiss?: number; // ミリ秒 (undefined の場合は自動消去しない)
}

interface ErrorState {
  /** 現在のエラーリスト */
  errors: ErrorItem[];

  /**
   * エラーを追加
   * @param error - AppError インスタンス
   * @param options - 追加オプション (autoDismiss: 自動消去までのミリ秒)
   * @returns エラー ID
   */
  addError: (error: AppError, options?: { autoDismiss?: number }) => string;

  /** 特定のエラーを削除 */
  removeError: (id: string) => void;

  /** すべてのエラーをクリア */
  clearErrors: () => void;

  /** 特定の表示モードのエラーを取得 */
  getErrorsByMode: (mode: ErrorDisplayMode) => ErrorItem[];
}

let errorIdCounter = 0;
const generateErrorId = () => `error-${Date.now()}-${++errorIdCounter}`;

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
