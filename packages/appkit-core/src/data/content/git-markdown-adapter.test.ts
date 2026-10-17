import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitMarkdownAdapter } from './git-markdown-adapter';
test('Git Markdown round-trips content and rejects traversal and symlink escapes', async () => {
  const base = fileURLToPath(new URL('../../.verification/tmp/', import.meta.url));
  await mkdir(base, { recursive: true });
  const session = await mkdtemp(path.join(base, 'markdown-'));
  try {
    const repo = path.join(session, 'repo');
    await mkdir(path.join(repo, 'content'), { recursive: true });
    const adapter = new GitMarkdownAdapter({ repoPath: repo, contentDir: 'content', autoCommit: false });
    await adapter.save({ slug: 'hello', title: '日本語', body: 'Hello\n', contentType: 'post', status: 'draft' });
    expect((await adapter.get('hello'))?.title).toBe('日本語');
    expect((await adapter.list()).map(item => item.slug)).toEqual(['hello']);
    for (const slug of ['../outside', '/absolute', '.git/config', 'a\\b']) {
      await expect(adapter.save({ slug, title: 'Bad', contentType: 'post', status: 'draft', body: 'no' })).rejects.toThrow('Unsafe path');
    }
    const outside = path.join(session, 'outside.md');
    await writeFile(outside, 'retained');
    await symlink(outside, path.join(repo, 'content', 'escape.md'));
    await expect(adapter.get('escape')).rejects.toThrow();
    expect(await readFile(outside, 'utf8')).toBe('retained');
    await adapter.delete('hello'); expect(await adapter.get('hello')).toBeNull();
  } finally { await rm(session, { recursive: true, force: true }); }
});
