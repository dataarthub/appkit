import { http, HttpResponse, delay } from 'msw';
import { z } from 'zod';
import { UserSchema } from '../../src/tools/components/auth/types';

export const verificationStates = ['loading', 'success', 'empty', 'error', 'signed-out', 'restricted', 'privileged'] as const;
export type VerificationState = typeof verificationStates[number];
export type VerificationDomain = 'data-table' | 'auth-profile' | 'form-view' | 'file-browser';

// Appkit has host-supplied adapters rather than a hosted identity protocol. These
// story-only HTTP contracts implement the public adapter interfaces; they make no
// claims about any vendor's identity API or server authorization implementation.
export const sessionSchema = z.object({ user: UserSchema.nullable() });
export const profileSchema = z.object({ id: z.string(), email: z.email(), role: z.enum(['editor', 'viewer', 'admin']) });
export const profileResponseSchema = z.object({ profile: profileSchema.nullable() });
export const recordSchema = z.object({ id: z.string(), name: z.string().min(1), status: z.enum(['Active', 'Draft']) });
export const recordsSchema = z.array(recordSchema);
export const failureSchema = z.object({ message: z.string().min(1) });
export const fileSchema = z.object({ id: z.string(), name: z.string(), kind: z.enum(['file', 'folder']), contentType: z.string().optional(), size: z.number().nonnegative().optional() });
export const filesSchema = z.object({ nodes: z.array(fileSchema), hasMore: z.boolean() });
export type Profile = z.infer<typeof profileSchema>;
export type StoryRecord = z.infer<typeof recordSchema>;

export function endpoint(domain: VerificationDomain, state: VerificationState) {
  return `/__appkit_verification__/${domain}/${state}`;
}

/** Fresh handlers per story: only transport changes; real providers run normally. */
export function stateHandlers(domain: VerificationDomain, state: VerificationState, options: { rejectFirstSave?: boolean; origin?: string } = {}) {
  const base = `${options.origin ?? ''}${endpoint(domain, state)}`;
  const role = state === 'restricted' ? 'viewer' : state === 'privileged' ? 'admin' : 'editor';
  let user: z.infer<typeof UserSchema> | null = state === 'signed-out' ? null : UserSchema.parse({ id: 'story-user', email: 'editor@example.test', name: 'Aki Tanaka', role });
  let record: StoryRecord | null = state === 'empty' ? null : recordSchema.parse({ id: 'record-1', name: 'Acoustic survey', status: 'Active' });
  let saveAttempts = 0;
  let searchReads = 0;
  const rejectUnauthorized = () => !user
    ? HttpResponse.json(failureSchema.parse({ message: 'Sign in required' }), { status: 401 })
    : role === 'viewer'
      ? HttpResponse.json(failureSchema.parse({ message: 'Record access denied' }), { status: 403 })
      : undefined;
  return [
    http.get(`${base}/session`, async () => {
      if (domain === 'auth-profile' && state === 'loading') await delay('infinite');
      if (domain === 'auth-profile' && state === 'error') return HttpResponse.json(failureSchema.parse({ message: 'Session verification failed' }), { status: 422 });
      if (!user) return HttpResponse.json(failureSchema.parse({ message: 'Sign in required' }), { status: 401 });
      return HttpResponse.json(sessionSchema.parse({ user }));
    }),
    http.post(`${base}/login`, async ({ request: incoming }) => {
      const credentials = z.object({ email: z.email(), password: z.string().min(8) }).parse(await incoming.json());
      user = UserSchema.parse({ id: 'story-user', email: credentials.email, name: 'Aki Tanaka', role: 'editor' });
      return HttpResponse.json(sessionSchema.parse({ user }));
    }),
    http.post(`${base}/logout`, () => {
      user = null;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${base}/profiles/:id`, ({ params }) => {
      if (!user || params.id !== user.id) return HttpResponse.json(failureSchema.parse({ message: 'Profile access denied' }), { status: 403 });
      const profile = domain === 'auth-profile' && state === 'empty' ? null : profileSchema.parse({ id: user.id, email: user.email, role });
      return HttpResponse.json(profileResponseSchema.parse({ profile }));
    }),
    http.get(`${base}/collections/records`, async ({ request: incoming }) => {
      if (!user) return HttpResponse.json(failureSchema.parse({ message: 'Sign in required' }), { status: 401 });
      if (role === 'viewer') return HttpResponse.json(failureSchema.parse({ message: 'Record access denied' }), { status: 403 });
      if (state === 'loading') await delay('infinite');
      // A deliberate application rejection keeps the browser's unexpected-5xx
      // guard active, including while testing the component's real error branch.
      if (state === 'error') return HttpResponse.json(failureSchema.parse({ message: 'Records could not be loaded' }), { status: 422 });
      const query = new URL(incoming.url).searchParams;
      z.record(z.string(), z.unknown()).parse(JSON.parse(query.get('filter') ?? '{}'));
      z.object({ sort: z.record(z.string(), z.number()).optional() }).passthrough().parse(JSON.parse(query.get('options') ?? '{}'));
      return HttpResponse.json(recordsSchema.parse(state === 'empty' ? [] : [
        { id: 'record-1', name: 'Acoustic survey', status: 'Active' },
        { id: 'record-2', name: 'Design review', status: 'Draft' },
      ]));
    }),
    http.get(`${base}/collections/records/:id`, async ({ params }) => {
      const denied = rejectUnauthorized();
      if (denied) return denied;
      if (state === 'loading') await delay('infinite');
      if (state === 'error') return HttpResponse.json(failureSchema.parse({ message: 'Record could not be loaded' }), { status: 422 });
      return HttpResponse.json(recordSchema.nullable().parse(params.id === 'record-1' ? record : null));
    }),
    http.patch(`${base}/collections/records/:id`, async ({ params, request: incoming }) => {
      const denied = rejectUnauthorized();
      if (denied) return denied;
      const data = recordSchema.omit({ id: true }).partial().parse(await incoming.json());
      saveAttempts += 1;
      if (options.rejectFirstSave && saveAttempts === 1) return HttpResponse.json(failureSchema.parse({ message: 'Project name could not be saved. Try again.' }), { status: 422 });
      record = recordSchema.parse({ ...record, ...data, id: params.id });
      return HttpResponse.json(record);
    }),
    http.post(`${base}/collections/records`, async ({ request: incoming }) => {
      const denied = rejectUnauthorized();
      if (denied) return denied;
      const data = recordSchema.omit({ id: true }).parse(await incoming.json());
      record = recordSchema.parse({ ...data, id: 'record-1' });
      return HttpResponse.json(record, { status: 201 });
    }),
    http.delete(`${base}/collections/records/:id`, ({ params }) => {
      const denied = rejectUnauthorized();
      if (denied) return denied;
      const removed = record?.id === params.id;
      if (removed) record = null;
      return HttpResponse.json(z.boolean().parse(removed));
    }),
    http.get(`${base}/files`, async ({ request: incoming }) => {
      const denied = rejectUnauthorized();
      if (denied) return denied;
      z.string().parse(new URL(incoming.url).searchParams.get('path'));
      if (state === 'loading') await delay('infinite');
      if (state === 'error') return HttpResponse.json(failureSchema.parse({ message: 'Files could not be loaded' }), { status: 422 });
      return HttpResponse.json(filesSchema.parse({ nodes: state === 'empty' ? [] : [
        { id: 'file-1', name: 'Survey notes.txt', kind: 'file', contentType: 'text/plain', size: 42 },
        { id: 'folder-1', name: 'Design documents', kind: 'folder' },
      ], hasMore: false }));
    }),
    http.get(`${base}/files/search`, ({ request: incoming }) => {
      const denied = rejectUnauthorized();
      if (denied) return denied;
      const query = z.string().parse(new URL(incoming.url).searchParams.get('query'));
      searchReads += 1;
      return HttpResponse.json(z.array(fileSchema).parse([
        { id: 'file-1', name: searchReads > 1 ? 'Survey notes (refreshed).txt' : 'Survey notes.txt', kind: 'file', contentType: 'text/plain', size: 42 },
        { id: 'folder-1', name: 'Design documents', kind: 'folder' },
      ].filter(file => file.name.toLowerCase().includes(query.toLowerCase()))));
    }),
  ];
}
