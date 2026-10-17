import type { User } from './types';

/**
 * 楽観セッションキャッシュ（stale-while-revalidate）
 *
 * 認証は httpOnly クッキー等で実体を持つため、クライアントはセッション状態を知りません。
 * そのままだとリロードのたびにサーバー検証（whoami 等）が終わるまで画面がブロックされます。
 *
 * このモジュールは「最後に確定したセッション状態」を localStorage に保持し、
 * 次回ロード時に即座に描画（楽観表示）しつつ、裏で検証させるためのヘルパーです。
 *
 * 保存するのは表示用プロフィール（`User`）のみ。トークン等の機密は含めません。
 * クッキーが無効なら検証時に即座にログイン画面へフォールバックします。
 *
 * @example
 * ```ts
 * const cache = createSessionCache({ ttl: 7 * 24 * 60 * 60 * 1000 });
 * cache.write(user);   // ログイン成功 / 検証成功時
 * cache.writeLoggedOut(); // 明示的な未ログイン確定時
 * const hit = cache.read(); // { user: User|null, exp: number } | null
 * ```
 */

export interface SessionCacheEntry {
  /** 最後に確定したユーザー。null は「明示的に未ログイン」を意味する */
  user: User | null;
  /** 有効期限のエポックミリ秒 */
  exp: number;
}

export interface SessionCacheOptions {
  /** localStorage キー（デフォルト: dataarthub.auth.last-session） */
  key?: string;
  /** キャッシュの有効期間（ミリ秒）。デフォルト 7 日 */
  ttl?: number;
}

const DEFAULT_KEY = 'dataarthub.auth.last-session';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionCache {
  readonly key: string;
  read(): SessionCacheEntry | null;
  write(user: User | null): void;
  clear(): void;
  /** キャッシュが存在し、かつ未期限切れなら true */
  hasValid(): boolean;
}

/**
 *
 */
export function createSessionCache(options: SessionCacheOptions = {}): SessionCache {
  const key = options.key ?? DEFAULT_KEY;
  const ttl = options.ttl ?? DEFAULT_TTL;

  const read = (): SessionCacheEntry | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SessionCacheEntry;
      if (typeof parsed?.exp !== 'number') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const write = (user: User | null): void => {
    if (typeof window === 'undefined') return;
    try {
      const entry: SessionCacheEntry = { user, exp: Date.now() + ttl };
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      /* storage が無効 (private mode 等) でも致命的ではない */
    }
  };

  const clear = (): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  };

  return {
    key,
    read,
    write,
    clear,
    hasValid: () => {
      const hit = read();
      return hit != null && hit.exp > Date.now();
    },
  };
}

/**
 * 他タブでのログアウト/ログインを検知するための storage イベント監視。
 *
 * @returns クリーンアップ関数
 */
export function subscribeSessionCacheStorageEvent(
  key: string,
  onChanged: () => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === key) onChanged();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
