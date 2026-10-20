const instanceScopes = new WeakMap<object, string>();

/**
 * Returns an explicit shared cache scope, or an opaque identity for this adapter object.
 * @param adapter - Object optionally declaring cacheScope. Every defined string, including an empty string, selects the explicit scope.
 * @returns `explicit:` followed by cacheScope when defined, otherwise the stable instance scope. Equal explicit strings deliberately share a scope; this is not an authorization boundary.
 * @throws Propagates property access failures or a missing/failing crypto.randomUUID when a new instance scope is needed.
 * @example
 * ```ts
 * import { getAdapterCacheScope } from '@alneas/appkit-core/data/cache-scope';
 * console.log(getAdapterCacheScope({ cacheScope: 'catalog' })); // 'explicit:catalog'
 * ```
 */
export function getAdapterCacheScope(adapter: object & {
  /** Explicit shared namespace; every defined string takes precedence over instance identity. */
  readonly cacheScope?: string;
}): string {
  if (adapter.cacheScope !== undefined) return `explicit:${adapter.cacheScope}`;
  return getInstanceCacheScope(adapter);
}

/**
 * Assigns an opaque identity to one object regardless of any explicit cacheScope property.
 * @param adapter - Object used as the WeakMap key; its fields are not inspected.
 * @returns The same `instance:` UUID string for repeated calls with the same object in this module instance. Other objects and other runtime/module instances have independent identities.
 * @throws Propagates a missing or failing crypto.randomUUID on the first call for an object.
 * @example
 * ```ts
 * import { getInstanceCacheScope } from '@alneas/appkit-core/data/cache-scope';
 * const adapter = {};
 * console.log(getInstanceCacheScope(adapter) === getInstanceCacheScope(adapter)); // true
 * ```
 */
export function getInstanceCacheScope(adapter: object): string {
  let scope = instanceScopes.get(adapter);
  if (!scope) {
    scope = `instance:${globalThis.crypto.randomUUID()}`;
    instanceScopes.set(adapter, scope);
  }
  return scope;
}
