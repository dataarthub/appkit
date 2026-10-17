import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from './useAuth';
import { Button } from '../ui/button';
import { Form, AutoFormField } from '../ui/form';
import { FieldSeparator } from '../ui/field';
import { Alert, AlertDescription } from '../ui/alert';
import { OAuthProvider } from './types';
import { AlertCircle } from 'lucide-react';
import * as m from '../../paraglide/messages.js';

const loginSchema = z.object({
  email: z.string().email({ message: m.auth_validation_invalidEmail() }),
  password: z.string().min(6, { message: m.auth_validation_passwordLength() }),
});

const registerSchema = z.object({
  email: z.string().email({ message: m.auth_validation_invalidEmail() }),
  password: z.string().min(6, { message: m.auth_validation_passwordLength() }),
  name: z.string().optional(),
});

/**
 * ソーシャルログインプロバイダーの設定
 *
 * @example
 * ```tsx
 * const providers: SocialProviderConfig[] = [
 *   { provider: 'google', label: 'Login with Google' },
 *   { provider: 'line-oidc', label: 'LINEでログイン', icon: <LineIcon /> },
 * ];
 * ```
 */
export interface SocialProviderConfig {
  /** プロバイダー識別子（組み込みまたはカスタム OIDC プロバイダー名） */
  provider: OAuthProvider;
  /** ボタンに表示するラベル */
  label: string;
  /** アイコン（ReactNode）。省略時はデフォルトアイコンを使用 */
  icon?: React.ReactNode;
}

/** Apple のデフォルトアイコン */
const AppleIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' className='mr-2 h-4 w-4'>
    <path
      d='M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701'
      fill='currentColor'
    />
  </svg>
);

/** Google のデフォルトアイコン */
const GoogleIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' className='mr-2 h-4 w-4'>
    <path
      d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
      fill='currentColor'
    />
  </svg>
);

/** カスタムプロバイダー用のデフォルトアイコン（Globe） */
const DefaultProviderIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='mr-2 h-4 w-4'
  >
    <circle cx='12' cy='12' r='10' />
    <path d='M2 12h20' />
    <path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' />
  </svg>
);

/** 組み込みプロバイダーのデフォルトアイコンマップ */
const builtInIcons: Record<string, React.ReactNode> = {
  apple: <AppleIcon />,
  google: <GoogleIcon />,
};

/** デフォルトのソーシャルプロバイダー設定（後方互換用） */
const defaultSocialProviders: SocialProviderConfig[] = [
  { provider: 'apple', label: m.auth_loginWithApple() },
  { provider: 'google', label: m.auth_loginWithGoogle() },
];

/**
 * ログイン用のフォームコンポーネント。メールアドレスとパスワードによる認証、およびソーシャルログインに対応します。
 *
 * @param props - コンポーネントのプロパティ
 * @param props.onSuccess - ログイン成功時のコールバック
 * @param props.socialProviders - ソーシャルログインプロバイダーの設定（省略時は Apple + Google）
 * @param props.showRegisterLink - 新規登録リンクを表示するか（デフォルト: true）
 * @param props.showEmailLogin - メールアドレスとパスワードのログイン欄を表示するか（デフォルト: true）
 * @param props.redirectTo - ソーシャルログイン後の移動先（デフォルト: 現在のドメインの `/`）
 * @param props.onRegisterClick - 新規登録リンククリック時のコールバック（設定するとリンクが表示される）
 *
 * @example
 * ```tsx
 * <LoginForm
 *   onSuccess={() => navigate('/dashboard')}
 *   socialProviders={[{ provider: 'google', label: 'Googleでログイン' }]}
 * />
 * ```
 */
export function LoginForm({
  onSuccess,
  socialProviders,
  showRegisterLink = true,
  showEmailLogin = true,
  redirectTo = '/',
  onRegisterClick,
}: {
  onSuccess?: () => void;
  socialProviders?: SocialProviderConfig[];
  showRegisterLink?: boolean;
  showEmailLogin?: boolean;
  redirectTo?: string;
  onRegisterClick?: () => void;
}) {
  const { login, loginWithProvider } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      setIsPending(true);
      setError(null);
      await login(values.email, values.password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_failedToLogin());
    } finally {
      setIsPending(false);
    }
  }

  const handleSocialLogin = async (provider: OAuthProvider) => {
    if (!loginWithProvider) return;

    try {
      setError(null);
      await loginWithProvider(provider, {
        redirectTo: new URL(redirectTo, window.location.origin).href,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_socialLoginFailed());
    }
  };

  const providers = socialProviders ?? defaultSocialProviders;

  return (
    <Form.Root onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loginWithProvider && providers.length > 0 && (
        <>
          <div className='flex flex-col gap-2'>
            {providers.map((config) => (
              <Button
                key={config.provider}
                variant='outline'
                type='button'
                disabled={isPending || isSubmitting}
                onClick={() => handleSocialLogin(config.provider)}
              >
                {config.icon ?? builtInIcons[config.provider] ?? <DefaultProviderIcon />}
                {config.label}
              </Button>
            ))}
          </div>

          {showEmailLogin && (
            <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
              {m.auth_orContinueWith()}
            </FieldSeparator>
          )}
        </>
      )}

      {showEmailLogin && (
        <>
          <AutoFormField
            control={control}
            name='email'
            label={m.auth_email()}
            inputProps={{ placeholder: m.auth_emailPlaceholder() }}
          />

          <AutoFormField
            control={control}
            name='password'
            label={m.auth_password()}
            type='password'
            inputProps={{ autoComplete: 'current-password' }}
          />

          <Button type='submit' className='w-full' disabled={isPending || isSubmitting}>
            {isPending ? m.auth_loggingIn() : m.signIn()}
          </Button>
        </>
      )}

      {showRegisterLink && onRegisterClick && (
        <div className='text-center text-sm text-muted-foreground'>
          {m.auth_dontHaveAccount()}{' '}
          <Button type='button' variant='link' className='p-0 h-auto' onClick={onRegisterClick}>
            {m.signUp()}
          </Button>
        </div>
      )}
    </Form.Root>
  );
}

/**
 * ユーザー登録フォームの既存フィールド（name/email/password）の表示設定。
 * 各フィールドの表示/非表示、ラベル、プレースホルダーを個別にカスタマイズできます。
 *
 * @example
 * ```tsx
 * // name フィールドを非表示にして、email のラベルを変更
 * <RegisterForm fields={{ name: { show: false }, email: { label: 'Email Address' } }} />
 * ```
 */
export interface RegisterFieldConfig {
  /** 名前フィールドの設定 */
  name?: { show?: boolean; label?: string; placeholder?: string };
  /** メールアドレスフィールドの設定 */
  email?: { show?: boolean; label?: string; placeholder?: string };
  /** パスワードフィールドの設定 */
  password?: { show?: boolean; label?: string; placeholder?: string };
}

/**
 * 登録フォームに追加するカスタムフィールドの設定。
 * `type` に応じて適切な入力 UI が自動選択され、`validation` で Zod スキーマを指定すると
 * 自動生成のバリデーションを上書きできます。
 *
 * @example
 * ```tsx
 * const extraFields: RegisterExtraField[] = [
 *   { name: 'phone', label: 'Phone', type: 'tel', required: true },
 *   { name: 'birthDate', label: 'Birth Date', type: 'date' },
 *   { name: 'company', label: 'Company', type: 'text' },
 *   { name: 'role', label: 'Role', type: 'select', required: true,
 *     options: [{ label: 'Admin', value: 'admin' }, { label: 'User', value: 'user' }] },
 *   { name: 'agreement', label: 'Agree to terms', type: 'checkbox', required: true },
 * ];
 * ```
 *
 * カスタムバリデーション:
 * ```tsx
 * { name: 'phone', label: 'Phone', type: 'tel', required: true,
 *   validation: z.string().regex(/^0[0-9]{9,10}$/, 'Invalid phone number') }
 * ```
 */
export interface RegisterExtraField {
  /** フィールドのキー名（フォームデータのプロパティ名） */
  name: string;
  /** ラベル */
  label: string;
  /** 入力 UI の種類。`date` はネイティブの日付ピッカー、`tel` はテンキー入力に対応 */
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'url' | 'password' | 'textarea' | 'select' | 'checkbox';
  /** プレースホルダー */
  placeholder?: string;
  /** 必須フィールドとするか */
  required?: boolean;
  /** autocomplete 属性 */
  autoComplete?: string;
  /** `type='select'` の場合の選択肢 */
  options?: { label: string; value: string }[];
  /**
   * カスタム Zod バリデーション。
   * 省略時は `type` と `required` から自動生成されます。
   * @example z.string().regex(/^0[0-9]{9,10}$/)
   */
  validation?: z.ZodTypeAny;
}

const defaultFieldConfig = {
  name: { show: true, label: m.auth_name(), placeholder: m.auth_namePlaceholder() },
  email: { show: true, label: m.auth_email(), placeholder: m.auth_emailPlaceholder() },
  password: { show: true, label: m.auth_password(), placeholder: '' },
};

function resolveFieldConfig(
  fields: RegisterFieldConfig | undefined,
  key: keyof RegisterFieldConfig,
) {
  const cfg = fields?.[key];
  if (!cfg) return defaultFieldConfig[key];
  return {
    show: cfg.show ?? defaultFieldConfig[key].show,
    label: cfg.label ?? defaultFieldConfig[key].label,
    placeholder: cfg.placeholder ?? defaultFieldConfig[key].placeholder,
  };
}

function buildExtraFieldSchema(fields: RegisterExtraField[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (field.validation) {
      shape[field.name] = field.validation;
    } else if (field.type === 'email') {
      shape[field.name] = field.required
        ? z.string().email({ message: m.auth_validation_invalidEmail() })
        : z.string().email({ message: m.auth_validation_invalidEmail() }).optional().or(z.literal(''));
    } else if (field.type === 'number') {
      shape[field.name] = field.required
        ? z.coerce.number({ message: m.auth_validation_invalidNumber() })
        : z.coerce.number({ message: m.auth_validation_invalidNumber() }).optional();
    } else if (field.type === 'checkbox') {
      shape[field.name] = field.required
        ? z.literal(true, { message: m.auth_validation_required() })
        : z.boolean();
    } else {
      shape[field.name] = field.required
        ? z.string().min(1, m.auth_validation_required())
        : z.string().optional();
    }
  }
  return z.object(shape);
}

function renderExtraField(field: RegisterExtraField, control: any) {
  const commonProps = {
    control,
    name: field.name,
    label: field.label,
    required: field.required,
  };

  const inputProps: Record<string, any> = {};
  if (field.placeholder) inputProps.placeholder = field.placeholder;
  if (field.autoComplete) inputProps.autoComplete = field.autoComplete;

  if (field.type === 'date') {
    return (
      <AutoFormField
        {...commonProps}
        jsonSchema={{ type: 'string', format: 'date' }}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <AutoFormField
        {...commonProps}
        type='select'
        options={field.options ?? []}
      />
    );
  }

  if (field.type === 'checkbox') {
    return <AutoFormField {...commonProps} type='checkbox' />;
  }

  if (field.type === 'textarea') {
    return (
      <AutoFormField
        {...commonProps}
        type='textarea'
        inputProps={inputProps}
      />
    );
  }

  if (field.type === 'tel') inputProps.inputMode = 'tel';
  if (field.type === 'url') inputProps.inputMode = 'url';

  const supportedType = ['text', 'number', 'email', 'password'].includes(field.type ?? 'text')
    ? (field.type as 'text' | 'number' | 'email' | 'password')
    : 'text';

  return (
    <AutoFormField
      {...commonProps}
      type={supportedType}
      inputProps={Object.keys(inputProps).length > 0 ? inputProps : undefined}
    />
  );
}

/**
 * ユーザー登録用のフォームコンポーネント。メールアドレス、パスワード、および任意の氏名の入力を受け付けます。
 * `fields` で既存フィールドの表示/非表示やラベルを、`extraFields` で任意の追加項目を設定できます。
 *
 * @param props - コンポーネントのプロパティ
 * @param props.onSuccess - 登録成功時のコールバック
 * @param props.fields - 既存フィールド（name/email/password）の表示カスタマイズ
 * @param props.extraFields - 追加フィールドの定義（電話番号、生年月日など任意の項目）
 * @param props.showLoginLink - ログインページへのリンクを表示するか（デフォルト: true）
 * @param props.onLoginClick - ログインリンククリック時のコールバック
 *
 * @example
 * ```tsx
 * // 基本
 * <RegisterForm onSuccess={() => navigate('/login')} />
 *
 * // name 非表示 + 追加フィールド
 * <RegisterForm
 *   fields={{ name: { show: false } }}
 *   extraFields={[
 *     { name: 'phone', label: 'Phone', type: 'tel', required: true },
 *     { name: 'birthDate', label: 'Birth Date', type: 'date' },
 *   ]}
 * />
 * ```
 */
export function RegisterForm({
  onSuccess,
  fields,
  extraFields,
  showLoginLink = true,
  onLoginClick,
}: {
  onSuccess?: () => void;
  fields?: RegisterFieldConfig;
  extraFields?: RegisterExtraField[];
  showLoginLink?: boolean;
  onLoginClick?: () => void;
}) {
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const extraFieldSchema = extraFields?.length ? buildExtraFieldSchema(extraFields) : null;
  const finalSchema = extraFieldSchema ? registerSchema.extend(extraFieldSchema.shape) : registerSchema;

  const form = useForm<any>({
    resolver: zodResolver(finalSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      ...(extraFields?.reduce((acc, f) => {
        acc[f.name] = f.type === 'checkbox' ? false : '';
        return acc;
      }, {} as Record<string, any>)),
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: any) {
    try {
      setIsPending(true);
      setError(null);
      await register(values.email, values.password, { name: values.name });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_failedToRegister());
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form.Root onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(() => {
        const nameCfg = resolveFieldConfig(fields, 'name');
        const emailCfg = resolveFieldConfig(fields, 'email');
        const passwordCfg = resolveFieldConfig(fields, 'password');
        return (
          <>
            {nameCfg.show && (
              <AutoFormField
                control={control}
                name='name'
                label={nameCfg.label}
                inputProps={{ placeholder: nameCfg.placeholder }}
              />
            )}
            {emailCfg.show && (
              <AutoFormField
                control={control}
                name='email'
                label={emailCfg.label}
                inputProps={{ placeholder: emailCfg.placeholder }}
              />
            )}
            {passwordCfg.show && (
              <AutoFormField
                control={control}
                name='password'
                label={passwordCfg.label}
                type='password'
                inputProps={{ autoComplete: 'new-password', placeholder: passwordCfg.placeholder || undefined }}
              />
            )}
          </>
        );
      })()}

      {extraFields?.length ? (
        <div className='space-y-4'>
          {extraFields.map((field) => (
            <React.Fragment key={field.name}>
              {renderExtraField(field, control)}
            </React.Fragment>
          ))}
        </div>
      ) : null}

      <Button type='submit' className='w-full' disabled={isPending || isSubmitting}>
        {isPending ? m.auth_registering() : m.signUp()}
      </Button>

      {showLoginLink && onLoginClick && (
        <div className='text-center text-sm text-muted-foreground'>
          {m.auth_alreadyHaveAccount()}{' '}
          <Button type='button' variant='link' className='p-0 h-auto' onClick={onLoginClick}>
            {m.signIn()}
          </Button>
        </div>
      )}
    </Form.Root>
  );
}
