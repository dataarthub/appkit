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

/**
 * Form values, schema and presentation settings for {@link EnhancedDetailPage}.
 * @typeParam TFieldValues - React Hook Form field-value shape supplied to onSubmit.
 */
interface EnhancedDetailPageProps<TFieldValues extends FieldValues> {
  /** Opt into whole-record schema validation. */
  validation?: SchemaFormValidationOptions;
  /** JSON Schema definition with vendor extensions (x-ui, x-db, x-zod) */
  schema: JSONSchema;
  /** View renders details; edit renders form inputs. */
  mode: DetailMode;
  /** Initial values and later reset values; later updates preserve dirty fields. */
  values?: Partial<TFieldValues>;
  /** Submit action wording; defaults to update. */
  submitLabel?: 'create' | 'update';
  /** Called with form values after configured validation on submit; the host performs persistence. */
  onSubmit?: (values: TFieldValues) => void | Promise<void>;
  /** Called by the cancel action; the host handles navigation or rollback. */
  onCancel?: () => void;
  /** Called by the delete action; the host performs deletion. */
  onDelete?: () => void;
  /** Called by the edit action; the host updates mode. */
  onEdit?: () => void;
  /** Shows the view-mode edit action when true; defaults to false. */
  showEditButton?: boolean;
  /** Group presentation forwarded to SchemaDetailPage; omitted uses its default. */
  groupDisplay?: GroupDisplay;
  /** Related-field display and selection configuration forwarded to SchemaDetailPage. */
  relations?: Record<string, RelatedFieldConfig>;

  // 新しいレイアウトオプション

  /**
   * Wrap content in a centered FormContainer.
   * @defaultValue true
   */
  containerLayout?: boolean;
  /**
   * Maximum width preset when containerLayout is enabled.
   * @defaultValue "4xl"
   */
  maxWidth?: FormContainerWidth;
  /**
   * Use the sticky FormActionBar and hide ordinary generated actions.
   * @defaultValue false
   */
  stickyActions?: boolean;
  /**
   * Separate fields marked x-ui.advanced into a section initially collapsed.
   * @defaultValue true
   */
  progressiveDisclosure?: boolean;
  /**
   * Host-supplied save indicator; defaults to idle and does not track persistence automatically.
   */
  saveStatus?: SaveStatus;
  /**
   * Use SchemaDetailPage groupLayout full and columnMinWidth 300; false uses column layout.
   * @defaultValue true
   */
  useGrid?: boolean;
  /**
   * Reserved compatibility option; currently ignored. Changing it does not set columns.
   * Use useGrid to select the supported layout behavior.
   */
  gridColumns?: 1 | 2 | 3;

  /**
   * Replace generated content. The caller supplies its own form, submission wiring and providers.
   */
  children?: React.ReactNode;

  /** Additional classes on the outer container. */
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
 * Renders schema-driven view/edit content with an optional container, advanced fields and action bar.
 * @typeParam TFieldValues - React Hook Form value shape passed to the submit callback.
 * @param props - Schema, host-owned values/actions and layout settings; see EnhancedDetailPageProps.
 * @returns The detail content inside a centered container or plain div.
 * @remarks Import Appkit CSS. Generated edit content supplies its own React Hook Form provider
 * and form element; validation is opt-in via validation. Later values updates preserve dirty fields.
 * The host owns persistence, saveStatus, mode changes and errors from async onSubmit.
 * Custom children replace generated content and must supply their own form/provider wiring.
 * gridColumns is ignored; useGrid selects SchemaDetailPage layout and a 300px column minimum,
 * without guaranteeing an exact number of columns. No fixed two-column default is implemented.
 * @example
 * ```tsx
 * import { EnhancedDetailPage } from '@alneas/appkit-react/tools/form';
 * import '@alneas/appkit-react/styles';
 *
 * export function UserDetails() {
 *   return <EnhancedDetailPage<{ name: string }> mode="view"
 *     schema={{ type: 'object', properties: { name: { type: 'string', title: 'Name' } } }}
 *     values={{ name: 'Ada' }} />;
 * }
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
