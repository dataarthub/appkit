import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuthProvider } from '../../../src/tools/components/auth/AuthProvider';
import { MockAuthAdapter } from '../../../src/tools/components/auth/adapters/mock-adapter';
import { useAuth } from '../../../src/tools/components/auth/useAuth';

const meta = {
  title: 'Auth/AuthProvider',
  component: AuthProvider,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Provide authentication state to descendant components through an application-supplied adapter.

## Features
- Server-rendered initial state
- TanStack Query integration
- Optimistic UI updates
- Adapter-based backend integration

## Required setup

Requires QueryClientProvider from @tanstack/react-query. The mock adapter used here keeps authentication state in memory; it does not authenticate against a hosted service. Import @alneas/appkit-react/styles once in the host application; the Storybook preview supplies it here.

## Public import
\`\`\`tsx
import { AuthProvider, MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
\`\`\`

## Usage

For TypeScript hosts that check stylesheet side effects, include a global .d.ts file containing \`declare module '@alneas/appkit-react/styles';\` in tsconfig.json.

\`\`\`tsx
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
import '@alneas/appkit-react/styles';

export function MockAuthExample() {
  const [client] = useState(() => new QueryClient());
  const [adapter] = useState(() => new MockAuthAdapter());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider adapter={adapter}>
        <output>In-memory authentication demonstration</output>
      </AuthProvider>
    </QueryClientProvider>
  );
}
\`\`\`

        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AuthProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function AuthConsumer() {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <p>Authenticated as: {user.email}</p>
      <p>User ID: {user.id}</p>
    </div>
  );
}

export const Default: Story = {
  args: {
    adapter: new MockAuthAdapter(),
    children: <AuthConsumer />,
  },
};

export const WithUser: Story = {
  args: {
    adapter: new MockAuthAdapter({
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
    }),
    children: <AuthConsumer />,
  },
};

export const NotAuthenticated: Story = {
  args: {
    adapter: new MockAuthAdapter(null),
    children: <AuthConsumer />,
  },
};
