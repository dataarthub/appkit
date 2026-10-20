import type { ReactNode } from 'react';
import type {
  ActionRegistry,
  ActionDefinition,
  ContextGetter,
} from "@alneas/appkit-core/ai";

/**
 * Provider inputs for a screen-specific registry.
 *
 * @see ScreenActionProvider for setup.
 */
export interface ScreenActionProviderProps {
  /**
   * Descendants that register or consume screen actions.
   */
  children: ReactNode;
  /**
   * Optional custom ActionRegistry instance.
   * If omitted, a screen-scoped ActionRegistry is created automatically.
   */
  registry?: ActionRegistry;
}

/**
 * Action definition accepted by useScreenAction without changing the Core contract.
 *
 * @typeParam TInput - Validated handler input; defaults to unknown.
 *
 * @typeParam TOutput - Handler result; defaults to unknown.
 *
 * @see useScreenAction for registration.
 */
export type UseScreenActionOptions<TInput = unknown, TOutput = unknown> =
  ActionDefinition<TInput, TOutput>;

/**
 * Named lazy context source registered by useScreenContext.
 *
 * @typeParam T - Getter result shape; defaults to unknown.
 *
 * @see useScreenContext for usage.
 */
export interface UseScreenContextOptions<T = unknown> {
  /**
   * Registry key; use a stable screen-specific value to avoid collisions.
   */
  key: string;
  /**
   * Optional human/model-facing description.
   */
  description?: string;
  /**
   * On-demand context getter; latest committed callback is invoked by registry reads.
   *
   * @returns Context value or promise of the value, according to the Core ContextGetter contract.
   */
  getter: ContextGetter<T>;
}
