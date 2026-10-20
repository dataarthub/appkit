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
認証プロバイダーコンポーネント。子コンポーネントに認証コンテキストを提供。

## Features
- SSR対応（ハイドレーションミスマッチ防止）
- TanStack Query統合
- 楽観的UI更新
- アダプターパターンによる複数バックエンド対応

## Import
\`\`\`tsx
import { AuthProvider, MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
\`\`\`

## Usage
\`\`\`tsx
const adapter = new MockAuthAdapter({ id: '1', email: 'user@example.com' });

<AuthProvider adapter={adapter}>
  <App />
</AuthProvider>
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
