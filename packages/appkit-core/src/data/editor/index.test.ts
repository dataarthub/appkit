import { describe, it, expect } from 'bun:test';
import {
  serializeBlocksToJson,
  parseJsonToBlocks,
  createEditorUploadHandler,
} from './index';

describe('Editor JSON & Upload Handler', () => {
  it('serializes and parses valid BlockNote JSON document', () => {
    const blocks = [
      {
        id: 'block-1',
        type: 'paragraph',
        props: { textColor: 'default' },
        content: 'Hello world',
      },
      {
        id: 'block-2',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Section 1' }],
        children: [
          {
            id: 'block-2-sub',
            type: 'paragraph',
            content: 'Sub item',
          },
        ],
      },
    ];

    const json = serializeBlocksToJson(blocks);
    expect(typeof json).toBe('string');
    expect(json).toContain('Hello world');

    const parsed = parseJsonToBlocks(json);
    expect(parsed.length).toBe(2);
    expect(parsed[0].id).toBe('block-1');
    expect(parsed[1].children?.[0].id).toBe('block-2-sub');
  });

  it('throws on invalid block schema', () => {
    const invalidJson = JSON.stringify([{ notAValidBlock: 123 }]);
    expect(() => parseJsonToBlocks(invalidJson)).toThrow('Invalid BlockNote document JSON');
  });

  it('supports custom uploadFn in createEditorUploadHandler', async () => {
    const handler = createEditorUploadHandler({
      uploadFn: async (file) => `https://cdn.example.com/${file.name}`,
    });

    const file = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
    const url = await handler(file);
    expect(url).toBe('https://cdn.example.com/avatar.png');
  });

  it('supports presignedUrl upload flow in createEditorUploadHandler', async () => {
    const originalFetch = globalThis.fetch;
    let putCalled = false;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      putCalled = true;
      expect(init?.method).toBe('PUT');
      return new Response('', { status: 200 });
    }) as unknown as typeof fetch;

    try {
      const handler = createEditorUploadHandler({
        getPresignedUrl: async (file) => ({
          uploadUrl: `https://s3.example.com/upload/${file.name}`,
          publicUrl: `https://cdn.example.com/${file.name}`,
        }),
      });

      const file = new File(['image bytes'], 'photo.jpg', { type: 'image/jpeg' });
      const publicUrl = await handler(file);
      expect(putCalled).toBe(true);
      expect(publicUrl).toBe('https://cdn.example.com/photo.jpg');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
