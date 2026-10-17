import * as m from '../../paraglide/messages';

/**
 * エラー表示モード
 * - inline: フォーム内のフィールド近くに表示
 * - notification: 画面上部のバナー通知
 * - dialog: モーダルダイアログ
 * - page: 全画面エラーページ
 */
export type ErrorDisplayMode = 'inline' | 'notification' | 'dialog' | 'page';

/**
 * エラーの重要度
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * AppError: アプリケーション全体で使用するエラークラス
 *
 * @example
 * ```typescript
 * // 基本的な使用法
 * throw new AppError('auth/user-not-found', 'User not found');
 *
 * // 表示モード指定
 * throw new AppError('network/timeout', 'Request timed out', {
 *   displayMode: 'notification',
 *   severity: 'warning'
 * });
 *
 * // メタデータ付き
 * throw new AppError('validation/invalid-field', 'Invalid input', {
 *   displayMode: 'inline',
 *   metadata: { field: 'email' }
 * });
 * ```
 */
export class AppError extends Error {
  /** エラーコード。i18n のキーとしても使用 (例: 'auth/user-not-found') */
  readonly code: string;

  /** 推奨される表示モード */
  readonly displayMode: ErrorDisplayMode;

  /** エラーの重要度 */
  readonly severity: ErrorSeverity;

  /** 追加のメタデータ (フィールド名、HTTP ステータスなど) */
  readonly metadata?: Record<string, unknown>;

  /** 元のエラー (ラップする場合) */
  readonly originalError?: Error;

  /**
   * AppError の新しいインスタンスを生成します。
   * @param code エラーコード
   * @param message エラーメッセージ
   * @param options 追加オプション
   */
  constructor(
    code: string,
    message: string,
    options?: {
      displayMode?: ErrorDisplayMode;
      severity?: ErrorSeverity;
      metadata?: Record<string, unknown>;
      originalError?: Error;
    },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.displayMode = options?.displayMode ?? 'notification';
    this.severity = options?.severity ?? 'error';
    this.metadata = options?.metadata;
    this.originalError = options?.originalError;

    // Error の prototype chain を正しく設定
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * 任意のエラーを AppError に変換します。
   * Firebase, Supabase 等のエラーを自動的にコードマッピングします。
   */
  static from(error: unknown, defaultDisplayMode: ErrorDisplayMode = 'notification'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Firebase Auth Error
      if ('code' in error && typeof (error as { code: unknown }).code === 'string') {
        const code = (error as { code: string }).code;
        let message = error.message;

        switch (code) {
          case 'auth/invalid-email':
            message = m.errors_auth_invalid_email();
            break;
          case 'auth/wrong-password':
            message = m.errors_auth_wrong_password();
            break;
          case 'auth/user-not-found':
            message = m.errors_auth_user_not_found();
            break;
          case 'auth/user-disabled':
            message = m.errors_auth_user_disabled();
            break;
          case 'auth/too-many-requests':
            message = m.errors_auth_too_many_requests();
            break;
          case 'auth/operation-not-allowed':
            message = m.errors_auth_operation_not_allowed();
            break;
          case 'auth/email-already-in-use':
            message = m.errors_auth_email_already_in_use();
            break;
          case 'auth/requires-recent-login':
            message = m.errors_auth_requires_recent_login();
            break;
          case 'auth/credential-already-in-use':
            message = m.errors_auth_account_exists_with_different_credential();
            break;
          case 'auth/weak-password':
            message = m.errors_auth_weak_password();
            break;
          case 'auth/network-request-failed':
            message = m.errors_auth_network_request_failed();
            break;
        }

        return new AppError(code, message, {
          displayMode: defaultDisplayMode,
          originalError: error,
        });
      }

      // Supabase/PostgreSQL Error
      // Supabase errors often have 'code' and 'message'.
      // We can also look for specific strings in the message if the code is generic.
      if ('code' in error || 'message' in error) {
        const errorRecord = error as { code?: unknown; message?: unknown };
        const msg = typeof errorRecord.message === 'string' ? errorRecord.message : '';

        // Supabase generic error message mapping
        if (msg.includes('Invalid login credentials')) {
          return new AppError(
            'bg-auth/invalid-credentials',
            m.errors_supabase_invalid_credentials(),
            { displayMode: defaultDisplayMode, originalError: error },
          );
        }
        if (msg.includes('Email not confirmed')) {
          return new AppError(
            'bg-auth/email-not-confirmed',
            m.errors_supabase_email_not_confirmed(),
            { displayMode: defaultDisplayMode, originalError: error },
          );
        }
      }

      // Generic Error
      return new AppError('error/unknown', error.message, {
        displayMode: defaultDisplayMode,
        originalError: error,
      });
    }

    // Unknown type
    return new AppError('error/unknown', String(error), {
      displayMode: defaultDisplayMode,
    });
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `[${this.code}] ${this.message}`;
  }

  /**
   * JSON シリアライズ用
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      displayMode: this.displayMode,
      severity: this.severity,
      metadata: this.metadata,
    };
  }
}

/**
 * ネットワークタイムアウトエラー
 */
export class TimeoutError extends AppError {
  /**
   * TimeoutError の新しいインスタンスを生成します。
   * @param message エラーメッセージ
   * @param duration タイムアウトした時間（ミリ秒）
   */
  constructor(message = 'The operation timed out', duration?: number) {
    super('error/timeout', message, {
      displayMode: 'notification',
      severity: 'warning',
      metadata: { duration },
    });
    this.name = 'TimeoutError';
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends AppError {
  /**
   * NetworkError の新しいインスタンスを生成します。
   * @param message エラーメッセージ
   */
  constructor(message = 'Network error occurred') {
    super('error/network', message, {
      displayMode: 'notification',
      severity: 'error',
    });
    this.name = 'NetworkError';
  }
}

/**
 * 認証不足エラー
 */
export class UnauthorizedError extends AppError {
  /**
   * UnauthorizedError の新しいインスタンスを生成します。
   * @param message エラーメッセージ
   */
  constructor(message = 'You are not authorized to perform this action') {
    super('error/unauthorized', message, {
      displayMode: 'dialog',
      severity: 'error',
    });
    this.name = 'UnauthorizedError';
  }
}

/**
 * リソースが見つからないエラー
 */
export class NotFoundError extends AppError {
  /**
   * NotFoundError の新しいインスタンスを生成します。
   * @param message エラーメッセージ
   * @param resource 見つからなかったリソース名
   */
  constructor(message = 'The requested resource was not found', resource?: string) {
    super('error/not-found', message, {
      displayMode: 'page',
      severity: 'error',
      metadata: { resource },
    });
    this.name = 'NotFoundError';
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  /**
   * ValidationError の新しいインスタンスを生成します。
   * @param message エラーメッセージ
   * @param fields フィールドごとのエラーマッピング
   */
  constructor(message: string, fields?: Record<string, string>) {
    super('error/validation', message, {
      displayMode: 'inline',
      severity: 'warning',
      metadata: { fields },
    });
    this.name = 'ValidationError';
  }
}
