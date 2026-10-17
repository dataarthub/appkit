import { afterEach, expect, test } from 'bun:test';
import { S3StorageAdapter } from './s3-adapter';
import { R2StorageAdapter } from './r2-adapter';
import { OCIStorageAdapter } from './oci-adapter';
import { zipStored } from './zip';
const fetchBefore = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchBefore; });
const config = { region: 'us-east-1', bucket: 'test', accessKeyId: 'key', secretAccessKey: 'secret' };
const adapters = () => [new S3StorageAdapter(config), new R2StorageAdapter({ ...config, accountId: 'account' }), new OCIStorageAdapter({ ...config, namespace: 'namespace' })];
const mockFetch = (fn: (url: string, init: RequestInit) => Response | Promise<Response>) => { globalThis.fetch = ((url, init) => Promise.resolve(fn(String(url), init ?? {}))) as typeof fetch; };
test('all remote moves reject embedded copy errors and never delete the source', async () => {
  for (const payload of ['<Error><Code>InternalError</Code></Error>', '<CopyObjectResult/>', '']) {
    const methods: string[] = [];
    mockFetch((_url, init) => { methods.push(init.method!); return new Response(payload, { status: 200 }); });
    for (const adapter of adapters()) await expect(adapter.move('from', 'to')).rejects.toThrow('COPY');
    expect(methods).not.toContain('DELETE');
  }
});
test('a valid copy requires the destination and matching ETag before a move deletes', async () => {
  for (const head of [404, 200]) {
    const methods: string[] = [];
    mockFetch((_url, init) => { methods.push(init.method!); return init.method === 'PUT' ? new Response('<CopyObjectResult><ETag>"new"</ETag></CopyObjectResult>') : new Response(null, { status: head, headers: { etag: '"old"' } }); });
    await expect(new S3StorageAdapter(config).move('from', 'to')).rejects.toThrow('confirmed');
    expect(methods).not.toContain('DELETE');
  }
});
test('move preserves the confirmed copy but reports source deletion failure; same-key moves never delete', async () => {
  mockFetch((_url, init) => init.method === 'PUT' ? new Response('<CopyObjectResult><ETag>"new"</ETag></CopyObjectResult>') : new Response(null, { status: init.method === 'DELETE' ? 403 : 200, headers: { etag: '"new"' } }));
  for (const adapter of adapters()) await expect(adapter.move('from', 'to')).rejects.toThrow('deletion failed');
  const methods: string[] = []; mockFetch((_url, init) => { methods.push(init.method!); return new Response(null, { headers: { etag: '"same"' } }); });
  for (const adapter of adapters()) expect((await adapter.move('same', 'same')).key).toBe('same');
  expect(methods).toEqual(['HEAD', 'HEAD', 'HEAD']);
});
test('Object Lock uploads include a signed SHA256 checksum of the actual body', async () => {
  mockFetch((_url, init) => {
    const h = new Headers(init.headers);
    expect(h.get('x-amz-sdk-checksum-algorithm')).toBe('SHA256');
    expect(h.get('x-amz-checksum-sha256')).toBe('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
    expect(h.get('authorization')).toContain('x-amz-checksum-sha256');
    expect(h.get('authorization')).toContain('x-amz-object-lock-retain-until-date');
    return new Response(null);
  });
  await new S3StorageAdapter({ ...config, objectLockEnabled: true }).upload('locked', 'abc');
});
test('metadata preserves Japanese, percent escapes, empty strings and literal b64 prefixes', async () => {
  let headers = new Headers();
  mockFetch((_url, init) => { if (init.method === 'PUT') headers = new Headers(init.headers); return new Response(null, { headers }); });
  const metadata = { jp: '日本語', percent: 'literal%20value', empty: '', prefix: 'b64:aGVsbG8=', invalid: 'b64:not!base64' };
  const adapter = new S3StorageAdapter(config); await adapter.upload('data', 'abc', { metadata });
  expect((await adapter.head('data'))?.metadata).toEqual({ ...metadata, 'x-sha256': 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' });
});
test('bulk export returns a real UTF8 ZIP containing the bytes, with standard CRC32 and central directory', async () => {
  const data = new TextEncoder().encode('123456789');
  const zip = zipStored([{ key: '日本語.txt', data }]); const view = new DataView(zip.buffer);
  expect(view.getUint32(0, true)).toBe(0x04034b50); expect(view.getUint32(14, true)).toBe(0xcbf43926);
  const nameLength = view.getUint16(26, true); expect(new TextDecoder().decode(zip.slice(30, 30 + nameLength))).toBe('日本語.txt');
  expect(zip.slice(30 + nameLength, 30 + nameLength + data.length)).toEqual(data);
  const end = zip.length - 22; expect(view.getUint32(end, true)).toBe(0x06054b50); expect(view.getUint16(end + 10, true)).toBe(1);
  expect(view.getUint32(view.getUint32(end + 16, true), true)).toBe(0x02014b50);
  expect(() => zipStored([{ key: '../escape', data }])).toThrow('Unsafe');
});

test('numeric XML ETags confirm real-compatible copies without decoding escaped text twice', async () => {
  const methods: string[] = [];
  mockFetch((_url, init) => {
    methods.push(init.method!);
    return init.method === 'PUT'
      ? new Response('<CopyObjectResult><ETag>&#34;copied&#x22;</ETag></CopyObjectResult>')
      : new Response(null, { headers: { etag: '"copied"' } });
  });
  expect((await new S3StorageAdapter(config).move('source', 'destination')).etag).toBe('"copied"');
  expect(methods).toEqual(['PUT', 'HEAD', 'DELETE']);
  mockFetch(() => new Response('<ListBucketResult><Contents><Key>&amp;#34;</Key></Contents></ListBucketResult>'));
  expect((await new S3StorageAdapter(config).list()).objects[0]?.key).toBe('&#34;');
});
