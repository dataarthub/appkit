import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormView } from '../../src/tools/form';
import { DataAccessProvider } from '../../src/tools/data-access-react';
import type { DataAccessAdapter } from '@alneas/appkit-core/data';
import type { JSONSchema } from '@alneas/appkit-core/data';

// In-memory demonstration only. Replace with an authorized backend in your app.
const adapter: DataAccessAdapter = {
  find: async () => [],
  findOne: async () => null,
  count: async () => 0,
  create: async <T,>(_collection: string, data: Record<string, unknown>) =>
    ({ ...data, id: 'demo' }) as T,
  update: async <T,>(_collection: string, id: string, data: Record<string, unknown>) =>
    ({ ...data, id }) as T,
  delete: async <T,>() => true as T,
};
const schema: JSONSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: '名前 / Name', minLength: 1 } },
  required: ['name'],
};

/** In-memory form submission shared by docs and Storybook. */
export default function FormDemo() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [saved, setSaved] = useState('未保存 / Not saved');
  return (
    <QueryClientProvider client={client}>
      <DataAccessProvider adapter={adapter}>
        <FormView
          collection='demo'
          schema={schema}
          mode='create'
          onSuccess={(data) => setSaved(JSON.stringify(data))}
        />
        <output aria-live='polite'>{saved}</output>
      </DataAccessProvider>
    </QueryClientProvider>
  );
}
