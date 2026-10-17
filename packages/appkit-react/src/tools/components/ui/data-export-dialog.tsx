'use client';

import React, { useState, useMemo } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Checkbox } from './checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Download, ArrowUp, ArrowDown, FileSpreadsheet, FileText } from 'lucide-react';
import type { ExcelAdapter, ExcelWorkbookData } from "../../lib/excel/types";
import { MockExcelAdapter } from "../../lib/excel/mock-adapter";
import { CsvExcelAdapter } from "../../lib/excel/csv-adapter";
import { useExcelExport } from "../../lib/excel/use-excel-export";

export interface ExportColumnMapping {
  columnId: string;
  columnLabel: string;
  include: boolean;
  order: number;
  customLabel?: string;
  type?: 'string' | 'number' | 'boolean' | 'date';
}

export interface DataExportDialogProps<TData> {
  /** ダイアログタイトル */
  title?: string;
  /** 全データ */
  data: TData[];
  /** フィルター適用後データ */
  filteredData?: TData[];
  /** 選択行データ */
  selectedData?: TData[];
  /** カラム定義 */
  columns: Array<Record<string, unknown>>;
  /** カラムのメタデータ（表示名など） */
  columnMetadata?: Record<string, { label: string }>;
  /** 初期表示カラム */
  visibleColumns?: string[];
  /** トリガー要素 */
  trigger?: React.ComponentProps<typeof DialogTrigger>['render'];
  /** Excel アダプタ（未指定時は MockExcelAdapter） */
  excelAdapter?: ExcelAdapter;
  /** ダイアログの開閉状態 */
  open?: boolean;
  /** ダイアログの開閉コールバック */
  onOpenChange?: (open: boolean) => void;
  /** デフォルトファイル名 */
  defaultFilename?: string;
  /** 完了時コールバック */
  onSuccess?: () => void;
  /** エラー時コールバック */
  onError?: (error: unknown) => void;
}

/**
 * データ一覧を Excel（.xlsx）または CSV（.csv）としてエクスポートする統合ダイアログコンポーネント。
 */
export function DataExportDialog<TData>({
  title = 'データエクスポート',
  data,
  filteredData = [],
  selectedData = [],
  columns,
  columnMetadata,
  visibleColumns,
  trigger,
  excelAdapter,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultFilename = 'export',
  onSuccess,
  onError,
}: DataExportDialogProps<TData>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (!isControlled) {
      setInternalOpen(val);
    }
    controlledOnOpenChange?.(val);
  };

  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [scope, setScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [filename, setFilename] = useState(defaultFilename);

  // カラムマッピングの初期化
  const [mappings, setMappings] = useState<ExportColumnMapping[]>(() => {
    return columns.map((col, idx) => {
      const colId =
        (col as { id?: string }).id ||
        (col as { accessorKey?: string }).accessorKey ||
        `col_${idx}`;
      const header =
        columnMetadata?.[colId]?.label ||
        (typeof (col as { header?: unknown }).header === 'string'
          ? ((col as { header?: string }).header as string)
          : colId);
      const isVisible = visibleColumns ? visibleColumns.includes(colId) : true;

      return {
        columnId: colId,
        columnLabel: header,
        include: isVisible,
        order: idx,
        customLabel: header,
      };
    });
  });

  // アクティブなアダプタ
  const activeAdapter = useMemo(() => {
    if (format === 'csv') {
      return new CsvExcelAdapter();
    }
    return excelAdapter || new MockExcelAdapter();
  }, [format, excelAdapter]);

  const { exportExcel, isExporting, error } = useExcelExport(activeAdapter);

  // エクスポート対象データの解決
  const exportData = useMemo(() => {
    switch (scope) {
      case 'selected':
        return selectedData.length > 0 ? selectedData : data;
      case 'filtered':
        return filteredData.length > 0 ? filteredData : data;
      case 'all':
      default:
        return data;
    }
  }, [scope, data, filteredData, selectedData]);

  // カラム順序の移動
  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newMappings = [...mappings];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMappings.length) return;

    const temp = newMappings[index];
    newMappings[index] = newMappings[targetIndex];
    newMappings[targetIndex] = temp;

    newMappings.forEach((m, idx) => {
      m.order = idx;
    });
    setMappings(newMappings);
  };

  // エクスポート実行
  const handleExport = async () => {
    const includedCols = mappings
      .filter((m) => m.include)
      .sort((a, b) => a.order - b.order);

    if (includedCols.length === 0) {
      alert('少なくとも1つの列を選択してください。');
      return;
    }

    const workbookData: ExcelWorkbookData = {
      metadata: {
        title: filename,
      },
      sheets: [
        {
          name: 'Data',
          columns: includedCols.map((m) => ({
            header: m.customLabel || m.columnLabel,
            key: m.columnId,
          })),
          rows: exportData.map((item) => {
            const rowObj: Record<string, unknown> = {};
            includedCols.forEach((m) => {
              const val = (item as Record<string, unknown>)[m.columnId];
              rowObj[m.columnId] = val;
            });
            return rowObj;
          }),
        },
      ],
    };

    try {
      const ext = format === 'xlsx' ? '.xlsx' : '.csv';
      const outName = filename.endsWith(ext) ? filename : `${filename}${ext}`;
      await exportExcel(workbookData, outName);
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      onError?.(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      {!trigger && (
        <DialogTrigger render={<Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>} />
      )}

      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            出力フォーマット（Excel / CSV）と対象カラム・範囲を設定してダウンロードします。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">基本設定</TabsTrigger>
            <TabsTrigger value="columns">カラム設定 ({mappings.filter((m) => m.include).length}/{mappings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 py-4 flex-1 overflow-y-auto">
            {/* フォーマット選択 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">出力形式</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('xlsx')}
                  className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-all ${
                    format === 'xlsx'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className={`w-6 h-6 ${format === 'xlsx' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm font-semibold">Excel ワークブック</div>
                    <div className="text-xs text-slate-500">.xlsx 形式（書式付き・複数シート対応）</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-all ${
                    format === 'csv'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileText className={`w-6 h-6 ${format === 'csv' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm font-semibold">CSV テキスト</div>
                    <div className="text-xs text-slate-500">.csv 形式（UTF-8 BOM付き）</div>
                  </div>
                </button>
              </div>
            </div>

            {/* ファイル名 */}
            <div className="space-y-1">
              <Label htmlFor="filename" className="text-xs font-semibold">ファイル名</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="export"
                  className="flex-1"
                />
                <span className="text-sm text-slate-500 font-mono">.{format}</span>
              </div>
            </div>

            {/* 出力範囲 */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">出力範囲</Label>
              <Select
                value={scope}
                onValueChange={(val) => {
                  if (val) setScope(val as 'all' | 'filtered' | 'selected');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全件 ({data.length} 件)</SelectItem>
                  <SelectItem value="filtered" disabled={filteredData.length === 0}>
                    フィルター適用後のデータ ({filteredData.length} 件)
                  </SelectItem>
                  <SelectItem value="selected" disabled={selectedData.length === 0}>
                    選択された行のみ ({selectedData.length} 件)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="columns" className="flex-1 overflow-y-auto py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">出力</TableHead>
                  <TableHead>元のカラム名</TableHead>
                  <TableHead>出力時のヘッダー名</TableHead>
                  <TableHead className="w-20 text-center">順序</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, idx) => (
                  <TableRow key={mapping.columnId}>
                    <TableCell>
                      <Checkbox
                        checked={mapping.include}
                        onCheckedChange={(checked) => {
                          const newMappings = [...mappings];
                          newMappings[idx].include = Boolean(checked);
                          setMappings(newMappings);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">
                      {mapping.columnLabel}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={mapping.customLabel || ''}
                        onChange={(e) => {
                          const newMappings = [...mappings];
                          newMappings[idx].customLabel = e.target.value;
                          setMappings(newMappings);
                        }}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveColumn(idx, 'up')}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === mappings.length - 1}
                          onClick={() => moveColumn(idx, 'down')}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-md">
            {error.message}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            キャンセル
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'エクスポート中...' : `${format.toUpperCase()} をダウンロード`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `<DataExportDialog>` の別名エイリアス */
export const ExcelDownloadDialog = DataExportDialog;
