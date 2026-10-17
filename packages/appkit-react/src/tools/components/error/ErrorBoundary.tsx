import React, { Component, ReactNode } from 'react';
import { AppError } from "../../lib/error";
import { ErrorPage } from './ErrorPage';

export interface ErrorBoundaryProps {
  /** 子要素 */
  children: ReactNode;
  /** カスタムフォールバック UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** エラー発生時のコールバック */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 「戻る」ボタンのコールバック */
  onBack?: () => void;
  /** 「ホームへ」ボタンのコールバック */
  onHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary
 * 子コンポーネントのレンダリングエラーをキャッチして、
 * エラーページまたはカスタムフォールバックを表示します。
 *
 * @example
 * ```tsx
 * // 基本
 * <ErrorBoundary onBack={() => navigate(-1)} onHome={() => navigate('/')}>
 *     <MyComponent />
 * </ErrorBoundary>
 *
 * // カスタムフォールバック
 * <ErrorBoundary
 *     fallback={(error, reset) => (
 *         <div>
 *             <p>Error: {error.message}</p>
 *             <button onClick={reset}>Reset</button>
 *         </div>
 *     )}
 * >
 *     <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * ErrorBoundary のインスタンスを生成し、初期状態を設定します。
   * @param props ErrorBoundary のプロパティ
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * 子コンポーネントでエラーがスローされた際に呼び出され、エラー状態を state に反映します。
   * @param error スローされたエラー
   * @returns 更新された state オブジェクト
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * エラーがキャッチされた後に実行され、エラーログの出力や外部サービスへの通知等を行います。
   * @param error キャッチされたエラー
   * @param errorInfo React のエラー情報（コンポーネントスタックなど）
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  /**
   * コンポーネントをレンダリングします。エラー発生時はフォールバック UI を表示します。
   * @returns レンダリングする React 要素
   */
  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, onBack, onHome } = this.props;

    if (hasError && error) {
      // カスタムフォールバックがある場合
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.handleReset);
        }
        return fallback;
      }

      // デフォルトの ErrorPage を表示
      const appError = AppError.from(error, 'page');
      return <ErrorPage error={appError} onBack={onBack} onHome={onHome} />;
    }

    return children;
  }
}
