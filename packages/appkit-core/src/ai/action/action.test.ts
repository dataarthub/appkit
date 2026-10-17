import { describe, it, expect, vi } from 'bun:test';
import { ActionRegistry } from './registry';
import type { ActionDefinition, ActionValidator } from './types';

describe('ActionRegistry', () => {
  describe('Actions', () => {
    const noInputValidator: ActionValidator<void> = (input) => {
      if (input === undefined || input === null) {
        return { ok: true, data: undefined };
      }
      return { ok: false, error: 'Expected no input' };
    };

    const stringValidator: ActionValidator<string> = (input) => {
      if (typeof input === 'string' && input.length > 0) {
        return { ok: true, data: input };
      }
      return { ok: false, error: 'Expected non-empty string' };
    };

    it('registers and unregisters an action successfully', () => {
      const registry = new ActionRegistry();
      const action: ActionDefinition<void, string> = {
        id: 'test.action',
        description: 'Test action',
        validate: noInputValidator,
        handler: () => 'result',
      };

      const unregister = registry.registerAction(action);
      expect(registry.hasAction('test.action')).toBe(true);
      expect(registry.listActions()).toHaveLength(1);
      expect(registry.listActions()[0].id).toBe('test.action');

      unregister();
      expect(registry.hasAction('test.action')).toBe(false);
      expect(registry.listActions()).toHaveLength(0);
    });

    it('rejects duplicate action IDs', () => {
      const registry = new ActionRegistry();
      const action: ActionDefinition<void, void> = {
        id: 'dup.action',
        description: 'Dup',
        validate: noInputValidator,
        handler: () => {},
      };

      registry.registerAction(action);
      expect(() => registry.registerAction(action)).toThrow(
        'Action with id "dup.action" is already registered'
      );
    });

    it('protects new registration when old cleanup is called after re-registration', () => {
      const registry = new ActionRegistry();
      const action1: ActionDefinition<void, string> = {
        id: 'same.id',
        description: 'First',
        validate: noInputValidator,
        handler: () => 'first',
      };
      const action2: ActionDefinition<void, string> = {
        id: 'same.id',
        description: 'Second',
        validate: noInputValidator,
        handler: () => 'second',
      };

      const unregister1 = registry.registerAction(action1);
      unregister1(); // cleanly unregistered

      // Register new instance with same ID
      const unregister2 = registry.registerAction(action2);
      expect(registry.getAction('same.id')?.description).toBe('Second');

      // Call old unregister again
      unregister1();
      // Should NOT delete the new registration!
      expect(registry.hasAction('same.id')).toBe(true);
      expect(registry.getAction('same.id')?.description).toBe('Second');

      // Unregistering the second instance works
      unregister2();
      expect(registry.hasAction('same.id')).toBe(false);
    });

    it('returns NOT_FOUND for unregistered action execution', async () => {
      const registry = new ActionRegistry();
      const result = await registry.executeAction('unknown', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('NOT_FOUND');
      }
    });

    it('validates input and stops execution if validation fails', async () => {
      const registry = new ActionRegistry();
      const handler = vi.fn();
      registry.registerAction({
        id: 'greet',
        description: 'Greet someone',
        validate: stringValidator,
        handler,
      });

      // Invalid input (number instead of string)
      const invalidResult = await registry.executeAction('greet', 123);
      expect(invalidResult.ok).toBe(false);
      if (!invalidResult.ok) {
        expect(invalidResult.code).toBe('INVALID_INPUT');
        expect(invalidResult.error).toContain('Expected non-empty string');
      }
      expect(handler).not.toHaveBeenCalled();

      // Valid input
      const validResult = await registry.executeAction('greet', 'Alice');
      expect(validResult.ok).toBe(true);
      expect(handler).toHaveBeenCalledWith('Alice');
    });

    it('handles validator throwing an unexpected exception', async () => {
      const registry = new ActionRegistry();
      const handler = vi.fn();
      registry.registerAction({
        id: 'crash',
        description: 'Crashes on validate',
        validate: () => {
          throw new Error('Validator exploded');
        },
        handler,
      });

      const result = await registry.executeAction('crash', 'data');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('INVALID_INPUT');
        expect(result.error).toBe('Validator exploded');
      }
      expect(handler).not.toHaveBeenCalled();
    });

    it('catches handler execution errors and preserves the cause', async () => {
      const registry = new ActionRegistry();
      const customError = new Error('DB query timeout');
      registry.registerAction({
        id: 'fail',
        description: 'Throws in handler',
        validate: noInputValidator,
        handler: () => {
          throw customError;
        },
      });

      const result = await registry.executeAction('fail', undefined);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('EXECUTION_FAILED');
        expect(result.error).toBe('DB query timeout');
        expect(result.cause).toBe(customError);
      }
    });

    it('maintains snapshot reference equality unless registrations change', () => {
      const registry = new ActionRegistry();
      const initialSnapshot = registry.listActions();

      // Calling listActions without modifications returns the exact same array reference
      expect(registry.listActions()).toBe(initialSnapshot);

      const unregister = registry.registerAction({
        id: 'a',
        description: 'A',
        validate: noInputValidator,
        handler: () => {},
      });

      const updatedSnapshot = registry.listActions();
      expect(updatedSnapshot).not.toBe(initialSnapshot);
      expect(registry.listActions()).toBe(updatedSnapshot);

      unregister();
      expect(registry.listActions()).not.toBe(updatedSnapshot);
    });
  });

  describe('Contexts', () => {
    it('registers and retrieves context on demand', async () => {
      const registry = new ActionRegistry();
      let count = 10;
      const unregister = registry.registerContext({
        key: 'counter',
        description: 'Current count',
        getter: () => count,
      });

      expect(registry.hasContext('counter')).toBe(true);
      const res1 = await registry.getContext('counter');
      expect(res1).toEqual({ ok: true, value: 10 });

      // Mutate external state and retrieve again
      count = 25;
      const res2 = await registry.getContext('counter');
      expect(res2).toEqual({ ok: true, value: 25 });

      unregister();
      expect(registry.hasContext('counter')).toBe(false);
      const res3 = await registry.getContext('counter');
      expect(res3.ok).toBe(false);
      if (!res3.ok) {
        expect(res3.code).toBe('NOT_FOUND');
      }
    });

    it('rejects duplicate context keys', () => {
      const registry = new ActionRegistry();
      registry.registerContext({
        key: 'k',
        getter: () => 'val',
      });
      expect(() =>
        registry.registerContext({
          key: 'k',
          getter: () => 'other',
        })
      ).toThrow('Context with key "k" is already registered');
    });

    it('protects context re-registration from old unregister calls', () => {
      const registry = new ActionRegistry();
      const unreg1 = registry.registerContext({
        key: 'theme',
        getter: () => 'light',
      });
      unreg1();

      const unreg2 = registry.registerContext({
        key: 'theme',
        getter: () => 'dark',
      });

      unreg1(); // Old cleanup
      expect(registry.hasContext('theme')).toBe(true);

      unreg2();
      expect(registry.hasContext('theme')).toBe(false);
    });

    it('catches async getter errors safely', async () => {
      const registry = new ActionRegistry();
      registry.registerContext({
        key: 'broken',
        getter: async () => {
          throw new Error('Failed to compute context');
        },
      });

      const res = await registry.getContext('broken');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe('GETTER_FAILED');
        expect(res.error).toBe('Failed to compute context');
      }
    });

    it('handles context being unregistered while async getter is in-flight', async () => {
      const registry = new ActionRegistry();
      let resolveGetter: (v: string) => void;
      const delayedPromise = new Promise<string>((resolve) => {
        resolveGetter = resolve;
      });

      const unregister = registry.registerContext({
        key: 'asyncCtx',
        getter: () => delayedPromise,
      });

      const pendingGet = registry.getContext('asyncCtx');
      // Unregister while getter is still pending!
      unregister();
      resolveGetter!('done');

      const res = await pendingGet;
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe('UNREGISTERED');
      }
    });

    it('retrieves all contexts via getAllContext', async () => {
      const registry = new ActionRegistry();
      registry.registerContext({ key: 'a', getter: () => 1 });
      registry.registerContext({ key: 'b', getter: () => 'hello' });

      const all = await registry.getAllContext();
      expect(all).toEqual({
        a: { ok: true, value: 1 },
        b: { ok: true, value: 'hello' },
      });
    });
  });

  describe('Subscriptions', () => {
    it('notifies listeners on registration and unregistration', () => {
      const registry = new ActionRegistry();
      const listener = vi.fn();
      const unsubscribe = registry.subscribe(listener);

      const unregisterAction = registry.registerAction({
        id: 'act',
        description: 'Act',
        validate: () => ({ ok: true, data: undefined }),
        handler: () => {},
      });
      expect(listener).toHaveBeenCalledTimes(1);

      const unregisterContext = registry.registerContext({
        key: 'ctx',
        getter: () => 'v',
      });
      expect(listener).toHaveBeenCalledTimes(2);

      unregisterAction();
      expect(listener).toHaveBeenCalledTimes(3);

      unregisterContext();
      expect(listener).toHaveBeenCalledTimes(4);

      unsubscribe();
      registry.registerAction({
        id: 'act2',
        description: 'Act2',
        validate: () => ({ ok: true, data: undefined }),
        handler: () => {},
      });
      // Listener was unsubscribed, count remains 4
      expect(listener).toHaveBeenCalledTimes(4);
    });
  });
});


describe('registration identity and external boundaries', () => {
  it('captures action and context keys and functions independently from input objects', async () => {
    const registry = new ActionRegistry();
    const action = { id: 'original', description: 'original', validate: (input: unknown) => ({ ok: true as const, data: input }), handler: () => 'original' };
    const removeAction = registry.registerAction(action);
    action.id = 'mutated';
    action.handler = () => 'mutated';
    expect(await registry.executeAction('original', null)).toEqual({ ok: true, data: 'original' });
    const context = { key: 'original', getter: () => 1 };
    const removeContext = registry.registerContext(context);
    context.key = 'mutated';
    context.getter = () => 2;
    expect(await registry.getContext('original')).toEqual({ ok: true, value: 1 });
    removeAction();
    removeContext();
    expect(registry.hasAction('original')).toBe(false);
    expect(registry.hasContext('original')).toBe(false);
  });

  it('returns special context keys as own data properties without changing the prototype', async () => {
    const registry = new ActionRegistry();
    for (const key of ['__proto__', 'constructor', 'toString']) registry.registerContext({ key, getter: () => key });
    const result = await registry.getAllContext();
    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(Object.keys(result)).toHaveLength(3);
    expect(result.__proto__).toEqual({ ok: true, value: '__proto__' });
    expect(JSON.parse(JSON.stringify(result)).__proto__).toEqual({ ok: true, value: '__proto__' });
  });

  it('rejects malformed validator results without invoking the handler', async () => {
    const registry = new ActionRegistry();
    const handler = vi.fn();
    registry.registerAction({ id: 'invalid', description: 'invalid', validate: (() => ({ ok: 'true', data: 1 })) as unknown as ActionValidator<number>, handler });
    expect((await registry.executeAction('invalid', null)).ok).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
