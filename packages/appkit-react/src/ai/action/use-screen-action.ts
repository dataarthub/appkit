import { useLayoutEffect, useRef } from 'react';
import type { ActionDefinition, ActionValidator, ExecutionContext } from "@alneas/appkit-core/ai";
import { useScreenActionRegistry } from './context';

/**
 * Registers an action on the current screen's ActionRegistry.
 *
 * Handler and validator automatically capture the latest committed
 * props and state via refs without requiring dependency arrays.
 * Metadata is a registration descriptor; keep it stable and replace it to update the list.
 * The action is automatically unregistered when the component unmounts
 * or when the action ID changes.
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
