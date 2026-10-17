import { expect, test } from 'bun:test';
import { setupWatchChannel } from './watch';
test('watch registration sends only the application request and propagates server failures', async () => {
  const saved = globalThis.fetch;
  const mockFetch = (fn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) => {
    globalThis.fetch = Object.assign(fn, { preconnect: saved.preconnect });
  };
  const options = {
    calendarId: 'team',
    webhookUrl: 'https://example.test/hook',
    functionUrl: 'https://example.test/setup',
    accessToken: 'test-token',
  };
  try {
    mockFetch(async (url, init) => {
      expect(url).toBe(options.functionUrl);
      expect(init?.headers).toEqual({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      });
      expect(JSON.parse(init!.body as string)).toEqual({
        calendarId: 'team',
        webhookUrl: options.webhookUrl,
      });
      return Response.json({ channelId: 'c', resourceId: 'r', expiration: '42' });
    });
    expect(await setupWatchChannel(options)).toEqual({
      channelId: 'c',
      resourceId: 'r',
      expiration: '42',
    });
    mockFetch(async () => Response.json({ message: 'Denied' }, { status: 403 }));
    await expect(setupWatchChannel(options)).rejects.toThrow('Denied');
    mockFetch(async () => new Response('not-json', { status: 503 }));
    await expect(setupWatchChannel(options)).rejects.toThrow('Setup failed: 503');
  } finally {
    globalThis.fetch = saved;
  }
});
