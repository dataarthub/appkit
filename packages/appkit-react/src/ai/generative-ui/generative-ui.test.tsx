import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGenerativeUIRegistry, defineGenerativeUIComponent, GenerativeUIRenderer } from './index';

const text = () =>
  defineGenerativeUIComponent<{ text: string }>({
    type: 'text',
    validate: data => (typeof data.text === 'string' ? { ok: true, data: { text: data.text } } : { ok: false }),
    component: ({ data }) => <p>{data.text}</p>,
  });

const document = (type = 'text', data: unknown = { text: 'Hello' }) => ({
  version: 1,
  id: 'answer',
  blocks: [{ id: 'block', type, data }],
});

describe('Generative UI SSR and Registry in @alneas/appkit-react/ai', () => {
  it('renders only validated data through registered components and escapes HTML', () => {
    const registry = createGenerativeUIRegistry([text()]);
    const html = renderToStaticMarkup(
      <GenerativeUIRenderer
        input={document('text', {
          text: '<img src=x onerror=alert(1)>',
          onClick: 'save',
          dangerouslySetInnerHTML: { __html: 'secret' },
        })}
        registry={registry}
      />
    );
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('secret');
    expect(html).not.toContain('onClick');
  });

  it('isolates unknown types and invalid data with fallbacks', () => {
    const registry = createGenerativeUIRegistry([text()]);
    const input = {
      version: 1,
      id: 'answer',
      blocks: [
        { id: 'a', type: 'text', data: { text: 'Visible' } },
        { id: 'b', type: 'unknown_type', data: {} },
        { id: 'c', type: 'text', data: { text: 42 } },
      ],
    };
    const html = renderToStaticMarkup(<GenerativeUIRenderer input={input} registry={registry} />);
    expect(html).toContain('Visible');
    expect(html).toContain('UNKNOWN_COMPONENT');
    expect(html).toContain('INVALID_DATA');
  });

  it('handles invalid documents safely with document fallback', () => {
    const registry = createGenerativeUIRegistry([text()]);
    const html = renderToStaticMarkup(<GenerativeUIRenderer input={{ version: 'bad' }} registry={registry} />);
    expect(html).toContain('INVALID_DOCUMENT');
  });
});
