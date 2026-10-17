/**
 * @fileoverview FormView - DBフェッチ/更新付きフォームラッパー
 *
 * useFindOne/useCreate/useUpdateを組み合わせたオールインワンフォームコンポーネント。
 * スキーマベースのフォームとDB連携を統合。
 *
 * @module form/form-view
 */

'use client';

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import * as m from '../../paraglide/messages.js';

import type { JSONSchema } from '../../lib/schema/types';
import { createAjvResolver, type SchemaFormValidationOptions } from '../../lib/schema/ajv';
import { castValuesBySchema, type SchemaCastOptions } from './form-cast';
import { useFindOne, useCreate, useUpdate, useDelete } from "../../lib/data-access/react-query";
import type { QueryOptions } from "../../lib/data-access/types";
import { EnhancedDetailPage } from './EnhancedDetailPage';
import { FormStepper } from './FormStepper';
import { type FormContainerWidth } from './form-container';
import type { SaveStatus } from './form-action-bar';
import type { RelatedFieldConfig } from '../ui/form';
import { cn } from "../../lib/utils";

// =============================================================================
// Types
// =============================================================================

/**
 * フォームモード
 * Form mode - create or edit
 */
export type FormMode = 'create' | 'edit';

/**
 * フォームステータス
 * Form data status for AI automation
 */
export type FormStatus = 'loading' | 'error' | 'ready' | 'submitting' | 'success';

/**
 * フォームバリアント
 * Form variant - detail page or stepper wizard
 */
export type FormVariant = 'detail' | 'stepper';

/**
 * FormViewProps
 * FormViewのプロパティ
 *
 * DB連携付きフォームラッパーコンポーネント。
 *
 * ## AI/Automation Features
 * - `testId`: Container element
 * - `data-status`: loading | error | ready | submitting | success
 * - `data-mode`: create | edit
 * - `data-variant`: detail | stepper
 *
 * @template T - データの型 / Data type
 */
export interface FormViewProps<T extends FieldValues> {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;

  /** コレクション/テーブル名 / Collection or table name */
  collection: string;

  /** JSON Schema definition with vendor extensions (x-ui, x-db, x-zod) */
  schema: JSONSchema;

  /** フォームモード / Form mode */
  mode: FormMode;

  /** フォームバリアント / Form variant */
  variant?: FormVariant;

  /** 編集時のドキュメントID / Document ID for edit mode */
  id?: string;

  /** クエリオプション（populate等） / Query options */
  queryOptions?: QueryOptions;

  /** 成功時のコールバック / Success callback */
  onSuccess?: (data: T) => void;

  /** キャンセル時のコールバック / Cancel callback */
  onCancel?: () => void;

  /** 削除成功時のコールバック / Delete success callback */
  onDeleteSuccess?: () => void;

  /** 削除ボタンを表示 / Show delete button */
  showDelete?: boolean;

  // --- Layout Options ---

  /** コンテナの最大幅 / Container max width */
  maxWidth?: FormContainerWidth;

  /** スティッキーアクションバー / Sticky action bar */
  stickyActions?: boolean;

  /** プログレッシブディスクロージャー / Progressive disclosure */
  progressiveDisclosure?: boolean;

  /** グリッドレイアウト / Grid layout */
  useGrid?: boolean;

  /** グループ表示スタイル / Group display style */
  groupDisplay?: 'heading' | 'card' | 'dropdown';

  /** リレーションデータ / Relation data */
  relations?: Record<string, RelatedFieldConfig>;

  /** コンテナのクラス名 / Container class name */
  className?: string;

  /** ローディング時のカスタム表示 / Custom loading display */
  loadingContent?: React.ReactNode;

  /** エラー時のカスタム表示 / Custom error display */
  errorContent?: (error: Error) => React.ReactNode;

  /** ステップ変更時のコールバック (stepper variant) / Step change callback */
  onStepChange?: (step: number) => void;

  /** Override persistence; return the server-confirmed record, or void for legacy callbacks. */
  onSave?: (values: T) => Promise<T | void> | T | void;
  /** Optional error presentation; input remains available for retry. */
  saveErrorContent?: (error: Error) => React.ReactNode;
  /** Receives persistence failures. Use a sanitized transport error. */
  onSaveError?: (error: Error) => void;
  /** Opt into whole-record validation and explicit normalization. */
  validation?: SchemaFormValidationOptions;
  /** Numeric casting before persistence; legacy remains the compatibility default. */
  castOptions?: SchemaCastOptions;

  /** カスタムフォームコンテンツ / Custom form content */
  children?: React.ReactNode;
}

// =============================================================================
// FormView Component
// =============================================================================

/**
 * FormView Component
 * DBフェッチ/更新付きフォームラッパー
 *
 * Fetches data via useFindOne (edit mode) and handles create/update via mutations.
 * 編集時は自動的にデータを取得し、作成/更新はmutationで処理。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container element
 * - `data-status`: loading | error | ready | submitting | success
 * - `data-mode`: create | edit
 *
 * @example Create mode with testId
 * ```tsx
 * <FormView
 *   testId="user-form"
 *   collection="users"
 *   schema={userSchema}
 *   mode="create"
 *   onSuccess={(user) => navigate(`/users/${user.id}`)}
 *   onCancel={() => navigate('/users')}
 * />
 * // Selector: [data-testid="user-form"][data-status="ready"][data-mode="create"]
 * ```
 *
 * @example Stepper variant
 * ```tsx
 * <FormView
 *   testId="wizard-form"
 *   collection="users"
 *   schema={schemaWithSteps}
 *   mode="create"
 *   variant="stepper"
 *   onSuccess={(user) => navigate(`/users/${user.id}`)}
 * />
 * // Selector: [data-testid="wizard-form"][data-variant="stepper"]
 * ```
 */
function FormViewSession<T extends FieldValues>({
  testId,
  collection,
  schema,
  mode,
  variant = 'detail',
  id,
  queryOptions,
  onSuccess,
  onCancel,
  onDeleteSuccess,
  showDelete = false,
  maxWidth = '4xl',
  stickyActions = true,
  progressiveDisclosure = true,
  useGrid = true,
  groupDisplay,
  relations,
  className,
  loadingContent,
  errorContent,
  onStepChange,
  onSave,
  onSaveError,
  saveErrorContent,
  validation,
  castOptions,
  children,
}: FormViewProps<T>) {
  const isEditMode = mode === 'edit';

  const lock = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [saveError, setSaveError] = React.useState<Error | null>(null);

  // Track submission status
  const [formStatus, setFormStatus] = React.useState<FormStatus>(isEditMode ? 'loading' : 'ready');

  // Fetch data for edit mode
  const {
    data: fetchedData,
    isLoading: isFetching,
    error: fetchError,
  } = useFindOne<T>(collection, id || '', queryOptions, { enabled: isEditMode && !!id });

  const createMutation = useCreate<T>(collection);
  const updateMutation = useUpdate<T>(collection);

  // Delete mutation
  const deleteMutation = useDelete(collection, {
    onSuccess: () => {
      onDeleteSuccess?.();
    },
  });

  // Compute current status
  const currentStatus = useMemo<FormStatus>(() => {
    if (isFetching) return 'loading';
    if (fetchError) return 'error';
    if (createMutation.isPending || updateMutation.isPending || formStatus === 'submitting')
      return 'submitting';
    if (saveError) return 'error';
    if (formStatus === 'success') return 'success';
    return 'ready';
  }, [isFetching, fetchError, createMutation.isPending, updateMutation.isPending, formStatus, saveError]);

  // Compute save status for action bar
  const saveStatus = useMemo<SaveStatus>(() => {
    if (createMutation.isPending || updateMutation.isPending || formStatus === 'submitting')
      return 'saving';
    if (saveError) return 'error';
    if (formStatus === 'success') return 'saved';
    return 'idle';
  }, [createMutation, updateMutation, formStatus, saveError]);

  // Handle form submit
  const handleSubmit = useCallback(
    async (values: T) => {
      if (lock.current) return;
      lock.current = true;
      setSaveError(null);
      setFormStatus('submitting');
      let saved: T;
      try {
        let castedValues = castValuesBySchema(values, schema, castOptions ?? validation?.cast) as T;
        if (validation) {
          const result = await createAjvResolver<T>(schema, validation)(castedValues, undefined, { fields: {}, shouldUseNativeValidation: false });
          if (Object.keys(result.errors).length) throw new Error('Input did not pass schema validation.');
          castedValues = result.values as T;
        }
        saved = onSave
          ? (await onSave(castedValues)) ?? castedValues
          : isEditMode && id
            ? await updateMutation.mutateAsync({ id, data: castedValues })
            : await createMutation.mutateAsync({ data: castedValues });
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error('Save failed');
        if (mounted.current) {
          setSaveError(error);
          setFormStatus('error');
          onSaveError?.(error);
        }
        return;
      } finally {
        lock.current = false;
      }
      if (mounted.current) {
        setFormStatus('success');
        onSuccess?.(saved);
      }
    },
    [isEditMode, id, schema, createMutation, updateMutation, onSave, onSuccess, onSaveError, castOptions, validation],
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    if (id) {
      deleteMutation.mutate({ id });
    }
  }, [id, deleteMutation]);

  // Loading state (edit mode only)
  if (isEditMode && isFetching) {
    return (
      <div
        data-testid={testId}
        data-status='loading'
        data-mode={mode}
        className={cn('flex items-center justify-center p-8', className)}
      >
        {loadingContent || (
          <div className='text-muted-foreground'>
            {m.common_status_loading({ defaultValue: '読み込み中...' })}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div
        data-testid={testId}
        data-status='error'
        data-mode={mode}
        className={cn('flex items-center justify-center p-8 text-destructive', className)}
      >
        {errorContent ? (
          errorContent(fetchError)
        ) : (
          <div>
            {m.common_status_error({ defaultValue: 'エラーが発生しました' })}: {fetchError.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      data-status={currentStatus}
      onChangeCapture={() => { if (formStatus === 'success') setFormStatus('ready'); }}
      data-mode={mode}
      data-variant={variant}
      className={className}
    >
      {saveError && <div role='alert'>{saveErrorContent ? saveErrorContent(saveError) : saveError.message}</div>}
      {variant === 'stepper' ? (
        <FormStepper<T>
          testId={testId ? `${testId}-stepper` : undefined}
          schema={schema}
          validation={validation}
          defaultValues={fetchedData as DefaultValues<T>}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          onStepChange={onStepChange}
          saveStatus={saveStatus}
          maxWidth={maxWidth}
          relations={relations}
        />
      ) : (
        <EnhancedDetailPage<T>
          schema={schema}
          validation={validation}
          mode='edit'
          values={fetchedData as Partial<T> | undefined}
          submitLabel={isEditMode ? 'update' : 'create'}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          onDelete={showDelete && isEditMode ? handleDelete : undefined}
          containerLayout={true}
          maxWidth={maxWidth}
          stickyActions={stickyActions}
          progressiveDisclosure={progressiveDisclosure}
          saveStatus={saveStatus}
          useGrid={useGrid}
          groupDisplay={groupDisplay}
          relations={relations}
        >
          {children}
        </EnhancedDetailPage>
      )}
    </div>
  );
}
/** Schema form with an application-supplied data adapter. Target changes isolate submission state.
 * Requires QueryClientProvider and DataAccessProvider, including with onSave.
 * Validation is opt-in; strict casting is recommended for new applications.
 */
export function FormView<T extends FieldValues>(props: FormViewProps<T>) {
  return <FormViewSession key={JSON.stringify([props.collection, props.mode, props.id])} {...props} />;
}
FormView.displayName = 'FormView';
