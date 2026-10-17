import { useState } from 'react';
import { useAuth } from './useAuth';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { LoginForm, RegisterForm, type RegisterFieldConfig, type RegisterExtraField } from './AuthForms';
import * as m from '../../paraglide/messages.js';
import { useIsClient } from '../../lib/hooks/use-is-client';

/**
 * ログイン用のダイアログを表示するサインインボタンコンポーネント。
 *
 * @param props - コンポーネントのプロパティ
 * @param props.mode - 表示モード。`'login'` はログインのみ、`'combined'` はログイン/登録のタブ切り替え
 * @param props.registerFields - 登録フォームの既存フィールドカスタマイズ（mode='combined' 時）
 * @param props.extraFields - 登録フォームの追加フィールド（mode='combined' 時）
 *
 * @example
 * ```tsx
 * // ログインのみ（デフォルト）
 * <SignInButton />
 *
 * // ログイン・新規登録の切り替えタブ付き
 * <SignInButton mode="combined" />
 *
 * // 登録フォームに電話番号を追加
 * <SignInButton
 *   mode="combined"
 *   extraFields={[
 *     { name: 'phone', label: 'Phone', type: 'tel' },
 *   ]}
 * />
 * ```
 */
export function SignInButton({
  mode = 'login',
  registerFields,
  extraFields,
}: {
  mode?: 'login' | 'combined';
  registerFields?: RegisterFieldConfig;
  extraFields?: RegisterExtraField[];
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const isClient = useIsClient();

  if (!isClient) return null;
  if (user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setTab('login');
      }}
    >
      <DialogTrigger
        render={<Button variant='secondary' size='sm' className='transition-colors' />}
      >
        {m.signIn()}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        {mode === 'combined' ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
            <DialogHeader>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='login'>{m.signIn()}</TabsTrigger>
                <TabsTrigger value='register'>{m.signUp()}</TabsTrigger>
              </TabsList>
            </DialogHeader>
            <TabsContent value='login'>
              <LoginForm
                onSuccess={() => setOpen(false)}
                onRegisterClick={() => setTab('register')}
                showRegisterLink
              />
            </TabsContent>
            <TabsContent value='register'>
              <RegisterForm
                onSuccess={() => setOpen(false)}
                fields={registerFields}
                extraFields={extraFields}
                onLoginClick={() => setTab('login')}
                showLoginLink
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{m.signIn()}</DialogTitle>
            </DialogHeader>
            <LoginForm
              onSuccess={() => setOpen(false)}
              socialProviders={[{ provider: 'google', label: 'Googleでログイン' }]}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
