import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageAdapter } from './local-adapter';

describe('LocalStorageAdapter containment & path traversal protection', () => {
  let temp: string;
  let root: string;
  let outside: string;
  let storage: LocalStorageAdapter;

  beforeEach(async () => {
    temp = await realpath(await mkdtemp(join(tmpdir(), 'storage-security-')));
    root = join(temp, 'uploads');
    outside = join(temp, 'outside');
    await mkdir(root);
    await mkdir(outside);
    await writeFile(join(outside, 'secret.txt'), 'secret');
    storage = new LocalStorageAdapter({ baseDir: root, baseUrl: 'https://example.test/files/' });
    await storage.upload('safe.txt', 'safe');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(temp, { recursive: true, force: true });
  });

  async function rejectEveryMethod(key: string) {
    const operations = [
      () => storage.upload(key, 'attack'),
      () => storage.download(key),
      () => storage.delete(key),
      () => storage.exists(key),
      () => storage.head(key),
      () => storage.getUrl(key),
      () => storage.list({ prefix: key }),
      () => storage.copy(key, 'copy.txt'),
      () => storage.copy('safe.txt', key),
      () => storage.move(key, 'move.txt'),
      () => storage.move('safe.txt', key),
    ];
    for (const operation of operations) await expect(operation()).rejects.toThrow('Unsafe path');
    expect(await readFile(join(outside, 'secret.txt'), 'utf8')).toBe('secret');
  }

  it.each([
    '../outside/secret.txt',
    'a/../../outside/secret.txt',
    '/etc/passwd',
    '..\\outside\\secret.txt',
  ])('rejects escaping base directory: %s', async (key) => {
    await rejectEveryMethod(key);
  });

  it('performs basic file upload, download, and delete within root', async () => {
    await storage.upload('test/hello.txt', 'Hello World');
    expect(await storage.exists('test/hello.txt')).toBe(true);

    const buffer = await storage.download('test/hello.txt');
    expect(buffer).not.toBeNull();
    expect(new TextDecoder().decode(buffer!)).toBe('Hello World');

    await storage.delete('test/hello.txt');
    expect(await storage.exists('test/hello.txt')).toBe(false);
  });
});
