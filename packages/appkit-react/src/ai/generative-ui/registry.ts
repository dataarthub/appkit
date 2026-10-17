import { createElement, isValidElement, type ComponentType, type ReactElement } from 'react';
import { createGenerativeUIContract } from "@alneas/appkit-core/ai";
import type { GenerativeUIBlock, GenerativeUIObject } from "@alneas/appkit-core/ai";

/** A pure application validator may transform JSON data into the component's typed input. */
export type GenerativeUIDataResult<TData> = { readonly ok: true; readonly data: TData } | { readonly ok: false };

/** Safe diagnostic metadata; no raw payload, exception or validator message is exposed. */
export interface GenerativeUIIssue {
  readonly code: 'INVALID_DOCUMENT' | 'UNKNOWN_COMPONENT' | 'INVALID_DATA' | 'RENDER_ERROR';
  readonly blockId?: string;
  readonly type?: string;
}

/** Validated component resolution, before React renders the element. */
export type GenerativeUIResolution =
  | { readonly ok: true; readonly element: ReactElement }
  | { readonly ok: false; readonly issue: GenerativeUIIssue };

/** Application-owned component registration produced by defineGenerativeUIComponent. */
export interface GenerativeUIComponent {
  readonly type: string;
  /** Optional inline draft-07 schema, enforced before the component validator. */
  readonly dataSchema?: GenerativeUIObject;
  readonly resolve: (data: GenerativeUIObject) => ReactElement | null;
}

/** Immutable registry. Create a new registry to change the permitted components. */
export interface GenerativeUIRegistry {
  readonly types: readonly string[];
  /** Available only when every registration supplies dataSchema (including the empty registry). */
  readonly documentSchema?: GenerativeUIObject;
  resolve(block: GenerativeUIBlock): GenerativeUIResolution;
}

/**
 * Binds a component to a pure, synchronous validator. Components receive only the
 * validated `data` prop. Callbacks, current records and credentials belong to trusted
 * application code (for example React Context), never the generated document.
 * Optional dataSchema is snapshotted and validated before the custom validator.
 * It uses the inline draft-07 subset documented by createGenerativeUIContract.
 *
 * @example
 * ```tsx
 * import { defineGenerativeUIComponent } from "./";
 * const greeting = defineGenerativeUIComponent({
 *   type: 'greeting',
 *   validate: (data) => typeof data.text === 'string'
 *     ? { ok: true, data: { text: data.text } } : { ok: false },
 *   component: ({ data }) => <p>{data.text}</p>,
 * });
 * ```
 */
export function defineGenerativeUIComponent<TData>(definition: {
  readonly type: string;
  /** Optional shared schema for model output and runtime validation. */
  readonly dataSchema?: GenerativeUIObject;
  readonly validate: (data: GenerativeUIObject) => GenerativeUIDataResult<TData>;
  readonly component: ComponentType<{ data: TData }>;
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
