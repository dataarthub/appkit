import { describe, expect, it, beforeEach, afterEach, vi } from 'bun:test';
import { S3StorageAdapter } from './s3-adapter';
import { R2StorageAdapter } from './r2-adapter';
import { S3ContentAdapter } from '../content/s3-content-adapter';

describe('S3 / R2 / Content Storage Integration Tests', () => {
  const originalFetch = globalThis.fetch;
  const store = new Map<string, { body: Uint8Array; headers: Record<string, string> }>();

  beforeEach(() => {
    store.clear();
    // Web standard mock fetch for S3 / R2 requests
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const parsedUrl = new URL(url);
      const key = parsedUrl.pathname.replace(/^\/[^/]+\/?/, ''); // strip bucket
      const method = init?.method || 'GET';

      // Verify SigV4 Authorization header is generated
      const headers = new Headers(init?.headers);
      const authHeader = headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('AWS4-HMAC-SHA256')) {
        return new Response('Unauthorized: Missing valid SigV4 signature', { status: 403 });
      }

      if (method === 'PUT') {
        let bodyBytes: Uint8Array;
        if (typeof init?.body === 'string') {
          bodyBytes = new TextEncoder().encode(init.body);
        } else if (init?.body instanceof Uint8Array) {
          bodyBytes = init.body;
        } else {
          bodyBytes = new Uint8Array();
        }
        const storedHeaders: Record<string, string> = {
          'content-type': headers.get('content-type') || 'application/octet-stream',
        };
        headers.forEach((v, k) => {
          if (k.toLowerCase().startsWith('x-amz-meta-')) {
            storedHeaders[k.toLowerCase()] = v;
          }
        });
        store.set(key, {
          body: bodyBytes,
          headers: storedHeaders,
        });
        return new Response('', { status: 200 });
      }

      if (method === 'GET' && parsedUrl.searchParams.get('list-type') === '2') {
        const prefix = parsedUrl.searchParams.get('prefix') ?? '';
        const objects = [...store.keys()].filter(key => key.startsWith(prefix)).map(key => `<Contents><Key>${key}</Key><Size>${store.get(key)!.body.length}</Size></Contents>`).join('');
        return new Response(`<ListBucketResult><IsTruncated>false</IsTruncated>${objects}</ListBucketResult>`);
      }
      if (method === 'GET') {
        const item = store.get(key);
        if (!item) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(item.body as any, {
          status: 200,
          headers: item.headers,
        });
      }

      if (method === 'HEAD') {
        const item = store.get(key);
        if (!item) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(null, {
          status: 200,
          headers: {
            'Content-Length': String(item.body.byteLength),
            ...item.headers,
          },
        });
      }

      if (method === 'DELETE') {
        store.delete(key);
        return new Response(null, { status: 204 });
      }

      return new Response('Method Not Allowed', { status: 405 });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('handles binary uploads, downloads and Japanese text roundtrip with S3StorageAdapter', async () => {
    const s3 = new S3StorageAdapter({
      region: 'ap-northeast-1',
      bucket: 'my-bucket',
      accessKeyId: 'AKIATEST',
      secretAccessKey: 'secretTestKey',
    });

    // 1. Upload Japanese text as string
    const japaneseText = 'こんにちは世界！東京の天気は晴れです。';
    const uploadRes = await s3.upload('docs/hello.txt', japaneseText, {
      contentType: 'text/plain; charset=utf-8',
      metadata: {
        author: '山田',
        encodedLiteral: 'literal%20value',
      },
    });
    expect(uploadRes.key).toBe('docs/hello.txt');

    // 2. Download and decode with TextDecoder
    const downloadedBytes = await s3.download('docs/hello.txt');
    expect(downloadedBytes).not.toBeNull();
    const restoredText = new TextDecoder().decode(downloadedBytes!);
    expect(restoredText).toBe(japaneseText);

    // 2b. Head object and verify Japanese metadata is preserved and literal%20value is NOT corrupted
    const headRes = await s3.head('docs/hello.txt');
    expect(headRes).not.toBeNull();
    expect(headRes?.metadata?.author).toBe('山田');
    expect(headRes?.metadata?.encodedliteral).toBe('literal%20value');

    // 3. Upload binary (Uint8Array with non-ASCII bytes)
    const binaryData = new Uint8Array([0x00, 0xff, 0xfe, 0x12, 0x34, 0x56]);
    await s3.upload('binary/blob.dat', binaryData, { contentType: 'application/octet-stream' });
    const downloadedBin = await s3.download('binary/blob.dat');
    expect(downloadedBin).toEqual(binaryData);
  });

  it('handles ReadableStream upload in R2StorageAdapter', async () => {
    const r2 = new R2StorageAdapter({
      accountId: 'account-123',
      bucket: 'r2-bucket',
      accessKeyId: 'r2Key',
      secretAccessKey: 'r2Secret',
    });

    const chunk1 = new TextEncoder().encode('Stream ');
    const chunk2 = new TextEncoder().encode('Data');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    await r2.upload('streamed.txt', stream, { contentType: 'text/plain' });
    const downloaded = await r2.download('streamed.txt');
    expect(downloaded).not.toBeNull();
    expect(new TextDecoder().decode(downloaded!)).toBe('Stream Data');
  });

  it('handles S3ContentAdapter JSON and Markdown CRUD with Japanese frontmatter', async () => {
    const s3 = new S3StorageAdapter({
      region: 'ap-northeast-1',
      bucket: 'content-bucket',
      accessKeyId: 'AKIATEST',
      secretAccessKey: 'secretTestKey',
    });

    // 1. JSON format CRUD
    const jsonAdapter = new S3ContentAdapter({
      storage: s3,
      format: 'json',
      keyPrefix: 'articles/',
    });

    const jsonItem = {
      slug: 'intro-post',
      contentType: 'post',
      title: 'はじめての投稿',
      status: 'published' as const,
      body: 'テストコンテンツ本文',
      tags: ['テスト', 'AI'],
      publishedAt: '2026-10-15T00:00:00Z',
    };

    await jsonAdapter.save(jsonItem);
    const fetchedJson = await jsonAdapter.get('intro-post');
    expect(fetchedJson).not.toBeNull();
    expect(fetchedJson?.title).toBe('はじめての投稿');
    expect(fetchedJson?.tags).toEqual(['テスト', 'AI']);
    expect(fetchedJson?.body).toBe('テストコンテンツ本文');

    const jsonList = await jsonAdapter.list();
    expect(jsonList.length).toBe(1);
    expect(jsonList[0].slug).toBe('intro-post');

    await jsonAdapter.delete('intro-post');
    expect(await jsonAdapter.get('intro-post')).toBeNull();

    // 2. Markdown format CRUD with Japanese frontmatter
    const mdAdapter = new S3ContentAdapter({
      storage: s3,
      format: 'markdown',
      keyPrefix: 'blog/',
    });

    const mdItem = {
      slug: 'markdown-guide',
      contentType: 'guide',
      title: 'Markdown記法ガイド',
      description: '日本語フロントマターのテスト',
      status: 'draft' as const,
      body: '# 見出し1\n\n本文内容です。',
      tags: ['ガイド', 'ドキュメント'],
    };

    await mdAdapter.save(mdItem);
    const fetchedMd = await mdAdapter.get('markdown-guide');
    expect(fetchedMd).not.toBeNull();
    expect(fetchedMd?.title).toBe('Markdown記法ガイド');
    expect(fetchedMd?.description).toBe('日本語フロントマターのテスト');
    expect(fetchedMd?.body).toContain('# 見出し1');
    expect(fetchedMd?.tags).toEqual(['ガイド', 'ドキュメント']);

    const mdList = await mdAdapter.list();
    expect(mdList.some((i) => i.slug === 'markdown-guide')).toBe(true);

    await mdAdapter.delete('markdown-guide');
    expect(await mdAdapter.get('markdown-guide')).toBeNull();
  });

  it('generates exact deterministic presigned SigV4 URLs matching AWS canonical request specification', async () => {
    const s3 = new S3StorageAdapter({
      region: 'us-east-1',
      bucket: 'example-bucket',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    });

    const fixedDate = new Date('2026-10-16T00:00:00.000Z');
    const OriginalDate = globalThis.Date;
    class MockDate extends OriginalDate {
      constructor(...args: [any?]) {
        super(...(args as [any]));
        if (args.length === 0) {
          return fixedDate as any;
        }
      }
      static override now() {
        return fixedDate.getTime();
      }
      override toISOString() {
        return fixedDate.toISOString();
      }
    }
    globalThis.Date = MockDate as any;

    try {
      const url = await s3.getUrl('test/photo.jpg', {
        expiresIn: 3600,
        downloadFilename: 'download.jpg',
      });

      const expectedExactUrl =
        'https://example-bucket.s3.us-east-1.amazonaws.com/test/photo.jpg' +
        '?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
        '&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD' +
        '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20261016%2Fus-east-1%2Fs3%2Faws4_request' +
        '&X-Amz-Date=20261016T000000Z' +
        '&X-Amz-Expires=3600' +
        '&X-Amz-SignedHeaders=host' +
        '&response-content-disposition=attachment%3B%20filename%3D%22download.jpg%22' +
        '&X-Amz-Signature=9132edd165115a29c3a00a4ec5d9016c0f126a607d2c29da954e23d0b57e799c';

      expect(url).toBe(expectedExactUrl);
    } finally {
      globalThis.Date = OriginalDate;
    }
  });

  it('handles HTTP errors safely during download and head', async () => {
    const s3 = new S3StorageAdapter({
      region: 'us-east-1',
      bucket: 'err-bucket',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });

    // 1. 404 Not Found returns null
    const notFound = await s3.download('missing.txt');
    expect(notFound).toBeNull();

    const notFoundHead = await s3.head('missing.txt');
    expect(notFoundHead).toBeNull();

    // 2. Non-404 HTTP errors (403 Forbidden, 500 Server Error) throw meaningful errors
    const errorFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'HEAD') {
        return new Response('Forbidden', { status: 403 });
      }
      return new Response('Internal Server Error', { status: 500 });
    }) as unknown as typeof fetch;

    globalThis.fetch = errorFetch;
    await expect(s3.download('restricted.txt')).rejects.toThrow('S3 GET failed with status 500');
    await expect(s3.head('restricted.txt')).rejects.toThrow('S3 HEAD failed with status 403');
  });
});
