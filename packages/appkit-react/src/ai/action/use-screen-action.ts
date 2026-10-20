import { useLayoutEffect, useRef } from 'react';
import type { ActionDefinition, ActionValidator, ExecutionContext } from "@alneas/appkit-core/ai";
import { useScreenActionRegistry } from './context';

/**
 * Registers a validated action on the nearest screen registry after commit.
 *
 * @typeParam TInput - Validated input shape; defaults to unknown.
 *
 * @typeParam TOutput - Handler output shape; defaults to unknown.
 *
 * @param action - Stable ID/description/metadata with validator and handler from the host.
 *
 * @returns No value; effect cleanup unregisters this registration.
 *
 * @throws Error without ScreenActionProvider; registration errors propagate from the layout effect.
 *
 * @remarks Latest committed validator/handler are read through refs. ID, description or
 * metadata identity changes trigger re-registration. No action executes automatically;
 * no styles are required. The host owns effects and authorization in its handler.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider, useScreenAction, type ActionDefinition } from '@alneas/appkit-react/ai/action';
 * function Registration({ action }: { action: ActionDefinition<string, string> }) { useScreenAction(action); return null; }
 * export function Screen({ action }: { action: ActionDefinition<string, string> }) {
 *   return <ScreenActionProvider><Registration action={action} /></ScreenActionProvider>;
 * }
 * ```
 */
export function useScreenAction<TInput = unknown, TOutput = unknown>(
  action: ActionDefinition<TInput, TOutput>
): void {
  const registry = useScreenActionRegistry();

  const actionRef = useRef(action);
  useLayoutEffect(() => {
    actionRef.current = action;
  });

  const { id, description, metadata } = action;

  useLayoutEffect(() => {
    const wrappedValidate: ActionValidator<TInput> = (input) => {
      return actionRef.current.validate(input);
    };

    const wrappedHandler = (input: TInput, context?: ExecutionContext) => {
      return context ? actionRef.current.handler(input, context) : actionRef.current.handler(input);
    };

    const unregister = registry.registerAction({
      id,
      description,
      validate: wrappedValidate,
      handler: wrappedHandler,
      metadata,
    });

    return () => {
      unregister();
    };
  }, [registry, id, description, metadata]);
}
