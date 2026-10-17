import type { ReactNode } from 'react';
import type {
  ActionRegistry,
  ActionDefinition,
  ContextGetter,
} from "@alneas/appkit-core/ai";

/** Props for ScreenActionProvider. */
export interface ScreenActionProviderProps {
  children: ReactNode;
  /**
   * Optional custom ActionRegistry instance.
   * If omitted, a screen-scoped ActionRegistry is created automatically.
   */
  registry?: ActionRegistry;
}

/** Options for registering an action via useScreenAction. */
export type UseScreenActionOptions<TInput = unknown, TOutput = unknown> =
  ActionDefinition<TInput, TOutput>;

/** Options for registering a screen context via useScreenContext. */
export interface UseScreenContextOptions<T = unknown> {
  key: string;
  description?: string;
  getter: ContextGetter<T>;
}
