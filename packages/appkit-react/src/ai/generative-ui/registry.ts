import { createElement, isValidElement, type ComponentType, type ReactElement } from 'react';
import { createGenerativeUIContract } from "@alneas/appkit-core/ai";
import type { GenerativeUIBlock, GenerativeUIObject } from "@alneas/appkit-core/ai";

/**
 * Result of a pure validator: ok true supplies typed input; ok false rejects the block.
 *
 * @typeParam TData - Input shape accepted by the registered component.
 *
 * @remarks See defineGenerativeUIComponent for a complete registration example.
 *
 * @see defineGenerativeUIComponent for the canonical usage example.
 */
export type GenerativeUIDataResult<TData> = {
  /** Successful validation discriminator. */
  readonly ok: true;
  /** Typed input passed to the registered component. */
  readonly data: TData;
} | {
  /** Rejected validation discriminator; no typed input is available. */
  readonly ok: false;
};

/**
 * Safe diagnostic metadata; no raw payload, exception or validator message is exposed.
 * @see GenerativeUIRenderer for the canonical usage example.
 */
export interface GenerativeUIIssue {
  /** Safe failure category for document, allowlist, data or React rendering failures. */
  readonly code: 'INVALID_DOCUMENT' | 'UNKNOWN_COMPONENT' | 'INVALID_DATA' | 'RENDER_ERROR';
  /** Block identifier when failure is scoped to a block. */
  readonly blockId?: string;
  /** Requested component type when available. */
  readonly type?: string;
}

/**
 * Validated component resolution, before React renders the element.
 * @see createGenerativeUIRegistry for the canonical usage example.
 */
export type GenerativeUIResolution =
  | {
      /** Successful allowlist and data resolution. */
      readonly ok: true;
      /** Resolved element; React rendering may still fail later. */
      readonly element: ReactElement;
    }
  | {
      /** Failed allowlist or data resolution. */
      readonly ok: false;
      /** Safe diagnostic metadata without raw payloads or errors. */
      readonly issue: GenerativeUIIssue;
    };

/**
 * Application-owned component registration produced by defineGenerativeUIComponent.
 * @see defineGenerativeUIComponent for the canonical usage example.
 */
export interface GenerativeUIComponent {
  /** Stable allowlist key: letter first, then up to 63 letters, digits, underscores, dots or hyphens. */
  readonly type: string;
  /** Optional inline draft-07 schema, enforced before the component validator. */
  readonly dataSchema?: GenerativeUIObject;
  /**
   * Resolve input through the registration's schema and validator.
   *
   * @param data - JSON object to validate before passing typed data to the component.
   *
   * @returns Element for accepted data, or null when validation rejects it.
   *
   * @throws Direct calls propagate validator errors; registry.resolve isolates them.
   *
   * @remarks See defineGenerativeUIComponent for registration setup.
   */
  readonly resolve: (data: GenerativeUIObject) => ReactElement | null;
}

/**
 * Immutable registry. Create a new registry to change the permitted components.
 * @see createGenerativeUIRegistry for the canonical usage example.
 */
export interface GenerativeUIRegistry {
  /** Frozen registration keys in insertion order. */
  readonly types: readonly string[];
  /** Available only when every registration supplies dataSchema (including the empty registry). */
  readonly documentSchema?: GenerativeUIObject;
  /**
   * Resolve one structurally valid block through the allowlist.
   *
   * @param block - Block from a validated generative UI document.
   *
   * @returns Element on success, or safe issue metadata for an unknown type or rejected data.
   *
   * @remarks Validator/registration exceptions become INVALID_DATA; component rendering happens later.
   * See createGenerativeUIRegistry for usage.
   */
  resolve(block: GenerativeUIBlock): GenerativeUIResolution;
}

/**
 * Binds a component to a pure, synchronous validator. Components receive only the
 * validated `data` prop. Callbacks, current records and credentials belong to trusted
 * application code (for example React Context), never the generated document.
 * Optional dataSchema is snapshotted and validated before the custom validator.
 * It uses the inline draft-07 subset documented by createGenerativeUIContract.
 *
 *
 * @typeParam TData - Validated input shape passed to the registered React component.
 *
 * @param definition - Unique type name, pure synchronous validator, component and optional schema.
 *
 * @returns Frozen registration for createGenerativeUIRegistry; resolve returns null on invalid data.
 *
 * @throws For an invalid type name, missing validator/component or unsupported data schema.
 *
 * @remarks Requires React. The registration itself needs no context or CSS; supplied
 * components own their provider/style requirements. Validator exceptions are caught by
 * registry resolution, but can escape direct registration.resolve calls.
 *
 * @example
 * ```tsx
 * import { defineGenerativeUIComponent } from "@alneas/appkit-react/ai/generative-ui";
 * const greeting = defineGenerativeUIComponent<{ text: string }>({
 *   type: 'greeting',
 *   validate: (data) => typeof data.text === 'string'
 *     ? { ok: true, data: { text: data.text } } : { ok: false },
 *   component: ({ data }) => <p>{data.text}</p>,
 * });
 * ```
 */
export function defineGenerativeUIComponent<TData>(definition: {
  /** Allowlist name with the same syntax as GenerativeUIComponent.type. */
  readonly type: string;
  /** Optional shared schema for model output and runtime validation. */
  readonly dataSchema?: GenerativeUIObject;
  /**
   * Pure synchronous conversion from JSON to typed input; return ok false to reject.
   * @param data - JSON object to validate/transform synchronously.
   *
   * @returns ok true with typed component input, or ok false to reject this block.
   */
  readonly validate: (data: GenerativeUIObject) => GenerativeUIDataResult<TData>;
  /** Trusted React component receiving only validated data; owns its context/style requirements. */
  readonly component: ComponentType<{
    /** Validated input returned by the registration validator. */
    data: TData;
  }>;
}): GenerativeUIComponent {
  const { type, validate, component, dataSchema } = definition;
  if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(type) || typeof validate !== 'function' || !component) {
    throw new Error('A UI component requires a valid type, validator and component');
  }
  const contract = dataSchema !== undefined ? createGenerativeUIContract([{ type, dataSchema }]) : undefined;
  const snapshot = contract?.components[0].dataSchema;
  return Object.freeze({
    type,
    ...(snapshot ? { dataSchema: snapshot } : {}),
    resolve(data: GenerativeUIObject) {
      if (contract && !contract.validateData(type, data)) return null;
      const result = validate(data);
      return result?.ok === true ? createElement(component, { data: result.data }) : null;
    },
  });
}

/**
 * Creates an allowlist of application-defined UI components. No global registration,
 * dynamic imports, HTML evaluation or Action execution occurs. Validators must be pure;
 * their failures are isolated per block. Rendering exceptions are handled by the renderer.
 * documentSchema is available only if every component declares dataSchema; missing
 * schemas are not guessed. It covers structural validation, not custom business rules.
 *
 * @param components - Registrations with distinct, valid allowlist names; an empty list is permitted.
 *
 * @returns Frozen registry with insertion-ordered types and an optional document schema.
 *
 * @throws For invalid/duplicate names, missing resolve functions or invalid declared schemas.
 *
 * @example
 * ```ts
 * import { createGenerativeUIRegistry } from '@alneas/appkit-react/ai/generative-ui';
 * const registry = createGenerativeUIRegistry([]);
 * const result = registry.resolve({ id: 'missing', type: 'unknown', data: {} });
 * // result.ok is false: no component is registered.
 * ```
 */
export function createGenerativeUIRegistry(components: readonly GenerativeUIComponent[]): GenerativeUIRegistry {
  const entries = new Map<string, GenerativeUIComponent['resolve']>();
  for (const component of components) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(component.type) || typeof component.resolve !== 'function' || entries.has(component.type)) {
      throw new Error('UI component types must be valid and unique');
    }
    entries.set(component.type, component.resolve);
  }
  const described = components.filter(
    (component): component is GenerativeUIComponent & { dataSchema: GenerativeUIObject } =>
      component.dataSchema !== undefined
  );
  const contract = createGenerativeUIContract(described);
  const describedTypes = new Set(described.map(component => component.type));
  return Object.freeze({
    ...(described.length === components.length ? { documentSchema: contract.schema } : {}),
    types: Object.freeze([...entries.keys()]),
    resolve(block: GenerativeUIBlock): GenerativeUIResolution {
      const failure = (code: GenerativeUIIssue['code']): GenerativeUIResolution => ({
        ok: false,
        issue: { code, blockId: block.id, type: block.type },
      });
      const resolve = entries.get(block.type);
      if (!resolve) return failure('UNKNOWN_COMPONENT');
      try {
        if (describedTypes.has(block.type) && !contract.validateData(block.type, block.data)) return failure('INVALID_DATA');
        const element = resolve(block.data);
        return isValidElement(element) ? { ok: true, element } : failure('INVALID_DATA');
      } catch {
        return failure('INVALID_DATA');
      }
    },
  });
}
