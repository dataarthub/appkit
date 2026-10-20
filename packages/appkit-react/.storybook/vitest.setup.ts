import { afterEach, beforeEach, vi } from 'vitest';

const errors: string[] = [];
window.addEventListener('error', event => errors.push(String(event.error ?? event.message)));
window.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));

beforeEach(() => {
  errors.length = 0;
  localStorage.clear();
  const originalFetch = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (...args) => {
    const response = await originalFetch(...args);
    if (response.status >= 500) errors.push(`HTTP ${response.status}: ${response.url}`);
    return response;
  });
  const original = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args.map(String).join(' '));
    original(...args);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  const found = errors.splice(0);
  if (found.length) throw new Error(`Browser errors:\n${found.join('\n')}`);
});
