const instanceScopes = new WeakMap<object, string>();

/** Opaque, runtime-local identity; never derives cache keys from credentials or user data. */
export function getAdapterCacheScope(adapter: object & { readonly cacheScope?: string }): string {
  if (adapter.cacheScope !== undefined) return `explicit:${adapter.cacheScope}`;
  return getInstanceCacheScope(adapter);
}

/** Stable identity for one object, including adapters with intentionally shared data scopes. */
export function getInstanceCacheScope(adapter: object): string {
  let scope = instanceScopes.get(adapter);
  if (!scope) {
    scope = `instance:${globalThis.crypto.randomUUID()}`;
    instanceScopes.set(adapter, scope);
  }
  return scope;
}
