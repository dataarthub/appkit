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
 * OAuth button configuration rendered by LoginForm.
 *
 * @see LoginForm for complete provider setup.
 */
export interface SocialProviderConfig {
    /**
     * Identifier passed to adapter.loginWithProvider; actual support is host-configured.
     */
  provider: OAuthProvider;
    /**
     * Visible button text.
     */
  label: string;
    /**
     * Optional icon; omission uses Apple/Google artwork or a generic globe.
     */
  icon?: React.ReactNode;
}

/** Default Apple icon. */
const AppleIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' className='mr-2 h-4 w-4'>
    <path
      d='M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701'
      fill='currentColor'
    />
  </svg>
);

/** Default Google icon. */
const GoogleIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' className='mr-2 h-4 w-4'>
    <path
      d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
      fill='currentColor'
    />
  </svg>
);

/** Generic globe for custom providers. */
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

/** Default artwork for known provider names. */
const builtInIcons: Record<string, React.ReactNode> = {
  apple: <AppleIcon />,
  google: <GoogleIcon />,
};

/** Default Apple and Google button definitions. */
const defaultSocialProviders: SocialProviderConfig[] = [
  { provider: 'apple', label: m.auth_loginWithApple() },
  { provider: 'google', label: m.auth_loginWithGoogle() },
];

/**
 * Renders email/password login and optional OAuth provider buttons.
 *
 * @param props - Success/navigation callbacks, provider buttons and optional visibility settings.
 *
 * @returns Login form with validation, pending state and an error alert.
 *
 * @throws Error without AuthProvider; email/OAuth action failures are caught and shown as messages.
 *
 * @remarks Requires AuthProvider inside QueryClientProvider, React Hook Form, Zod and Appkit
 * styles. Email must be valid and password at least six characters before submission.
 * Email success invokes onSuccess; OAuth success does not. OAuth buttons exist only
 * when the adapter supplies loginWithProvider. The host configures real authentication.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, LoginForm, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 * export function FormExample({ adapter, queryClient }: { adapter: AuthAdapter; queryClient: QueryClient }) {
 *   return <QueryClientProvider client={queryClient}><AuthProvider adapter={adapter}><LoginForm socialProviders={[{ provider: 'google', label: 'Google' }]} /></AuthProvider></QueryClientProvider>;
 * }
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
  /**
   * Optional synchronous callback after successful email/password login; thrown errors become form error messages.
   */
  onSuccess?: () => void;
  /**
   * OAuth button definitions; omission uses Apple and Google, empty array hides buttons.
   */
  socialProviders?: SocialProviderConfig[];
  /**
   * Show the register action only when onRegisterClick also exists; defaults to true.
   */
  showRegisterLink?: boolean;
  /**
   * Show email/password fields and submit button; defaults to true.
   */
  showEmailLogin?: boolean;
  /**
   * OAuth destination resolved against window.location.origin; defaults to /.
   */
  redirectTo?: string;
  /**
   * Optional synchronous click handler for the register action.
   */
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
 * Visibility, label and placeholder overrides for the three built-in registration fields.
 *
 * @remarks All fields default to visible; labels/placeholders are localized. Hiding email
 * or password does not remove their required schema validation.
 *
 * @see RegisterForm for usage.
 */
export interface RegisterFieldConfig {
    /**
     * Overrides for optional display-name input.
     */
  name?: {
    /** Visibility override; defaults to true. */
    show?: boolean;
    /** Localized label override. */
    label?: string;
    /** Placeholder override. */
    placeholder?: string;
  };
    /**
     * Overrides for required email input; hiding it does not skip validation.
     */
  email?: {
    /** Visibility override; defaults to true. */
    show?: boolean;
    /** Localized label override. */
    label?: string;
    /** Placeholder override. */
    placeholder?: string;
  };
    /**
     * Overrides for required password input; hiding it does not skip validation.
     */
  password?: {
    /** Visibility override; defaults to true. */
    show?: boolean;
    /** Localized label override. */
    label?: string;
    /** Placeholder override. */
    placeholder?: string;
  };
}

/**
 * Additional registration input rendered and validated locally by RegisterForm.
 *
 * @remarks These values are not passed to AuthAdapter.register: the bundled form sends
 * only email, password and name. Use host-owned persistence to save other fields.
 * Custom validation overrides automatic type/required rules.
 *
 * @see RegisterForm for complete usage.
 */
export interface RegisterExtraField {
    /**
     * Unique form-data key; avoid built-in email/password/name collisions unless intentionally replacing their schema.
     */
  name: string;
    /**
     * Visible field label.
     */
  label: string;
    /**
     * Input presentation, default text. tel/url use text input modes, date uses schema date format.
     */
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'url' | 'password' | 'textarea' | 'select' | 'checkbox';
    /**
     * Optional input hint passed where supported by the rendered control.
     */
  placeholder?: string;
    /**
     * Add required default validation; omission is optional except optional checkbox still expects a boolean.
     */
  required?: boolean;
    /**
     * Optional browser autocomplete hint where supported.
     */
  autoComplete?: string;
    /**
     * Select choices; defaults to an empty list for a select without options.
     */
  options?: {
    /** Display text. */
    label: string;
    /** Submitted choice value. */
    value: string;
  }[];
    /**
     * Optional Zod schema replacing generated validation for this field.
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
 * Renders account registration with built-in field overrides and optional local extra inputs.
 *
 * @param props - Registration success/navigation callbacks and field presentation settings.
 *
 * @returns Validated form, pending submit button and error feedback.
 *
 * @throws Error without AuthProvider; registration and onSuccess failures are shown as form errors.
 *
 * @remarks Requires AuthProvider inside QueryClientProvider, React Hook Form, Zod and Appkit
 * styles. Email must be valid; password requires six characters; name is optional.
 * Extra inputs are validated and rendered but not persisted by this component: only
 * email, password and {name} reach adapter.register. Hidden built-in fields remain in
 * validation. Custom extra schemas can override built-in names, so avoid collisions.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { AuthProvider, RegisterForm, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 * export function FormExample({ adapter, queryClient }: { adapter: AuthAdapter; queryClient: QueryClient }) {
 *   return <QueryClientProvider client={queryClient}><AuthProvider adapter={adapter}><RegisterForm fields={{ name: { label: 'Display name' } }} /></AuthProvider></QueryClientProvider>;
 * }
 * ```
 */
export function RegisterForm({
  onSuccess,
  fields,
  extraFields,
  showLoginLink = true,
  onLoginClick,
}: {
  /**
   * Optional synchronous callback after registration; thrown errors become form errors.
   */
  onSuccess?: () => void;
  /**
   * Optional visibility/label/placeholder overrides for name, email and password.
   */
  fields?: RegisterFieldConfig;
  /**
   * Optional extra input definitions; validated locally but not forwarded to register.
   */
  extraFields?: RegisterExtraField[];
  /**
   * Show login action when onLoginClick exists; defaults to true.
   */
  showLoginLink?: boolean;
  /**
   * Optional synchronous click handler for the login action.
   */
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
