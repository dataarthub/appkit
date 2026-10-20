import { useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import type { DataAccessAdapter, Filter, QueryOptions } from '@alneas/appkit-core/data';
import {
  AuthProvider, UserProfileProvider,
  type AuthAdapter, type ProfileAdapter,
} from '../../src/tools/auth';
import { DataAccessProvider } from '../../src/tools/data-access-react';
import { FileBrowser } from '../../src/tools/components/file-browser/FileBrowser';
import type { FileProvider } from '../../src/tools/components/file-browser/types';

import {
  endpoint, sessionSchema, profileSchema, profileResponseSchema, recordSchema,
  recordsSchema, failureSchema, fileSchema, filesSchema,
  type Profile, type VerificationDomain, type VerificationState,
} from './http-handlers';
export { stateHandlers, verificationStates, type VerificationDomain, type VerificationState, type StoryRecord } from './http-handlers';

function jsonInit(method: string, value: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}

function adapters(base: string) {
  // Auth/ProfileAdapter have no AbortSignal argument. Give every request a host
  // lifetime as well as any data-query signal, so a story unmount cannot leave
  // in-flight identity/profile work running against the next story's handlers.
  let lifetime = new AbortController();
  const hostFetch = (path: string, init?: RequestInit) => fetch(path, {
    ...init,
    signal: init?.signal ? AbortSignal.any([lifetime.signal, init.signal]) : lifetime.signal,
  });
  const request = async (path: string, init?: RequestInit): Promise<unknown> => {
    const response = await hostFetch(path, init);
    if (!response.ok) throw new Error(failureSchema.parse(await response.json()).message);
    return response.status === 204 ? undefined : response.json();
  };
  const auth: AuthAdapter = {
    getCurrentUser: async () => {
      const response = await hostFetch(`${base}/session`);
      if (response.status === 401) {
        failureSchema.parse(await response.json());
        return null;
      }
      if (!response.ok) throw new Error(failureSchema.parse(await response.json()).message);
      return sessionSchema.parse(await response.json()).user;
    },
    login: async (email, password) => sessionSchema.parse(await request(`${base}/login`, jsonInit('POST', { email, password }))).user!,
    register: async (email, password, data) => sessionSchema.parse(await request(`${base}/register`, jsonInit('POST', { email, password, ...data }))).user!,
    logout: async () => { await request(`${base}/logout`, { method: 'POST' }); },
    resetPassword: async email => { await request(`${base}/reset-password`, jsonInit('POST', { email })); },
    updateEmail: async email => { await request(`${base}/email`, jsonInit('PUT', { email })); },
    updatePassword: async password => { await request(`${base}/password`, jsonInit('PUT', { password })); },
    // This host adapter uses request/response sessions and has no push channel.
    // AuthProvider still owns session reads and publishes login/logout results.
    onAuthStateChanged: () => () => {},
  };
  const profile: ProfileAdapter<Profile> = {
    tableName: `${base}/profiles`,
    get: async id => profileResponseSchema.parse(await request(`${base}/profiles/${id}`)).profile,
    create: async (id, user, data) => profileSchema.parse(await request(`${base}/profiles/${id}`, jsonInit('POST', { ...user, ...data, id }))),
    update: async (id, data) => profileSchema.parse(await request(`${base}/profiles/${id}`, jsonInit('PATCH', data))),
    delete: async id => { await request(`${base}/profiles/${id}`, { method: 'DELETE' }); },
  };
  const data: DataAccessAdapter = {
    find: async <T,>(collection: string, filter?: Filter, options?: QueryOptions) => {
      const query = new URLSearchParams({ filter: JSON.stringify(filter ?? {}), options: JSON.stringify({ ...options, signal: undefined }) });
      return recordsSchema.parse(await request(`${base}/collections/${collection}?${query}`, { signal: options?.signal })) as T[];
    },
    findOne: async <T,>(collection: string, id: string, options?: QueryOptions) => recordSchema.nullable().parse(await request(`${base}/collections/${collection}/${id}`, { signal: options?.signal })) as T | null,
    count: async collection => z.number().int().nonnegative().parse(await request(`${base}/collections/${collection}/count`)),
    create: async <T,>(collection: string, value: Record<string, unknown>) => recordSchema.parse(await request(`${base}/collections/${collection}`, jsonInit('POST', value))) as T,
    update: async <T,>(collection: string, id: string, value: Record<string, unknown>) => recordSchema.parse(await request(`${base}/collections/${collection}/${id}`, jsonInit('PATCH', value))) as T,
    delete: async <T,>(collection: string, id: string) => z.boolean().parse(await request(`${base}/collections/${collection}/${id}`, { method: 'DELETE' })) as T,
  };
  const files: FileProvider = {
    listNodes: async path => filesSchema.parse(await request(`${base}/files?path=${encodeURIComponent(path)}`)),
    searchNodes: async criteria => z.array(fileSchema).parse(await request(`${base}/files/search?query=${encodeURIComponent(criteria.query ?? '')}`)),
    getUrl: async node => z.string().parse(await request(`${base}/files/${node.id}/url`)),
    uploadFile: async (path, file, name) => fileSchema.parse(await request(`${base}/files?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`, { method: 'POST', body: file })),
    createFolder: async (path, name) => fileSchema.parse(await request(`${base}/folders`, jsonInit('POST', { path, name }))),
    deleteNodes: async ids => { await request(`${base}/files`, jsonInit('DELETE', { ids })); },
    renameNode: async (id, name) => fileSchema.parse(await request(`${base}/files/${id}`, jsonInit('PATCH', { name }))),
    moveNode: async (id, path) => fileSchema.parse(await request(`${base}/files/${id}`, jsonInit('PATCH', { path }))),
    updateMetadata: async (id, metadata) => fileSchema.parse(await request(`${base}/files/${id}`, jsonInit('PATCH', { metadata }))),
  };
  return {
    auth, profile, data, files,
    activate: () => { if (lifetime.signal.aborted) lifetime = new AbortController(); },
    dispose: () => lifetime.abort(),
  };
}

export function FetchFileBrowser({ state }: { state: VerificationState }) {
  const [host] = useState(() => adapters(endpoint('file-browser', state)));
  useEffect(() => {
    host.activate();
    return host.dispose;
  }, [host]);
  return <div data-testid='verified-file-browser' className='h-[32rem]'><FileBrowser provider={host.files} initialViewMode='list' /></div>;
}

export function HttpProviders({ domain, state, children }: { domain: VerificationDomain; state: VerificationState; children: ReactNode }) {
  const [host] = useState(() => adapters(endpoint(domain, state)));
  useEffect(() => {
    host.activate();
    return host.dispose;
  }, [host]);
  return <AuthProvider adapter={host.auth}>
    <UserProfileProvider adapter={host.profile} createIfNotExists={false}>
      <DataAccessProvider adapter={host.data}>{children}</DataAccessProvider>
    </UserProfileProvider>
  </AuthProvider>;
}
