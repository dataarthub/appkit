import { realpathSync } from 'node:fs';
import { lstat } from 'node:fs/promises';
import * as path from 'node:path';

/** Reject ambiguous/non-relative paths before normalization. @internal */
export function validateRelativePath(value: string, allowEmpty = false): void {
  if (
    typeof value !== 'string' ||
    (!value && !allowEmpty) ||
    value.includes('\0') ||
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[a-z]:/i.test(value) ||
    value.split('/').some((part) => part === '..' || part === '.' || (!part && value !== ''))
  ) {
    throw new Error('Unsafe path: expected a relative path without dot segments');
  }
}

/**
 * Pins a trusted root (including a not-yet-created root) to an absolute physical
 * path. Every operation rejects symlinks in that path and below it, including
 * dangling links. An initial root alias is resolved once at construction.
 *
 * This is server-only. The root and its ancestors must not be concurrently
 * renamed or modified by untrusted OS users: portable Node path APIs cannot
 * provide an atomic openat-style directory walk. Hard links are also outside
 * this boundary; provision an application-owned directory with suitable ACLs.
 * @internal
 */
export class ContainedPathRoot {
  readonly root: string;

  /** Snapshot the physical root, resolving any existing ancestor once. */
  constructor(root: string) {
    if (typeof root !== 'string' || !root || root.includes('\0')) {
      throw new Error('Unsafe path: a root directory is required');
    }
    let ancestor = path.resolve(root);
    const missing: string[] = [];
    for (;;) {
      try {
        this.root = path.join(realpathSync(ancestor), ...missing);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        const parent = path.dirname(ancestor);
        if (parent === ancestor) throw error;
        missing.unshift(path.basename(ancestor));
        ancestor = parent;
      }
    }
  }

  /** Validate containment and reject symlinks before returning a filesystem path. */
  async resolve(relativePath: string, allowEmpty = false): Promise<string> {
    validateRelativePath(relativePath, allowEmpty);
    const target = path.resolve(this.root, relativePath);
    const relative = path.relative(this.root, target);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Unsafe path: outside configured root');
    }

    // Check ancestors too, so replacing the configured root cannot redirect I/O.
    const parsed = path.parse(target);
    let current = parsed.root;
    const parts = target.slice(parsed.root.length).split(path.sep).filter(Boolean);
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      try {
        const info = await lstat(current);
        if (info.isSymbolicLink()) throw new Error('Unsafe path: symbolic links are not allowed');
        if (index < parts.length - 1 && !info.isDirectory()) {
          throw new Error('Unsafe path: parent is not a directory');
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
        throw error;
      }
    }
    return target;
  }
}
