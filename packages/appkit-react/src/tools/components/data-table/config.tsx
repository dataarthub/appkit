import { ColumnDef } from './table-engine';
import { format, parseISO, isValid } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';

export type ColumnType =
  | 'text'
  | 'integer'
  | 'float'
  | 'date'
  | 'time'
  | 'timeString'
  | 'option'
  | 'picking' // Using 'pick' might conflict? User said 'pick'.
  | 'pick'
  | 'action'
  | 'badge'
  | 'icon'
  | string; // Allow case variations

export interface SimpleColumnDef {
  field: string;
  text: string;
  id?: string;
  type?: ColumnType;
  optionKey?: string;
  width?: number | string;
  onClick?: (value: unknown) => void;

  component?: React.ComponentType<{
    onClick?: () => void;
    className?: string;
    children?: React.ReactNode;
  }>;
  colorMap?: Record<string, string>; // Value -> ClassName

  iconMap?: Record<string, React.ComponentType<{ className?: string }>>;
}

export type ColumnConfig = SimpleColumnDef | SimpleColumnDef[];

function compareValues(valueA: unknown, valueB: unknown): number {
  if (valueA === valueB) return 0;

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA > valueB ? 1 : -1;
  }

  const a = String(valueA);
  const b = String(valueB);
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function renderText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

const customSort = (rowA: { getValue(id: string): unknown }, rowB: { getValue(id: string): unknown }, columnId: string) => {
  const valueA = rowA.getValue(columnId);
  const valueB = rowB.getValue(columnId);

  // Handle composite values { v1, v2 }
  if (valueA && typeof valueA === 'object' && 'v1' in valueA) {
    const a = valueA as { v1: unknown; v2: unknown };
    const b = valueB as { v1: unknown; v2: unknown };
    if (a.v1 === b.v1) {
      return compareValues(a.v2, b.v2);
    }
    return compareValues(a.v1, b.v1);
  }

  // Handle empty values (null, undefined, "") -> Push to bottom
  const isEmpty = (v: unknown) => v === null || v === undefined || v === '';
  if (isEmpty(valueA) && isEmpty(valueB)) return 0;
  if (isEmpty(valueA)) return 1;
  if (isEmpty(valueB)) return -1;

  // Default string/number comparison
  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return compareValues(valueA, valueB);
  }
  return compareValues(valueA, valueB);
};

/**
 * 簡易列定義の配列から、TanStack Table 互換の列定義オブジェクト（ColumnDef）の配列を生成するユーティリティ関数。
 * @param config 列構成の設定配列
 * @param optionsMap オプションの表示用マッピングテーブル
 * @returns TanStack Table 用の列定義配列
 */
export function createColumns<TData extends object>(
  config: ColumnConfig[],
  optionsMap?: Record<string, Record<string | number, string>>,
): ColumnDef<TData>[] {
  return config.map((colItem): ColumnDef<TData> => {
    // Handle composite column (array of definitions)
    if (Array.isArray(colItem)) {
      const primary = colItem[0];
      const secondary = colItem[1];
      return {
        id: `${primary.field}_${secondary.field}`,
        header: ({ column }) => (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='-ml-4 h-8'
          >
            {primary.text} / {secondary.text}
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        ),
        accessorFn: (row) => {
          const r = row as Record<string, unknown>;
          // Helper to get value
          const getV = (field: string) =>
            field.split('.').reduce<unknown>((o, k) => {
              if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
                return (o as Record<string, unknown>)[k];
              }
              return undefined;
            }, r);
          return { v1: getV(primary.field), v2: getV(secondary.field) };
        },
        sortFn: customSort,
        cell: ({ getValue }) => {
          const val = getValue() as { v1?: unknown; v2?: unknown };
          // Format if needed (simplification: assume direct display or simple formatting)
          const f1 = val.v1 instanceof Date ? format(val.v1, 'yyyy/MM/dd') : val.v1;
          const f2 = val.v2 instanceof Date ? format(val.v2, 'yyyy/MM/dd') : val.v2;
          return (
            <div className='flex flex-col'>
              <span>{renderText(f1)}</span>
              <span className='text-xs text-muted-foreground'>{renderText(f2)}</span>
            </div>
          );
        },
      };
    }

    const col = colItem as SimpleColumnDef;
    const rawType = col.type || 'text';
    const typeLower = rawType.toLowerCase();

    const headerText = col.text;
    const accessorKey = col.field;

    // Handle "Pick" column (formerly Select)
    if (typeLower === 'pick') {
      return {
        id: 'select',
        header: ({ table }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected()}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label='Select all'
            />
          </div>
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label='Select row'
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      };
    }

    return {
      accessorKey,
      id: col.id || accessorKey,
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='-ml-4 h-8 data-[state=open]:bg-accent'
          >
            {headerText}
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      sortFn: customSort,
      cell: ({ row }) => {
        const value = row.getValue(col.id || accessorKey) as unknown;

        if (value === null || value === undefined || value === '') {
          return <div className='text-muted-foreground'>-</div>;
        }

        // Check complex types first
        if (typeLower.startsWith('text(')) {
          const match = typeLower.match(/text\((\d+)\)/);
          const param = match ? parseInt(match[1], 10) : undefined;
          if (param && typeof value === 'string' && value.length > param) {
            return <span title={value}>{value.substring(0, param)}...</span>;
          }
          return renderText(value);
        }

        if (typeLower.startsWith('float(')) {
          const match = typeLower.match(/float\((\d+)\)/);
          const param = match ? parseInt(match[1], 10) : 2;
          if (typeof value === 'number') {
            return value.toLocaleString(undefined, {
              minimumFractionDigits: param,
              maximumFractionDigits: param,
            });
          }
          return renderText(value);
        }

        switch (typeLower) {
          case 'text':
            return renderText(value);

          case 'integer':
            if (typeof value === 'number') {
              return Math.round(value).toLocaleString();
            }
            return renderText(value);

          case 'float':
            if (typeof value === 'number') {
              return value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            }
            return renderText(value);

          case 'date':
            if (value instanceof Date) {
              return format(value, 'yyyy/MM/dd');
            } else if (typeof value === 'string') {
              const d = parseISO(value);
              if (isValid(d)) return format(d, 'yyyy/MM/dd');
            }
            return renderText(value);

          case 'time':
            if (value instanceof Date) {
              return format(value, 'HH:mm');
            }
            return renderText(value);

          case 'timestring':
            return renderText(value);

          case 'option':
            if (col.optionKey && optionsMap && optionsMap[col.optionKey]) {
              if (typeof value === 'string' || typeof value === 'number') {
                return optionsMap[col.optionKey][value] ?? value;
              }
            }
            return renderText(value);

          case 'badge': {
            let displayValue = value;
            if (col.optionKey && optionsMap && optionsMap[col.optionKey]) {
              if (typeof value === 'string' || typeof value === 'number') {
                displayValue = optionsMap[col.optionKey][value] ?? value;
              }
            }
            const colorClass =
              col.colorMap?.[String(value)] || 'bg-secondary text-secondary-foreground';
            return (
              <Badge className={`hover:bg-current/80 ${colorClass} border-none`}>
                {renderText(displayValue)}
              </Badge>
            );
          }

          case 'icon': {
            if (!col.iconMap) return null;
            const IconComponent = col.iconMap[String(value)];
            if (!IconComponent) return null;
            const iconColorClass = col.colorMap?.[String(value)] || '';
            return <IconComponent className={`h-4 w-4 ${iconColorClass}`} />;
          }

          case 'action': {
            const Component = col.component || Button;
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Component onClick={() => col.onClick && col.onClick(value)} className='h-8 px-2'>
                  {col.text || 'Action'}
                </Component>
              </div>
            );
          }

          default:
            return renderText(value);
        }
      },
    };
  });
}
