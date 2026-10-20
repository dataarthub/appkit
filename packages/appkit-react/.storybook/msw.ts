import { setupWorker } from 'msw/browser';
import { resolveHandlers, type HandlerConfiguration } from './msw-handlers';
import type { Loader } from '@storybook/react-vite';

// Use MSW's public lifecycle API (the older addon accessed removed internals).
const worker = setupWorker();
let ready: ReturnType<typeof worker.start> | undefined;
export const mswLoader: Loader = async ({ parameters }) => {
  await (ready ??= worker.start({ onUnhandledRequest: 'error', quiet: true }));
  worker.resetHandlers();
  const handlers = resolveHandlers(parameters.msw?.handlers as HandlerConfiguration);
  if (handlers.length) worker.use(...handlers);
  return {};
};
