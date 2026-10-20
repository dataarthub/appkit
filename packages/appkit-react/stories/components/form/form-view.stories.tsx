import { StoryDataProvider } from '../../providers';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { FormView } from '../../../src/tools/components/form/form-view';
import { FormCompound } from '../../../src/tools/components/form/form-compound';
import { Button } from '../../../src/tools/components/ui/button';
import type { JSONSchema } from '../../../src/tools/lib/schema/types';

const meta = {
  decorators: [(Story) => <StoryDataProvider><Story /></StoryDataProvider>],
  title: 'Form/FormView',
  component: FormView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
DBフェッチ/更新付きフォームラッパーコンポーネント。

## Features
- useFindOne/useCreate/useUpdateを組み合わせたオールインワンフォーム
- スキーマベースの自動フォーム生成
- バリデーション（Ajv）
- 楽観的UI更新
- AI/E2Eテスト用データ属性

## AI/Automation Attributes
- \`data-testid\`: Container element
- \`data-status\`: loading | error | ready | submitting | success
- \`data-mode\`: create | edit
- \`data-variant\`: detail | stepper

## Import
\`\`\`tsx
import { FormView } from '@alneas/appkit-react/tools/form';
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSuccess: { action: 'success' },
    onCancel: { action: 'cancel' },
    onDeleteSuccess: { action: 'deleteSuccess' },
  },
} satisfies Meta<typeof FormView>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSchema: JSONSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: '名前',
    },
    email: {
      type: 'string',
      format: 'email',
      title: 'メールアドレス',
    },
    age: {
      type: 'integer',
      title: '年齢',
      minimum: 0,
      maximum: 150,
    },
    role: {
      type: 'string',
      title: '役割',
      enum: ['admin', 'user', 'guest'],
      'x-ui': { widget: 'select' },
    },
    bio: {
      type: 'string',
      title: '自己紹介',
      maxLength: 500,
      'x-ui': { widget: 'textarea' },
    },
  },
  required: ['name', 'email'],
};

export const Create: Story = {
  args: {
    collection: 'users',
    schema: sampleSchema,
    mode: 'create',
    variant: 'detail',
  },
};

export const Edit: Story = {
  args: {
    collection: 'users',
    schema: sampleSchema,
    mode: 'edit',
    variant: 'detail',
    id: 'user-1',
  },
};

export const Stepper: Story = {
  args: {
    collection: 'users',
    schema: {
      ...sampleSchema,
      'x-steps': [
        {
          name: 'step-1',
          title: '基本情報',
        },
        {
          name: 'step-2',
          title: '詳細',
        },
      ],
    },
    mode: 'create',
    variant: 'stepper',
  },
};

export const WithDelete: Story = {
  args: {
    collection: 'users',
    schema: sampleSchema,
    mode: 'edit',
    variant: 'detail',
    id: 'user-1',
    showDelete: true,
  },
};

export const ReadOnly: Story = {
  args: {
    collection: 'users',
    schema: sampleSchema,
    mode: 'edit',
    variant: 'detail',
    id: 'user-1',
  },
  parameters: {
    docs: {
      description: {
        story: '読み取り専用モード（editモードでid指定、かつフィールドがreadOnly）',
      },
    },
  },
};

export const CustomLayoutWithCompound: StoryObj = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const form = useForm({
      defaultValues: {
        name: '山田 太郎',
        email: 'taro@example.com',
        role: 'admin',
        age: 32,
        bio: 'フロントエンド開発者です。',
      },
    });

    return (
      <FormCompound.Root form={form} schema={sampleSchema} onSubmit={(data) => alert(JSON.stringify(data, null, 2))}>
        <FormCompound.Container maxWidth="3xl">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-xl font-bold">ユーザープロファイル編集 (Compound Layout)</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => form.reset()}>
                リセット
              </Button>
              <FormCompound.SubmitButton label="変更を保存" />
            </div>
          </div>

          <FormCompound.Section title="アカウント基本情報" description="ログインおよび連絡に使用されます">
            <FormCompound.Grid columns={2}>
              <FormCompound.Field name="name" label="お名前（フルネーム）" />
              <FormCompound.Field name="email" label="メールアドレス" />
            </FormCompound.Grid>
          </FormCompound.Section>

          {/* 案件固有のカスタムUIを自由に挿入できるスロットの例 */}
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-300">
            💡 <strong>受託案件向け独自スロット:</strong> 外部SaaS（Slack / Teams）への通知設定や独自ウィジェットを自由に挟み込めます。
          </div>

          <FormCompound.Section title="詳細プロフィール">
            <FormCompound.Grid columns={2}>
              <FormCompound.Field name="role" label="権限グループ" />
              <FormCompound.Field name="age" label="年齢" />
            </FormCompound.Grid>
            <div className="mt-4">
              <FormCompound.Field name="bio" label="自己紹介文" />
            </div>
          </FormCompound.Section>
        </FormCompound.Container>
      </FormCompound.Root>
    );
  },
};
