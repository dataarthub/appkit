import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataAccessAdapter } from '@alneas/appkit-core/data';
import { DataAccessProvider } from '../src/tools/data-access-react';
import { AuthProvider, MockAuthAdapter } from '../src/tools/auth';

/** Fresh cache for each selected story; all adapters stay in memory. */
export function StoryQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  useEffect(() => () => {
    void client.cancelQueries();
    client.clear();
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function StoryAuthProvider({ children }: { children: ReactNode }) {
  const [adapter] = useState(() => new MockAuthAdapter());
  return <AuthProvider adapter={adapter}>{children}</AuthProvider>;
}

export function StoryDataProvider({ children }: { children: ReactNode }) {
  const [adapter] = useState<DataAccessAdapter>(() => {
    const records = new Map<string, Record<string, unknown>>([
      ['user-1', { id: 'user-1', name: 'Jane Doe', email: 'jane@example.test', age: 30 }],
    ]);
    return {
      find: async <T,>() => [...records.values()] as T[],
      findOne: async <T,>(_collection: string, id: string) => (records.get(id) ?? null) as T | null,
      count: async () => records.size,
      create: async <T,>(_collection: string, data: Record<string, unknown>) => {
        const id = `story-${records.size + 1}`;
        const record = { ...data, id };
        records.set(id, record);
        return record as T;
      },
      update: async <T,>(_collection: string, id: string, data: Record<string, unknown>) => {
        const record = { ...records.get(id), ...data, id };
        records.set(id, record);
        return record as T;
      },
      delete: async <T,>(_collection: string, id: string) => records.delete(id) as T,
    };
  });
  return <DataAccessProvider adapter={adapter}>{children}</DataAccessProvider>;
}
