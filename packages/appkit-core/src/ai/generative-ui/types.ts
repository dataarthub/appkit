/** Finite JSON data. Executable values and React nodes are never part of a UI document. */
export type GenerativeUIValue = null | boolean | number | string | readonly GenerativeUIValue[] | GenerativeUIObject;
/** Immutable object payload passed to a registered component validator. */
export interface GenerativeUIObject { readonly [key: string]: GenerativeUIValue }

/** One explicitly named UI component and its data. The application defines what each type accepts. */
export interface GenerativeUIBlock {
  readonly id: string;
  readonly type: string;
  readonly data: GenerativeUIObject;
}

/** A flat, versioned UI response. No layout code, executable props or remote component references. */
export interface GenerativeUIDocument {
  readonly version: 1;
  readonly id: string;
  readonly blocks: readonly GenerativeUIBlock[];
}

/** Envelope validation result. Component-specific validation belongs to the UI registry. */
export type GenerativeUIDocumentResult =
  | { readonly ok: true; readonly data: GenerativeUIDocument }
  | { readonly ok: false; readonly code: 'INVALID_DOCUMENT'; readonly error: string };
