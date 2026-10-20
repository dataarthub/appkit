import { useMemo, useState, type ReactNode } from 'react';
import { validateGenerativeUIDocument } from "@alneas/appkit-core/ai";
import { MinimalErrorBoundary } from './error-boundary';
import type { GenerativeUIIssue, GenerativeUIRegistry } from './registry';

/**
 * Props for rendering a fully assembled, immutable JSON response.
 * @see GenerativeUIRenderer for the canonical usage example.
 */
export interface GenerativeUIRendererProps {
  /** Parsed JSON input. Replace its reference to submit a new immutable document. */
  input: unknown;
  /** Only explicitly registered component types can render. */
  registry: GenerativeUIRegistry;
  /** Application-owned fallback/localization. Receives safe metadata, never raw exceptions. */
  renderFallback?: (issue: GenerativeUIIssue) => ReactNode;
}

function defaultFallback(issue: GenerativeUIIssue): ReactNode {
  return <p role="status" data-generative-ui-error={issue.code}>This content cannot be displayed.</p>;
}

/**
 * Renders validated JSON blocks using an explicit application registry.
 *
 *
 * @remarks
 * Envelope validation snapshots input by reference. Pass immutable documents; replace
 * input when a response changes. Component validators run during rendering and must
 * be pure. Unknown types and invalid data get per-block fallbacks; malformed envelopes
 * get a document fallback. MinimalErrorBoundary isolates client render failures.
 * Block identity includes document ID, block ID/type and data.
 *
 *
 * @param props - Immutable response, explicit registry and optional localized fallback renderer.
 *
 * @returns Block wrappers and registered elements, or fallback content for invalid input.
 *
 * @remarks Requires React; registered components own any other providers or CSS.
 * The default fallback is an English status paragraph. Client error boundaries handle
 * descendant render failures; React server rendering errors are not isolated by them.
 * Fallback callback errors propagate. Changing registry identity remounts blocks.
 *
 * @example
 * ```tsx
 * import { createGenerativeUIRegistry, GenerativeUIRenderer } from '@alneas/appkit-react/ai/generative-ui';
 * const registry = createGenerativeUIRegistry([]);
 * // Supply a parsed host response; unregistered types receive the fallback.
 * export function GeneratedResponse({ response }: { response: unknown }) {
 *   return <GenerativeUIRenderer input={response} registry={registry} />;
 * }
 * ```
 */
export function GenerativeUIRenderer({
  input,
  registry,
  renderFallback = defaultFallback,
}: GenerativeUIRendererProps): ReactNode {
  const document = useMemo(() => validateGenerativeUIDocument(input), [input]);
  const [scope, setScope] = useState({ registry, generation: 0 });
  if (scope.registry !== registry) setScope({ registry, generation: scope.generation + 1 });
  if (!document.ok) return renderFallback({ code: 'INVALID_DOCUMENT' });

  return (
    <>
      {document.data.blocks.map(block => {
        const resolved = registry.resolve(block);
        const key = JSON.stringify([scope.generation, document.data.id, block]);
        const fallback = (issue: GenerativeUIIssue) => (
          <div data-generative-ui-block={block.id}>{renderFallback(issue)}</div>
        );
        if (!resolved.ok) return <div key={key}>{fallback(resolved.issue)}</div>;
        return (
          <MinimalErrorBoundary
            key={key}
            fallback={() => fallback({ code: 'RENDER_ERROR', blockId: block.id, type: block.type })}
          >
            <div data-generative-ui-block={block.id}>{resolved.element}</div>
          </MinimalErrorBoundary>
        );
      })}
    </>
  );
}
