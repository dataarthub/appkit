import * as React from 'react';
import { FormProvider, useForm, type FieldValues, type DefaultValues } from 'react-hook-form';
import { createAjvResolver, type SchemaFormValidationOptions } from '../../lib/schema/ajv';
import * as m from '../../paraglide/messages.js';
import { ChevronDown } from 'lucide-react';

import type { JSONSchema, JSONSchemaProperty } from '../../lib/schema/types';
import { FormContainer, type FormContainerWidth } from './form-container';
import { FormActionBar, type SaveStatus } from './form-action-bar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { SchemaDetailPage } from '../schema/SchemaDetailPage';
import type { RelatedFieldConfig } from '../ui/form';

type DetailMode = 'view' | 'edit';
type GroupDisplay = 'heading' | 'card' | 'dropdown';

interface EnhancedDetailPageProps<TFieldValues extends FieldValues> {
  /** Opt into whole-record schema validation. */
  validation?: SchemaFormValidationOptions;
  /** JSON Schema definition with vendor extensions (x-ui, x-db, x-zod) */
  schema: JSONSchema;
  /** 表示モード */
  mode: DetailMode;
  /** 現在の値 */
  values?: Partial<TFieldValues>;
  /** 送信ボタンのラベル */
  submitLabel?: 'create' | 'update';
  /** フォーム送信時のハンドラ */
  onSubmit?: (values: TFieldValues) => void | Promise<void>;
  /** キャンセル時のハンドラ */
  onCancel?: () => void;
  /** 削除時のハンドラ */
  onDelete?: () => void;
  /** 編集モード切り替えハンドラ */
  onEdit?: () => void;
  /** 編集ボタンを表示 */
  showEditButton?: boolean;
  /** グループ表示スタイル */
  groupDisplay?: GroupDisplay;
  /** リレーションデータ */
  relations?: Record<string, RelatedFieldConfig>;

  // 新しいレイアウトオプション

  /**
   * 中央揃えコンテナレイアウトを使用
   * @default true
   */
  containerLayout?: boolean;
  /**
   * コンテナの最大幅
   * @default "4xl"
   */
  maxWidth?: FormContainerWidth;
  /**
   * スティッキーアクションバーを有効化
   * @default false
   */
  stickyActions?: boolean;
  /**
   * プログレッシブディスクロージャー (advanced フィールドを折りたたみ)
   * @default true
   */
  progressiveDisclosure?: boolean;
  /**
   * 保存状態インジケーター
   */
  saveStatus?: SaveStatus;
  /**
   * レスポンシブグリッドを使用 (field.width を考慮)
   * @default true
   */
  useGrid?: boolean;
  /**
   * グリッドの列数
   * @default 2
   */
  gridColumns?: 1 | 2 | 3;

  /**
   * カスタムフォームコンテンツ (schema による自動生成を上書き)
   */
  children?: React.ReactNode;

  className?: string;
}

/**
 * 拡張されたフィールドを通常と高度に分離 (JSONSchema版)
 */
const separateAdvancedFields = (
  schema: JSONSchema,
): { standard: JSONSchema; advanced: JSONSchema } => {
  const standardProps: Record<string, JSONSchemaProperty> = {};
  const advancedProps: Record<string, JSONSchemaProperty> = {};

  const properties = schema.properties || {};

  for (const [key, prop] of Object.entries(properties)) {
    if (prop['x-ui']?.advanced) {
      advancedProps[key] = prop;
    } else {
      standardProps[key] = prop;
    }
  }

  return {
    standard: { ...schema, properties: standardProps },
    advanced: { ...schema, title: `${schema.title || ''}_advanced`, properties: advancedProps },
  };
};

/**
 * デスクトップ最適化された詳細/編集ページコンポーネント
 *
 * UXベストプラクティスに基づく拡張レイアウト機能:
 * - 中央揃えの読みやすいコンテナ幅
 * - レスポンシブグリッドレイアウト (モバイル1列、デスクトップ2列)
 * - プログレッシブディスクロージャー (advanced フィールドの折りたたみ)
 * - スティッキーアクションバー
 * - 保存状態インジケーター
 *
 * @example
 * ```tsx
 * <EnhancedDetailPage
 *   schema={userSchema}
 *   mode="edit"
 *   values={userData}
 *   onSubmit={handleSave}
 *   containerLayout
 *   stickyActions
 *   progressiveDisclosure
 * />
 * ```
 */
export function EnhancedDetailPage<TFieldValues extends FieldValues>({
  schema,
  validation,
  mode,
  values,
  submitLabel = 'update',
  onSubmit,
  onCancel,
  onDelete,
  onEdit,
  showEditButton = false,
  groupDisplay,
  relations,
  containerLayout = true,
  maxWidth = '4xl',
  stickyActions = false,
  progressiveDisclosure = true,
  saveStatus = 'idle',
  useGrid = true,
  children,
  className,
}: EnhancedDetailPageProps<TFieldValues>) {
  const form = useForm<TFieldValues>({
    defaultValues: values as DefaultValues<TFieldValues>,
    resolver: validation ? createAjvResolver<TFieldValues>(schema, validation) : undefined,
  });
  const { dirtyFields } = form.formState;
  React.useEffect(() => { if (values) form.reset(values as TFieldValues, { keepDirtyValues: true }); }, [values, form]);
  void dirtyFields;
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // プログレッシブディスクロージャー: 通常/高度フィールドを分離
  const { standard, advanced } = React.useMemo(() => separateAdvancedFields(schema), [schema]);
  const hasAdvancedFields = Object.keys(advanced.properties || {}).length > 0;

  const renderContent = () => (
    <>
      {/* カスタムコンテンツがある場合はそれを優先、ない場合はスキーマ駆動フォームを表示 */}
      {children ? (
        <div className='space-y-6'>{children}</div>
      ) : (
        <>
          {/* 標準フィールド */}
          <SchemaDetailPage
            form={form}
            schema={progressiveDisclosure ? standard : schema}
            mode={mode}
            values={values}
            submitLabel={submitLabel}
            onSubmit={onSubmit}
            onCancel={onCancel}
            onDelete={onDelete}
            onEdit={onEdit}
            showEditButton={!stickyActions && showEditButton}
            hideActions={stickyActions}
            groupDisplay={groupDisplay}
            groupLayout={useGrid ? 'full' : 'column'}
            columnMinWidth={useGrid ? 300 : undefined}
            relations={relations}
          />

          {/* 高度なフィールド (折りたたみ) */}
          {progressiveDisclosure && hasAdvancedFields && (
            <Collapsible
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              className='mt-6 border-t pt-4'
            >
              <CollapsibleTrigger className='flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'>
                <span>{m.common_advanced({ defaultValue: 'Advanced Settings' })}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className='pt-4'>
                <SchemaDetailPage
                  form={form}
                  schema={advanced}
                  mode={mode}
                  values={values}
                  groupDisplay={groupDisplay}
                  groupLayout={useGrid ? 'full' : 'column'}
                  columnMinWidth={useGrid ? 300 : undefined}
                  relations={relations}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* スティッキーアクションバー */}
      {stickyActions && mode === 'edit' && (
        <FormActionBar
          primaryLabel={
            submitLabel === 'create'
              ? m.common_actions_create({ defaultValue: 'Create' })
              : m.common_actions_update({ defaultValue: 'Update' })
          }
          onPrimary={children ? () => containerRef.current?.querySelector('form')?.requestSubmit() : undefined}
          onSecondary={onCancel}
          saveStatus={saveStatus}
          sticky
          tertiaryAction={
            onDelete && (
              <Button type='button' variant='destructive' onClick={onDelete}>
                {m.common_actions_delete({ defaultValue: 'Delete' })}
              </Button>
            )
          }
        />
      )}

      {/* View モードのアクション */}
      {stickyActions && mode === 'view' && showEditButton && (
        <FormActionBar
          primaryLabel={m.common_actions_edit({ defaultValue: 'Edit' })}
          onPrimary={onEdit}
          onSecondary={onCancel}
          sticky
        />
      )}
    </>
  );

  const content = mode === 'edit' && !children ? (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(data => onSubmit?.(data))}>{renderContent()}</form>
    </FormProvider>
  ) : renderContent();

  if (containerLayout) {
    return (
      <FormContainer ref={containerRef} maxWidth={maxWidth} className={className}>
        {content}
      </FormContainer>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {content}
    </div>
  );
}
