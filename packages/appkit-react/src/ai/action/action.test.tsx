import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ActionRegistry } from "@alneas/appkit-core/ai";
import {
  ScreenActionProvider,
  useScreenActionRegistry,
  useScreenAction,
  useScreenContext,
  useScreenActions,
} from './index';

describe('ScreenAction Hooks & Provider in @alneas/appkit-react/ai', () => {
  it('throws an error if useScreenActionRegistry is called outside ScreenActionProvider', () => {
    function InvalidConsumer() {
      useScreenActionRegistry();
      return <div>invalid</div>;
    }

    expect(() => {
      renderToStaticMarkup(<InvalidConsumer />);
    }).toThrow('useScreenActionRegistry must be used within a <ScreenActionProvider>');
  });

  it('renders children within ScreenActionProvider successfully', () => {
    function Consumer() {
      const registry = useScreenActionRegistry();
      return <div>registered actions: {registry.listActions().length}</div>;
    }

    const html = renderToStaticMarkup(
      <ScreenActionProvider>
        <Consumer />
      </ScreenActionProvider>
    );

    expect(html).toContain('registered actions: 0');
  });

  it('allows injecting an external ActionRegistry instance', () => {
    const customRegistry = new ActionRegistry();
    customRegistry.registerAction({
      id: 'custom.action',
      description: 'Pre-registered action',
      validate: input => ({ ok: true, data: input }),
      handler: () => 'done',
    });

    function Consumer() {
      const registry = useScreenActionRegistry();
      return <div>action: {registry.listActions()[0].id}</div>;
    }

    const html = renderToStaticMarkup(
      <ScreenActionProvider registry={customRegistry}>
        <Consumer />
      </ScreenActionProvider>
    );

    expect(html).toContain('action: custom.action');
  });

  it('renders SSR shell with empty actions and contexts without hydration mismatch', () => {
    function SsrComponent() {
      useScreenAction({
        id: 'ssr.action',
        description: 'Action registered on client',
        validate: input => ({ ok: true, data: input }),
        handler: () => 'ok',
      });
      useScreenContext('ssr.context', () => 'ctx', 'Context on client');
      const { actions, contexts } = useScreenActions();
      return (
        <div>
          <span>actions: {actions.length}</span>
          <span>contexts: {contexts.length}</span>
        </div>
      );
    }

    const html = renderToStaticMarkup(
      <ScreenActionProvider>
        <SsrComponent />
      </ScreenActionProvider>
    );

    expect(html).toContain('actions: 0');
    expect(html).toContain('contexts: 0');
  });
});
