/**
 * Finite JSON data. Executable values and React nodes are never part of a UI document.
 *
 * @see {@link createGenerativeUIContract} for canonical public-import usage and setup.
 */
export type GenerativeUIValue = null | boolean | number | string | readonly GenerativeUIValue[] | GenerativeUIObject;
/**
 * Immutable object payload passed to a registered component validator.
 *
 * @see {@link createGenerativeUIContract} for canonical public-import usage and setup.
 */
export interface GenerativeUIObject { readonly [key: string]: GenerativeUIValue }

/**
 * One explicitly named UI component and its data. The application defines what each type accepts.
 *
 * @see {@link createGenerativeUIContract} for canonical public-import usage and setup.
 */
export interface GenerativeUIBlock {

  /** Unique block identifier within this document, nonblank and at most 128 characters. */
  readonly id: string;

  /** Explicit registered component name matching an ASCII letter followed by up to 63 letters/digits/underscore/dot/hyphen characters. */
  readonly type: string;

  /** Validated or projected result data carried by the successful variant. */
  readonly data: GenerativeUIObject;
}

/**
 * A flat, versioned UI response. No layout code, executable props or remote component references.
 *
 * @see {@link createGenerativeUIContract} for canonical public-import usage and setup.
 */
export interface GenerativeUIDocument {

  /** UI document envelope version; only literal 1 is supported. */
  readonly version: 1;

  /** Nonblank document identifier, at most 128 characters. */
  readonly id: string;

  /** Flat UI blocks, at most 32, with unique nonblank IDs; executable layout is not accepted. */
  readonly blocks: readonly GenerativeUIBlock[];
}

/**
 * Envelope validation result. Component-specific validation belongs to the UI registry.
 *
 * @see {@link createGenerativeUIContract} for canonical public-import usage and setup.
 */
export type GenerativeUIDocumentResult =
  | {
  /** Discriminant indicating whether this operation succeeded. */
  readonly ok: true;
  /** Validated or projected result data carried by the successful variant. */
  readonly data: GenerativeUIDocument }
  | {
  /** Discriminant indicating whether this operation succeeded. */
  readonly ok: false;
  /** Failure category for programmatic handling without inspecting display text. */
  readonly code: 'INVALID_DOCUMENT';
  /** Fixed envelope/schema failure text; raw parsing exceptions are not disclosed. */
  readonly error: string };
