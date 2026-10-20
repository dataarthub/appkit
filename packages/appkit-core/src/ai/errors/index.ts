import {ERROR_CATALOG} from './catalog';
/**
 * Error catalog family used to select fixed recovery guidance.
 *
 * @see {@link getAIErrorInfo} for canonical public-import usage and setup.
 */
export type AIErrorDomain = keyof typeof ERROR_CATALOG;
/**
 * Appkit chat error codes with fixed public recovery documentation.
 *
 * @see {@link getAIErrorInfo} for canonical public-import usage and setup.
 */
export type AIChatErrorCode = keyof typeof ERROR_CATALOG.chat;
/**
 * Public documentation and recovery metadata for a recognized error code.
 *
 * @see {@link getAIErrorInfo} for canonical public-import usage and setup.
 */
export interface AIErrorInfo {
  /** Absolute public guide URL explaining the catalogued failure. */
  readonly docsUrl:string;
  /** Package-relative documentation file and anchor for this error code. */
  readonly guide:string;
  /** Fixed recovery guidance for this failure; no automatic retry is performed. */
  readonly recovery:string}
/**
 * Fixed recovery metadata; unknown codes return undefined. Does not fetch documentation or retry.
 *
 * @param domain - Error catalog family, such as chat, action or tool.
 * @param code - Exact case-sensitive code to look up.
 * @returns Frozen public guide/recovery metadata, or undefined for an unknown domain/code.
 *
 * @example
 * ```typescript
 * import { getAIErrorInfo } from '@alneas/appkit-core/ai';
 *
 * console.log(getAIErrorInfo('chat', 'AI_HTTP_FAILURE'));
 * ```
 */
export function getAIErrorInfo(domain:AIErrorDomain,code:string):AIErrorInfo|undefined {
 const table=ERROR_CATALOG[domain] as Record<string,{readonly recovery:string}>;
 if(!table||!Object.hasOwn(table,code))return undefined;
 const guide='docs/ai-errors.md#'+domain+'-'+code.toLowerCase().replaceAll('_','-');
 return Object.freeze({guide,docsUrl:'https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/'+guide,recovery:table[code].recovery});
}
/**
 * An Appkit-owned chat failure. Caller errors and AbortError are not automatically wrapped.
 *
 * @example
 * ```typescript
 * import { AIChatError } from '@alneas/appkit-core/ai';
 *
 * const error = new AIChatError('AI_HTTP_FAILURE', 'The host endpoint failed');
 * console.log(error.code, error.docsUrl, error.recovery);
 * ```
 */
export class AIChatError extends Error {

  /** Failure category for programmatic handling without inspecting display text. */
  readonly code:AIChatErrorCode;
  /** Absolute public guide URL for this chat failure code. */
  readonly docsUrl:string;
  /** Fixed recovery guidance for this chat failure; the error does not trigger a retry. */
  readonly recovery:string;

  /**
   * @param code - Recognized Appkit chat failure code selecting fixed recovery metadata.
   * @param message - Application-facing error message stored on Error; raw causes are not automatically wrapped.
   *
   * @example
   * ```typescript
   * import { AIChatError } from '@alneas/appkit-core/ai';
   *
   * const error = new AIChatError('AI_HTTP_FAILURE', 'The host endpoint failed');
   * console.log(error.code, error.docsUrl, error.recovery);
   * ```
   */
  constructor(code:AIChatErrorCode,message:string){super(message);this.name='AIChatError';this.code=code;const info=getAIErrorInfo('chat',code)!;this.docsUrl=info.docsUrl;this.recovery=info.recovery;}
}
