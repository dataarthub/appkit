/**
 * Filter Dialog Component
 *
 * Dropdown/popover for filtering tasks by any field.
 */

import { useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import type { GanttFilterField, GanttFilterConfig } from '../types';

export interface FilterDialogProps {
  config: GanttFilterConfig;
  onFilterChange: (values: Record<string, unknown>) => void;
}

/**
 * ガントチャートのタスクを各種条件（ステータス、期間、担当者等）でフィルタリングするためのポップオーバーダイアログコンポーネント。
 */
export function FilterDialog({ config, onFilterChange }: FilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>(config.values || {});
  const effectiveValues = useMemo(
    () => (Object.keys(filterValues).length > 0 ? filterValues : config.values || {}),
    [filterValues, config.values],
  );

  const handleValueChange = (field: string, value: unknown) => {
    const newValues = { ...effectiveValues };
    if (
      value === '' ||
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete newValues[field];
    } else {
      newValues[field] = value;
    }
    setFilterValues(newValues);
  };

  const handleApply = () => {
    onFilterChange(effectiveValues);
    setOpen(false);
  };

  const handleClear = () => {
    setFilterValues({});
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(effectiveValues).length;

  const renderFilterField = (field: GanttFilterField) => {
    const value = effectiveValues[field.field];

    switch (field.type) {
      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => handleValueChange(field.field, v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi-select': {
        const selectedValues = (value as string[]) || [];
        return (
          <div className='flex flex-wrap gap-1'>
            {field.options?.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <Badge
                  key={opt.value}
                  variant={isSelected ? 'default' : 'outline'}
                  className='cursor-pointer'
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter((v) => v !== opt.value)
                      : [...selectedValues, opt.value];
                    handleValueChange(field.field, newValues);
                  }}
                >
                  {opt.label}
                </Badge>
              );
            })}
          </div>
        );
      }

      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => handleValueChange(field.field, e.target.value)}
            placeholder={`Filter by ${field.label}`}
          />
        );

      case 'date-range': {
        const dateRange = (value as { start?: string; end?: string }) || {};
        return (
          <div className='flex gap-2'>
            <Input
              type='date'
              value={dateRange.start || ''}
              onChange={(e) =>
                handleValueChange(field.field, { ...dateRange, start: e.target.value })
              }
              className='flex-1'
            />
            <span className='self-center text-muted-foreground'>~</span>
            <Input
              type='date'
              value={dateRange.end || ''}
              onChange={(e) =>
                handleValueChange(field.field, { ...dateRange, end: e.target.value })
              }
              className='flex-1'
            />
          </div>
        );
      }

      case 'number-range': {
        const numRange = (value as { min?: number; max?: number }) || {};
        return (
          <div className='flex gap-2'>
            <Input
              type='number'
              value={numRange.min ?? ''}
              onChange={(e) =>
                handleValueChange(field.field, {
                  ...numRange,
                  min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className='flex-1'
              placeholder='Min'
            />
            <span className='self-center text-muted-foreground'>~</span>
            <Input
              type='number'
              value={numRange.max ?? ''}
              onChange={(e) =>
                handleValueChange(field.field, {
                  ...numRange,
                  max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className='flex-1'
              placeholder='Max'
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (!config.enabled || !config.fields?.length) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button variant='ghost' size='icon' className='h-7 w-7 relative'>
          <Filter className='h-4 w-4' />
          {activeFilterCount > 0 && (
            <span className='absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center'>
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80' align='end'>
        <div className='grid gap-4'>
          <div className='flex items-center justify-between'>
            <h4 className='font-semibold'>Filters</h4>
            {activeFilterCount > 0 && (
              <Button variant='ghost' size='sm' onClick={handleClear}>
                <X className='h-3 w-3 mr-1' />
                Clear
              </Button>
            )}
          </div>

          {config.fields.map((field) => (
            <div key={field.field} className='grid gap-2'>
              <Label>{field.label}</Label>
              {renderFilterField(field)}
            </div>
          ))}

          <Button onClick={handleApply} className='w-full'>
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
