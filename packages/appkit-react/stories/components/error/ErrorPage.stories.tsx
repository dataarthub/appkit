import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorPage } from '../../../src/tools/components/error/ErrorPage';

const meta = {
  title: 'Components/Error/ErrorPage',
  component: ErrorPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 一般的なエラーページ
 */
export const Default: Story = {
  args: {
    title: 'エラーが発生しました',
    message: '予期しないエラーが発生しました。もう一度お試しください。',
    onBack: () => console.log('Back clicked'),
    onHome: () => console.log('Home clicked'),
  },
};

/**
 * 404 ページが見つからない
 */
export const NotFound: Story = {
  args: {
    code: 'error/not-found',
    title: 'ページが見つかりません',
    message: 'お探しのページは存在しないか、移動した可能性があります。',
    severity: 'warning',
    onBack: () => console.log('Back clicked'),
    onHome: () => console.log('Home clicked'),
  },
};

/**
 * 認証エラー
 */
export const Unauthorized: Story = {
  args: {
    title: 'アクセス権限がありません',
    message: 'このページを表示するにはログインが必要です。',
    severity: 'error',
    onHome: () => console.log('Home clicked'),
  },
};

/**
 * サーバーエラー
 */
export const ServerError: Story = {
  args: {
    title: 'サーバーエラー',
    message: 'サーバーで問題が発生しました。後でもう一度お試しください。',
    severity: 'critical',
    onBack: () => console.log('Back clicked'),
  },
};

/**
 * 戻るボタンのみ
 */
export const BackOnly: Story = {
  args: {
    title: 'エラーが発生しました',
    message: '操作を完了できませんでした。',
    onBack: () => console.log('Back clicked'),
  },
};

/**
 * カスタムコンテンツ付き
 */
export const WithChildren: Story = {
  args: {
    title: 'セッションが切れました',
    message: '再度ログインしてください。',
    severity: 'warning',
    onHome: () => console.log('Home clicked'),
    children: (
      <p className='text-sm text-muted-foreground'>
        問題が解決しない場合は、サポートまでお問い合わせください。
      </p>
    ),
  },
};
