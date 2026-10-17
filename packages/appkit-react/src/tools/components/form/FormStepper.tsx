import * as React from 'react';
import type { DefaultValues, FieldValues, Path } from 'react-hook-form';
import { useForm, FormProvider } from 'react-hook-form';
import * as m from '../../paraglide/messages.js';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import type { JSONSchema, JSONSchemaProperty } from '../../lib/schema/types';
import { FormContainer, type FormContainerWidth } from './form-container';
import { type SaveStatus } from './form-action-bar';
import { Button } from '../ui/button';
import { cn } from "../../lib/utils";
import type { RelatedFieldConfig } from '../ui/form';
import { createAjvResolver, type SchemaFormValidationOptions } from '../../lib/schema/ajv';
import { SchemaDetailPage } from '../schema/SchemaDetailPage';

/**
 * FormStepperProps
 * マルチステップフォームのプロップス
 *
 * ## AI/Automation Features
 * - `testId`: Container, step indicators, navigation buttons
 * - Pattern:
 *   - Container: `{testId}`
 *   - Steps: `{testId}-step-{index}`
 *   - Navigation: `{testId}-prev`, `{testId}-next`, `{testId}-submit`, `{testId}-cancel`
 * - `data-current-step`: Current step index
 */
/** Step definition for multi-step forms */
type StepDef = NonNullable<JSONSchema['x-steps']>[number];

interface FormStepperProps<TFieldValues extends FieldValues> {
  /** AI/E2E Test用の安定ID / Stable test identifier */
  testId?: string;
  /** JSON Schema definition with x-steps and x-ui.step on properties */
  schema: JSONSchema;
  /** Opt into whole-record schema validation. */
  validation?: SchemaFormValidationOptions;
  /** 初期値 */
  defaultValues?: DefaultValues<TFieldValues>;
  /** フォーム送信時のハンドラ */
  onSubmit?: (values: TFieldValues) => void | Promise<void>;
  /** キャンセル時のハンドラ */
  onCancel?: () => void;
  /** ステップ変更時のハンドラ */
  onStepChange?: (step: number) => void;
  /** リレーションデータ */
  relations?: Record<string, RelatedFieldConfig>;
  /** 保存状態 */
  saveStatus?: SaveStatus;
  /** コンテナの最大幅 */
  maxWidth?: FormContainerWidth;
  /** カスタムステップレンダラー */
  renderStep?: (
    stepIndex: number,
    stepDef: StepDef,
    fields: Record<string, JSONSchemaProperty>,
  ) => React.ReactNode;
  className?: string;
}

/**
 * ステップごとのフィールドを抽出 (JSONSchema版)
 * x-ui.step プロパティに基づいてフィルタ
 */
const getFieldsForStep = (
  schema: JSONSchema,
  stepIndex: number,
): Record<string, JSONSchemaProperty> => {
  const stepNumber = stepIndex + 1; // step は 1-based
  const fields: Record<string, JSONSchemaProperty> = {};

  for (const [key, prop] of Object.entries(schema.properties || {})) {
    if (prop['x-ui']?.step === stepNumber) {
      fields[key] = prop;
    }
  }

  return fields;
};

/**
 * FormStepper Component
 * マルチステップフォームコンポーネント
 *
 * Wizard-style form based on schema steps.
 * スキーマの `steps` 定義と各フィールドの `step` プロパティに基づいてウィザード形式のフォームを表示。
 *
 * ## AI/Automation Features
 * - `data-testid`: Container and navigation elements
 * - `data-current-step`: Current step index for programmatic tracking
 *
 * @example With testId
 * ```tsx
 * <FormStepper
 *   testId="user-registration"
 *   schema={schema}
 *   onSubmit={handleSubmit}
 * />
 * // Container: data-testid="user-registration"
 * // Step buttons: data-testid="user-registration-step-0"
 * // Nav: data-testid="user-registration-prev", "user-registration-next"
 * ```
 */
export function FormStepper<TFieldValues extends FieldValues>({
  testId,
  schema,
  defaultValues,
  validation,
  onSubmit,
  onCancel,
  onStepChange,
  relations,
  saveStatus = 'idle',
  maxWidth = '4xl',
  renderStep,
  className,
}: FormStepperProps<TFieldValues>) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());

  const steps = schema['x-steps'] ?? [];
  const totalSteps = steps.length;

  const form = useForm<TFieldValues>({
    resolver: validation ? createAjvResolver<TFieldValues>(schema, validation) : undefined,
    defaultValues,
  });

  const { dirtyFields } = form.formState;
  React.useEffect(() => { if (defaultValues) form.reset(defaultValues, { keepDirtyValues: true }); }, [defaultValues, form]);
  void dirtyFields;

  // 現在のステップのフィールドを取得
  const currentFields = React.useMemo(
    () => getFieldsForStep(schema, currentStep),
    [schema, currentStep],
  );

  const currentStepSchema: JSONSchema = React.useMemo(
    () => ({
      type: 'object' as const,
      title: `${schema.title || schema['x-db']?.tableName || ''}_step_${currentStep}`,
      properties: currentFields,
      required: (schema.required || []).filter((k) => k in currentFields),
    }),
    [schema, currentStep, currentFields],
  );

  const handleNext = async () => {
    // 現在のステップのフィールドをバリデーション
    const fieldNames = Object.keys(currentFields);

    const isValid = await form.trigger(fieldNames as Array<Path<TFieldValues>>);

    if (isValid) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      if (currentStep < totalSteps - 1) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        onStepChange?.(nextStep);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep);
    }
  };

  const handleSubmit = form.handleSubmit((values) => {
    return onSubmit?.(values);
  });

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  if (totalSteps === 0) {
    // ステップが定義されていない場合は通常のフォームとして表示
    return (
      <FormContainer maxWidth={maxWidth} className={className}>
        <SchemaDetailPage
          schema={schema}
          validation={validation}
          mode='edit'
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={onCancel}
          relations={relations}
        />
      </FormContainer>
    );
  }

  return (
    <FormContainer
      maxWidth={maxWidth}
      className={className}
      data-testid={testId}
      data-current-step={currentStep}
    >
      {/* ステップインジケーター */}
      <nav aria-label='Progress' className='mb-8'>
        <ol className='flex items-center justify-center space-x-4'>
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;
            const isClickable = isCompleted || index < currentStep;

            return (
              <li key={step.name} className='flex items-center'>
                {index > 0 && (
                  <div
                    className={cn(
                      'mr-4 h-0.5 w-8 md:w-12',
                      isCompleted || isCurrent ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                )}
                <button
                  type='button'
                  data-testid={testId ? `${testId}-step-${index}` : undefined}
                  data-state={isCurrent ? 'active' : isCompleted ? 'completed' : 'pending'}
                  onClick={() => {
                    if (isClickable) {
                      setCurrentStep(index);
                      onStepChange?.(index);
                    }
                  }}
                  disabled={!isClickable && !isCurrent}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? (
                    <Check className='h-4 w-4' aria-hidden='true' />
                  ) : (
                    <span className='flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs'>
                      {index + 1}
                    </span>
                  )}
                  <span className='hidden md:inline'>{step.title}</span>
                </button>
              </li>
            );
          })}{' '}
        </ol>
      </nav>

      {/* 現在のステップタイトル */}
      <div className='mb-6 text-center'>
        <h2 className='text-xl font-semibold'>{steps[currentStep]?.title}</h2>
        {steps[currentStep]?.description && (
          <p className='mt-1 text-sm text-muted-foreground'>{steps[currentStep].description}</p>
        )}
      </div>

      {/* フォーム */}
      <FormProvider {...form}>
        <form onSubmit={handleSubmit}>
          {/* ステップコンテンツ */}
          {renderStep ? (
            renderStep(currentStep, steps[currentStep], currentFields)
          ) : currentStepSchema ? (
            <SchemaDetailPage
              form={form}
              schema={currentStepSchema}
              mode='edit'
              values={form.getValues() as Partial<TFieldValues>}
              relations={relations}
              groupDisplay='heading'
            />
          ) : null}

          {/* ナビゲーション */}
          <div data-save-status={isLastStep ? saveStatus : 'idle'} className='mt-8'>
            <div className='flex flex-1 items-center justify-between'>
              <Button
                type='button'
                variant='outline'
                testId={testId ? (isFirstStep ? `${testId}-cancel` : `${testId}-prev`) : undefined}
                onClick={isFirstStep ? onCancel : handlePrevious}
              >
                {isFirstStep ? (
                  m.common_actions_cancel({ defaultValue: 'Cancel' })
                ) : (
                  <>
                    <ChevronLeft className='mr-1 h-4 w-4' aria-hidden='true' />
                    {m.common_actions_previous({ defaultValue: 'Previous' })}
                  </>
                )}
              </Button>

              <span className='text-sm text-muted-foreground'>
                {m.common_stepProgress({
                  current: currentStep + 1,
                  total: totalSteps,
                })}
              </span>

              {isLastStep ? (
                <Button
                  type='submit'
                  testId={testId ? `${testId}-submit` : undefined}
                  disabled={saveStatus === 'saving'}
                >
                  {m.common_actions_submit({ defaultValue: 'Submit' })}
                </Button>
              ) : (
                <Button
                  type='button'
                  testId={testId ? `${testId}-next` : undefined}
                  onClick={handleNext}
                >
                  {m.common_actions_next({ defaultValue: 'Next' })}
                  <ChevronRight className='ml-1 h-4 w-4' aria-hidden='true' />
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </FormContainer>
  );
}
