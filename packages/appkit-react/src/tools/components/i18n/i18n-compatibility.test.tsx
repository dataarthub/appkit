// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import en from '../../../../messages/en.json';
import ja from '../../../../messages/ja.json';
import zh from '../../../../messages/zh.json';
import * as m from '../../paraglide/messages.js';
import { LanguageSwitcher } from './LanguageSwitcher';

afterEach(cleanup);

for (const [locale, catalog] of Object.entries({ en, ja, zh })) {
  test(`${locale} translations preserve all catalog text and interpolated inputs`, () => {
    for (const [id, text] of Object.entries(catalog)) {
      if (id === '$schema') continue;
      const translate = m[id as keyof typeof m] as (
        inputs: Record<string, string | number>,
        options: { locale: string },
      ) => string;
      for (const sample of [2, '<sample>']) {
        const inputs = Object.fromEntries(
          [...text.matchAll(/\{(\w+)\}/g)].map(([, key]) => [key, sample]),
        );
        expect(translate(inputs, { locale }), `${locale}:${id}`).toBe(
          text.replace(/\{(\w+)\}/g, (_match, key) => String(inputs[key])),
        );
      }
    }
  });
}

for (const [currentLanguage, label, next] of [
  ['ja', '日本語', 'en'],
  ['en', 'English', 'ja'],
  ['zh', '中文', 'ja'],
] as const) {
  test(`controlled language switch from ${currentLanguage} preserves the host callback`, () => {
    const onLanguageChange = vi.fn();
    const view = render(
      <LanguageSwitcher
        currentLanguage={currentLanguage}
        onLanguageChange={onLanguageChange}
      />,
    );
    fireEvent.click(view.getByRole('button', { name: label }));
    expect(onLanguageChange).toHaveBeenCalledExactlyOnceWith(next);
  });
}
