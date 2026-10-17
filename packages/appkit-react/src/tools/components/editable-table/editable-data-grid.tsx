import React, { useState, useMemo } from 'react';
import { EditableTable, type EditableTableColumn } from './editable-table';
import { Button } from '../ui/button';
import { Save, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export interface EditableDataGridColumn<T> extends Omit<EditableTableColumn<T>, 'render'> {
  /** セルのレンダラー。第3引数にその行の値を更新する update 関数を受け取ります。 */
  render?: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
}

export interface EditableDataGridProps<T> {
  /** グリッドのタイトル */
  title: string;
  /** タイトルの横に表示するサブタイトル（例: ドメイン種別など） */
  subtitle?: string;
  /** オリジナルデータソース */
  data: T[];
  /** カラム定義 */
  columns: EditableDataGridColumn<T>[];
  /** 保存処理のコールバック。変更があった行（dirtyRows）の配列を受け取ります。 */
  onSave: (dirtyRows: T[]) => Promise<void> | void;
  /** 新規行追加時の初期データファクトリ */
  onAddRow: () => T;
  /** 削除ボタン押下時のコールバック */
  onRemoveRow?: (row: T, index: number) => Promise<void> | void;
  /** 行キーのゲッター */
  getRowKey?: (item: T, index: number) => string;
  /** ダーティ判定用のカスタム関数。省略された場合は全プロパティの簡易比較を行います。 */
  isItemDirty?: (original: T, current: T) => boolean;
  /** フィルター用のカスタム UI コンポーネント */
  filterComponent?: React.ReactNode;
  /** 空白時のメッセージ */
  emptyMessage?: string;
  /** クラス名 */
  className?: string;
}

const defaultIsDirty = <T extends Record<string, unknown>>(original: T, current: T) => {
  if (!original.id) return true; // 新規行
  const keys = Object.keys({ ...original, ...current }).filter(
    (k) => k !== 'client' && k !== 'user',
  );
  for (const key of keys) {
    if (original[key] !== current[key]) {
      return true;
    }
  }
  return false;
};

/**
 * インライン編集、変更行のダーティ追跡、およびバッチ保存機能を備えた
 * 高級感のあるテーブル/グリッドUIコンポーネントです。
 */
export function EditableDataGrid<T extends Record<string, unknown>>({
  title,
  subtitle,
  data,
  columns,
  onSave,
  onAddRow,
  onRemoveRow,
  getRowKey,
  isItemDirty,
  filterComponent,
  emptyMessage,
  className = '',
}: EditableDataGridProps<T>) {
  const [localData, setLocalData] = useState<T[]>(data ? JSON.parse(JSON.stringify(data)) : []);
  const [prevData, setPrevData] = useState<T[] | undefined>(data);

  if (data !== prevData) {
    setLocalData(data ? JSON.parse(JSON.stringify(data)) : []);
    setPrevData(data);
  }

  const [isSaving, setIsSaving] = useState(false);

  const isRowDirty = React.useCallback(
    (index: number) => {
      const current = localData[index];
      if (!current) return false;
      if (!current.id) return true; // id が無ければ新規行として dirty

      const original = data.find((item) => item.id === current.id);
      if (!original) return true;

      if (isItemDirty) {
        return isItemDirty(original, current);
      }
      return defaultIsDirty(original, current);
    },
    [localData, data, isItemDirty],
  );

  const dirtyIndices = useMemo(() => {
    const indices = new Set<number>();
    localData.forEach((_, idx) => {
      if (isRowDirty(idx)) {
        indices.add(idx);
      }
    });
    return indices;
  }, [localData, isRowDirty]);

  const handleSaveAll = async () => {
    const dirtyRows = localData.filter((_, idx) => dirtyIndices.has(idx));
    if (dirtyRows.length === 0) return;

    setIsSaving(true);
    try {
      await onSave(dirtyRows);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = () => {
    const newRow = onAddRow();
    setLocalData([...localData, newRow]);
  };

  const handleRemove = async (index: number) => {
    const row = localData[index];
    if (!row) return;

    if (row.id) {
      if (onRemoveRow) {
        await onRemoveRow(row, index);
      }
    } else {
      const next = [...localData];
      next.splice(index, 1);
      setLocalData(next);
    }
  };

  const updateField = React.useCallback((index: number, patch: Partial<T>) => {
    setLocalData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  // Modify columns to inject update handlers
  const decoratedColumns = useMemo(() => {
    return columns.map((col) => {
      if (col.render) {
        return {
          ...col,
          render: (item: T, index: number) => {
            const updateRow = (patch: Partial<T>) => {
              updateField(index, patch);
            };
            return col.render ? col.render(item, index, updateRow) : null;
          },
        } as EditableTableColumn<T>;
      }
      return col as EditableTableColumn<T>;
    });
  }, [columns, updateField]);

  return (
    <Card className={`shadow-sm border-primary/10 overflow-hidden ${className}`}>
      <CardHeader className='flex flex-col gap-4 bg-primary/5 pb-4'>
        <div className='flex flex-row items-center justify-between'>
          <CardTitle className='text-lg font-bold flex items-center gap-2'>
            {title}
            {subtitle && (
              <span className='text-sm font-normal text-muted-foreground'>({subtitle})</span>
            )}
          </CardTitle>
          <div className='flex items-center gap-2'>
            {dirtyIndices.size > 0 && (
              <span className='text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200'>
                未保存: {dirtyIndices.size}件
              </span>
            )}
            <Button
              size='sm'
              variant='default'
              onClick={handleSaveAll}
              disabled={dirtyIndices.size === 0 || isSaving}
              className='gap-1 shadow-sm'
            >
              <Save className='h-4 w-4' />
              一括保存
            </Button>
            <Button size='sm' onClick={handleAdd} className='gap-1 shadow-sm'>
              <Plus className='h-4 w-4' />
              行追加
            </Button>
          </div>
        </div>

        {filterComponent && (
          <div className='flex items-center gap-3 bg-background/80 p-3 rounded-lg border border-primary/10 shadow-inner'>
            {filterComponent}
          </div>
        )}
      </CardHeader>

      <CardContent className='pt-0 px-0'>
        <EditableTable<T>
          columns={decoratedColumns}
          data={localData}
          emptyMessage={emptyMessage}
          onRemove={handleRemove}
          onAddRow={handleAdd}
          getRowKey={getRowKey}
        />
      </CardContent>
    </Card>
  );
}
