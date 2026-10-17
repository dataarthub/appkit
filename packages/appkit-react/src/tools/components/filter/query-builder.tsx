'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FilterInput } from './filter-inputs';
import {
  CollectionSchema,
  FilterOperator,
  FilterValue,
  FilterResult,
  resolveFilterField,
} from './filter-types';
import { valueToQuery } from './use-filter';

export interface QueryCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterValue;
  isFixed?: boolean;
}

export interface QueryBuilderFilterProps {
  schema: CollectionSchema;
  defaultConditions?: QueryCondition[];
  initialFields?: string[];
  onChange?: (conditions: QueryCondition[], filter: FilterResult) => void;
  testId?: string;
}

const getAvailableOperators = (type: string): { value: FilterOperator; label: string }[] => {
  switch (type) {
    case 'string':
      return [
        { value: 'contains', label: '部分一致' },
        { value: 'eq', label: '完全一致' },
        { value: 'startsWith', label: '前方一致' },
        { value: 'endsWith', label: '後方一致' },
      ];
    case 'number':
    case 'date':
      return [
        { value: 'eq', label: '完全一致' },
        { value: 'range', label: '範囲' },
      ];
    default:
      return [{ value: 'eq', label: '完全一致' }];
  }
};

const buildFilterResult = (
  conditions: QueryCondition[],
  schema: CollectionSchema,
): FilterResult => {
  const andConditions: Record<string, unknown>[] = [];
  for (const cond of conditions) {
    if (!cond.field || cond.value === undefined || cond.value === null || cond.value === '')
      continue;

    const fieldSpec = resolveFilterField({ field: cond.field, operator: cond.operator }, schema);
    const qv = valueToQuery(fieldSpec, cond.value);
    if (qv !== undefined) {
      andConditions.push({ [cond.field]: qv });
    }
  }

  if (andConditions.length === 1) {
    return andConditions[0] as FilterResult;
  } else if (andConditions.length > 1) {
    return { $and: andConditions } as FilterResult;
  }
  return {};
};

/**
 * 動的な条件構築が可能なクエリビルダー形式のフィルターコンポーネント。
 *
 * ユーザーがフィールド、演算子、値を自由に組み合わせてフィルタリング条件を
 * 追加・削除できるUIを提供します。
 *
 * @example
 * ```tsx
 * <QueryBuilderFilter
 *   schema={userSchema}
 *   initialFields={['name']}
 *   onChange={(conditions, filter) => setFilter(filter)}
 * />
 * ```
 */
export function QueryBuilderFilter({
  schema,
  defaultConditions,
  initialFields,
  onChange,
  testId,
}: QueryBuilderFilterProps) {
  const [conditions, setConditions] = useState<QueryCondition[]>(() => {
    if (defaultConditions && defaultConditions.length > 0) return defaultConditions;

    if (initialFields && initialFields.length > 0) {
      return initialFields.map((fieldName) => {
        const fieldDef = schema[fieldName];
        return {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          field: fieldName,
          operator: fieldDef?.type === 'string' ? 'contains' : 'eq',
          value: undefined,
          isFixed: true,
        };
      });
    }

    return [];
  });

  // Get all available fields from schema
  const availableFields = Object.entries(schema).map(([key, field]) => ({
    value: key,
    label: field.label || key,
    type: field.type,
  }));

  const updateAndNotify = (newConditions: QueryCondition[]) => {
    setConditions(newConditions);
    if (onChange) {
      const filterResult = buildFilterResult(newConditions, schema);
      onChange(newConditions, filterResult);
    }
  };

  const addCondition = () => {
    const firstField = availableFields[0];
    updateAndNotify([
      ...conditions,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        field: firstField ? firstField.value : '',
        operator: firstField?.type === 'string' ? 'contains' : 'eq',
        value: undefined,
      },
    ]);
  };

  const removeCondition = (id: string) => {
    updateAndNotify(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<QueryCondition>) => {
    const newConditions = conditions.map((c) => {
      if (c.id === id) {
        const newCond = { ...c, ...updates };
        // If field changes, reset operator and value
        if (updates.field && updates.field !== c.field) {
          const fieldDef = schema[updates.field];
          newCond.operator = fieldDef?.type === 'string' ? 'contains' : 'eq';
          newCond.value = undefined;
        }
        return newCond;
      }
      return c;
    });
    updateAndNotify(newConditions);
  };

  return (
    <div className='space-y-3' data-testid={testId}>
      {conditions.map((cond) => {
        const fieldDef = schema[cond.field];
        const resolvedField = fieldDef
          ? resolveFilterField({ field: cond.field, operator: cond.operator }, schema)
          : null;
        const operators = fieldDef ? getAvailableOperators(fieldDef.type) : [];

        return (
          <div
            key={cond.id}
            className='flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-md border border-dashed'
          >
            {/* Field Selector */}
            <Select
              value={cond.field}
              onValueChange={(val) => {
                if (val !== null) updateCondition(cond.id, { field: val });
              }}
            >
              <SelectTrigger className='w-[200px] h-9 bg-background'>
                <SelectValue placeholder='フィールドを選択...' />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator Selector */}
            <Select
              value={cond.operator}
              onValueChange={(val: FilterOperator | null) => {
                if (val !== null) updateCondition(cond.id, { operator: val });
              }}
              disabled={!cond.field}
            >
              <SelectTrigger className='w-[140px] h-9 bg-background'>
                <SelectValue placeholder='条件を選択...' />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value Input */}
            <div className='flex-1 min-w-[200px]'>
              {resolvedField && (
                <FilterInput
                  field={resolvedField}
                  value={cond.value}
                  onChange={(val) => updateCondition(cond.id, { value: val })}
                  className='h-9 w-full bg-background'
                  showPlaceholderOnAll
                />
              )}
            </div>

            {/* Remove Button */}
            {!cond.isFixed ? (
              <Button
                variant='ghost'
                size='icon'
                className='h-9 w-9 text-muted-foreground hover:text-destructive shrink-0'
                onClick={() => removeCondition(cond.id)}
                title='条件を削除'
              >
                <X className='h-4 w-4' />
              </Button>
            ) : (
              <div className='w-9' />
            )}
          </div>
        );
      })}

      <Button variant='outline' size='sm' onClick={addCondition} className='border-dashed h-9'>
        <Plus className='mr-2 h-4 w-4' />
        条件を追加
      </Button>
    </div>
  );
}
