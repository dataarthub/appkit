import { Component, type ReactNode } from 'react';

/**
 * Client render isolation inputs; see MinimalErrorBoundary for usage.
 *
 * @see MinimalErrorBoundary for the canonical usage example.
 */
export interface MinimalErrorBoundaryProps {
  /**
   * Descendant content whose render errors are isolated on the client.
   */
  children: ReactNode;
  /**
   * Render callback receiving the caught Error; callback failures are not caught by this same boundary.
   *
   * @param error - Stored descendant render error.
   *
   * @returns Fallback content replacing all children.
   */
  fallback: (error: Error) => ReactNode;
  /**
   * Optional callback invoked by componentDidCatch after a descendant failure.
   */
  onError?: (error: Error) => void;
}

/**
 * Stored client render failure; see MinimalErrorBoundary lifecycle.
 *
 * @see MinimalErrorBoundary for the canonical usage example.
 */
interface State {
  /**
   * Caught Error, or null before a render failure.
   */
  error: Error | null;
}

/**
 * Isolates descendant client render failures behind an application fallback.
 *
 * @remarks Requires React only. This boundary does not catch SSR, event-handler or async
 * errors, nor its own fallback errors. It keeps the failure until remounted; changing
 * children does not reset state. onError exceptions propagate to an outer boundary.
 *
 * @example
 * ```tsx
 * import { MinimalErrorBoundary } from '@alneas/appkit-react/ai/generative-ui';
 * export function Block() {
 *   return <MinimalErrorBoundary fallback={() => <p>Unavailable</p>}><span>Content</span></MinimalErrorBoundary>;
 * }
 * ```
 */
export class MinimalErrorBoundary extends Component<MinimalErrorBoundaryProps, State> {
  /**
   * Current caught-error state; initialized without an error.
   */
  override state: State = { error: null };

  /**
   * Store the descendant render failure for fallback rendering.
   *
   * @param error - Error delivered by React.
   *
   * @returns Replacement state containing the error.
   *
   * @see MinimalErrorBoundary for the usage example.
   *
   * @example
   * ```tsx
   * import { MinimalErrorBoundary } from '@alneas/appkit-react/ai/generative-ui';
   * // React invokes the lifecycle method; mount the boundary rather than calling it directly.
   * export function IsolatedBlock() {
   *   return <MinimalErrorBoundary fallback={() => <p>Unavailable</p>}><span>Block content</span></MinimalErrorBoundary>;
   * }
   * ```
   */
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  /**
   * Notify the optional host error observer after React catches a descendant failure.
   *
   * @param error - Caught descendant render error.
   *
   * @returns No value after observer invocation.
   *
   * @throws Observer errors propagate to an outer boundary.
   *
   * @see MinimalErrorBoundary for setup.
   *
   * @example
   * ```tsx
   * import { MinimalErrorBoundary } from '@alneas/appkit-react/ai/generative-ui';
   * // React invokes the lifecycle method; mount the boundary rather than calling it directly.
   * export function IsolatedBlock() {
   *   return <MinimalErrorBoundary fallback={() => <p>Unavailable</p>}><span>Block content</span></MinimalErrorBoundary>;
   * }
   * ```
   */
  override componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  /**
   * Render children until an error is stored, then invoke fallback.
   *
   * @returns Descendants or host fallback content.
   *
   * @throws Fallback errors propagate to an outer boundary.
   *
   * @see MinimalErrorBoundary for setup.
   *
   * @example
   * ```tsx
   * import { MinimalErrorBoundary } from '@alneas/appkit-react/ai/generative-ui';
   * // React invokes the lifecycle method; mount the boundary rather than calling it directly.
   * export function IsolatedBlock() {
   *   return <MinimalErrorBoundary fallback={() => <p>Unavailable</p>}><span>Block content</span></MinimalErrorBoundary>;
   * }
   * ```
   */
  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}
