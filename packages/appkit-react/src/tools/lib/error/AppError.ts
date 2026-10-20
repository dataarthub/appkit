import * as m from '../../paraglide/messages';

/**
 * Requested error presentation: inline field feedback, notification banner, modal dialog or full page.
 * @remarks This is metadata; a host renderer must display the error.
 * @see AppError for creation.
 */
export type ErrorDisplayMode = 'inline' | 'notification' | 'dialog' | 'page';

/**
 * Presentation severity from informational through critical; does not change Error behavior.
 * @see AppError for creation.
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Application Error carrying a code, display hint, severity and optional metadata/original error.
 * @remarks Presentation hints do not render UI or enforce authorization. Metadata is retained
 * by reference and included in toJSON; exclude secrets before displaying or serializing.
 * @example
 * ```ts
 * import { AppError } from '@alneas/appkit-react/tools/core';
 * const error = new AppError('validation/input', 'Review the input', { displayMode: 'inline', severity: 'warning' });
 * ```
 */
export class AppError extends Error {
    /**
   * Stable host error code, also usable for localized message lookup.
   */
  readonly code: string;

    /**
   * Recommended host display mode; defaults to notification.
   */
  readonly displayMode: ErrorDisplayMode;

    /**
   * Presentation severity; defaults to error.
   */
  readonly severity: ErrorSeverity;

    /**
   * Optional host metadata retained by reference and included in JSON serialization.
   */
  readonly metadata?: Record<string, unknown>;

    /**
   * Optional wrapped Error retained by reference; excluded from toJSON.
   */
  readonly originalError?: Error;

  /**
 * Creates an Error with explicit application code and presentation metadata.
 * @param code - Host error identifier; no format validation is applied.
 * @param message - Error message stored by the Error base class.
 * @param options - Optional displayMode/severity (defaults notification/error), metadata and wrapped Error.
 * @example
 * ```ts
 * import { AppError } from '@alneas/appkit-react/tools/core';
 * const error = new AppError('error/example', 'Operation failed');
 * ```
 */
  constructor(
    code: string,
    message: string,
    options?: {
      /**
       * Presentation hint, default notification.
       */
      displayMode?: ErrorDisplayMode;
      /**
       * Presentation severity, default error.
       */
      severity?: ErrorSeverity;
      /**
       * Optional host metadata included by toJSON.
       */
      metadata?: Record<string, unknown>;
      /**
       * Optional wrapped Error, excluded from toJSON.
       */
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
 * Converts an unknown value to AppError, preserving an existing AppError unchanged.
 * @param error - Error or arbitrary thrown value to normalize.
 * @param defaultDisplayMode - Hint for newly created wrappers; defaults to notification.
 * @returns Existing AppError identity, or a new wrapper. Error instances with a string code
 * retain that code and map selected known auth messages; other Errors use message matching
 * or error/unknown. Non-Error values are stringified as error/unknown.
 * @remarks Plain objects with code/message are not interpreted as Error instances. The
 * default display hint does not override an existing AppError. No UI is rendered.
 * @example
 * ```ts
 * import { AppError } from '@alneas/appkit-react/tools/core';
 * const error = AppError.from(new Error('Unavailable'), 'dialog');
 * ```
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
 * Formats the application code and message for display/logging.
 * @returns String in [code] message form; does not include metadata or stack.
 * @example
 * ```ts
 * import { AppError } from '@alneas/appkit-react/tools/core';
 * const error = new AppError('error/example', 'Unavailable').toString();
 * ```
 */
  toString(): string {
    return `[${this.code}] ${this.message}`;
  }

  /**
 * Selects enumerable presentation fields for JSON serialization.
 * @returns New object with name/code/message/displayMode/severity/metadata; stack and originalError are omitted.
 * @remarks Metadata remains referenced and may itself be non-serializable or sensitive.
 * @example
 * ```ts
 * import { AppError } from '@alneas/appkit-react/tools/core';
 * const error = new AppError('error/example', 'Unavailable').toJSON();
 * ```
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
 * Represents an operation timeout with notification/warning presentation.
 * @remarks Construction does not start timers, perform a request or render error UI.
 * @example
 * ```ts
 * import { TimeoutError } from '@alneas/appkit-react/tools/core';
 * const error = new TimeoutError();
 * ```
 */
export class TimeoutError extends AppError {
  /**
 * Creates an application error with code error/timeout.
 * @param message - Message, default The operation timed out.
 * @param duration - Optional timeout duration in milliseconds; retained in metadata.
 * @example
 * ```ts
 * import { TimeoutError } from '@alneas/appkit-react/tools/core';
 * const error = new TimeoutError();
 * ```
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
 * Represents a network failure with notification/error presentation.
 * @remarks Construction does not start timers, perform a request or render error UI.
 * @example
 * ```ts
 * import { NetworkError } from '@alneas/appkit-react/tools/core';
 * const error = new NetworkError();
 * ```
 */
export class NetworkError extends AppError {
  /**
 * Creates an application error with code error/network.
 * @param message - Message, default Network error occurred.
 * @example
 * ```ts
 * import { NetworkError } from '@alneas/appkit-react/tools/core';
 * const error = new NetworkError();
 * ```
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
 * Represents denied access with dialog/error presentation.
 * @remarks Construction does not start timers, perform a request or render error UI.
 * @example
 * ```ts
 * import { UnauthorizedError } from '@alneas/appkit-react/tools/core';
 * const error = new UnauthorizedError();
 * ```
 */
export class UnauthorizedError extends AppError {
  /**
 * Creates an application error with code error/unauthorized.
 * @param message - Message, default You are not authorized to perform this action.
 * @example
 * ```ts
 * import { UnauthorizedError } from '@alneas/appkit-react/tools/core';
 * const error = new UnauthorizedError();
 * ```
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
 * Represents a missing resource with page/error presentation.
 * @remarks Construction does not start timers, perform a request or render error UI.
 * @example
 * ```ts
 * import { NotFoundError } from '@alneas/appkit-react/tools/core';
 * const error = new NotFoundError();
 * ```
 */
export class NotFoundError extends AppError {
  /**
 * Creates an application error with code error/not-found.
 * @param message - Message, default The requested resource was not found.
 * @param resource - Optional missing resource name retained in metadata.
 * @example
 * ```ts
 * import { NotFoundError } from '@alneas/appkit-react/tools/core';
 * const error = new NotFoundError();
 * ```
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
 * Represents invalid input with inline/warning presentation.
 * @remarks Construction does not start timers, perform a request or render error UI.
 * @example
 * ```ts
 * import { ValidationError } from '@alneas/appkit-react/tools/core';
 * const error = new ValidationError('Invalid input');
 * ```
 */
export class ValidationError extends AppError {
  /**
 * Creates an application error with code error/validation.
 * @param message - Required validation message.
 * @param fields - Optional per-field error messages retained in metadata.
 * @example
 * ```ts
 * import { ValidationError } from '@alneas/appkit-react/tools/core';
 * const error = new ValidationError('Invalid input');
 * ```
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
