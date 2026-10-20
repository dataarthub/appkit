import { useState } from 'react';
import { useAuth } from './useAuth';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { LoginForm, RegisterForm, type RegisterFieldConfig, type RegisterExtraField } from './AuthForms';
import * as m from '../../paraglide/messages.js';
import { useIsClient } from '../../lib/hooks/use-is-client';

/**
 * Opens a login dialog or tabbed login/registration dialog for signed-out users.
 *
 * @param props - Dialog mode and optional registration field configuration.
 *
 * @returns Sign-in button/dialog after client mount; null during SSR or when a user exists.
 *
 * @throws Error without AuthProvider.
 *
 * @remarks Requires AuthProvider inside QueryClientProvider and Appkit styles. Defaults
 * to login mode with a Google OAuth button (shown only if adapter support exists).
 * Combined mode provides login/register tabs; successful email login/registration closes
 * the dialog. Each opening resets the selected tab to login.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, SignInButton, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 * export function FormExample({ adapter, queryClient }: { adapter: AuthAdapter; queryClient: QueryClient }) {
 *   return <QueryClientProvider client={queryClient}><AuthProvider adapter={adapter}><SignInButton mode="combined" /></AuthProvider></QueryClientProvider>;
 * }
 * ```
 */
export function SignInButton({
  mode = 'login',
  registerFields,
  extraFields,
}: {
  /**
   * Dialog contents: login by default, combined adds registration tabs.
   */
  mode?: 'login' | 'combined';
  /**
   * Built-in registration input overrides, used only in combined mode.
   */
  registerFields?: RegisterFieldConfig;
  /**
   * Additional locally validated registration inputs, used only in combined mode; not saved by RegisterForm.
   */
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
