import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { SearchableSelectInput, SearchableSelectOption } from '../../../src/tools/components/ui/searchable-select-input';

const mockOptions: SearchableSelectOption[] = [
  { value: 'u1', label: '山田太郎', code: '1001', description: '開発部' },
  { value: 'u2', label: '佐藤花子', code: '1002', description: '総務部' },
  { value: 'u3', label: '鈴木一郎', code: '1003', description: '営業部' },
  { value: 'u4', label: '高橋健二', code: '1004', description: '開発部' },
  { value: 'u5', label: '田中実', code: '1005', description: '企画部' },
];

const meta = {
  title: 'UI/SearchableSelectInput',
  component: SearchableSelectInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SearchableSelectInput>;

export default meta;
type Story = StoryObj<any>;

// 状態を持たせるためのヘルパーコンポーネント
function SearchableSelectInputWithState(props: any) {
  const [value, setValue] = React.useState<string | number>('');
  return (
    <div className='w-[400px]'>
      <SearchableSelectInput
        {...props}
        value={value}
        onValueChange={(val) => {
          setValue(val);
          props.onValueChange?.(val);
        }}
      />
      <div className='mt-2 text-xs text-muted-foreground'>選択された値: {value || '(未選択)'}</div>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <SearchableSelectInputWithState options={mockOptions} placeholder='名前で検索...' />
  ),
};

export const SplitHorizontal: Story = {
  render: () => (
    <SearchableSelectInputWithState
      options={mockOptions}
      splitLayout='horizontal'
      codePlaceholder='コード'
      namePlaceholder='名前で検索...'
    />
  ),
};

export const SplitVertical: Story = {
  render: () => (
    <SearchableSelectInputWithState
      options={mockOptions}
      splitLayout='vertical'
      codePlaceholder='コード'
      namePlaceholder='名前で検索...'
    />
  ),
};

export const WithDefaultValue: Story = {
  render: () => {
    const [value, setValue] = React.useState<string | number>('u2');
    return (
      <div className='w-[400px]'>
        <SearchableSelectInput
          options={mockOptions}
          value={value}
          onValueChange={setValue}
          splitLayout='horizontal'
          codePlaceholder='コード'
          namePlaceholder='名前で検索...'
        />
        <div className='mt-2 text-xs text-muted-foreground'>選択された値: {value}</div>
      </div>
    );
  },
};
