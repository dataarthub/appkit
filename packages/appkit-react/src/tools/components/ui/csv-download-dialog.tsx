import React, { useState, useCallback } from 'react';
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
import { Download, ArrowUp, ArrowDown } from 'lucide-react';
import {
  CSVGenerator,
  type CSVConfig,
  DEFAULT_CSV_CONFIG,
  type ColumnMapping,
} from '../../lib/csv/generator';

// Download options
export interface DownloadOptions {
  scope: 'all' | 'filtered' | 'selected';
  filename: string;
  config: CSVConfig;
  columnMappings: ColumnMapping[];
}

// Props for CSV download dialog
export interface CSVDownloadDialogProps<TData> {
  title: string;
  data: TData[];
  filteredData: TData[];
  selectedData: TData[];
  columns: Array<Record<string, unknown>>; // ColumnDef compatible
  columnMetadata?: Record<string, { label: string }>;
  visibleColumns?: string[];
  columnOrder?: string[];
  trigger?: React.ComponentProps<typeof DialogTrigger>['render'];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * データをCSV形式でダウンロードするためのダイアログコンポーネント。
 *
 * 列の選択、並び替え、ラベルの変更、およびフィルタリング済みデータの
 * ダウンロード範囲指定（すべて / フィルター済み / 選択済み）をサポートします。
 */
export function CSVDownloadDialog<TData>({
  title,
  data,
  filteredData,
  selectedData,
  columns,
  columnMetadata = {},
  visibleColumns,
  columnOrder,
  trigger,
  open,
  onOpenChange,
}: CSVDownloadDialogProps<TData>) {
  const [options, setOptions] = useState<DownloadOptions>({
    scope: 'filtered',
    filename: `${title}_${new Date().toISOString().split('T')[0]}.csv`,
    config: { ...DEFAULT_CSV_CONFIG, escapeFormulae: true },
    columnMappings: [],
  });
  const [previewData, setPreviewData] = useState<string>('');

  // Initialize column mappings
  const initializeColumnMappings = useCallback(() => {
    if (!columns || columns.length === 0) {
      return;
    }

    // Get columns that are currently visible in the table
    let columnsToUse = columns.filter((col) => {
      const colId = (col as { id?: string }).id || (col as { accessorKey?: string }).accessorKey;
      return colId !== 'actions';
    });

    // If visibleColumns is provided, filter to only show visible columns
    if (visibleColumns && visibleColumns.length > 0) {
      columnsToUse = columnsToUse.filter((col) => {
        const colId = (col as { id?: string }).id || (col as { accessorKey?: string }).accessorKey;
        return visibleColumns.includes(colId || '');
      });
    }

    // If columnOrder is provided, sort columns according to the table order
    if (columnOrder && columnOrder.length > 0) {
      columnsToUse.sort((a, b) => {
        const aId = (a as { id?: string }).id || (a as { accessorKey?: string }).accessorKey;
        const bId = (b as { id?: string }).id || (b as { accessorKey?: string }).accessorKey;
        const aIndex = columnOrder.indexOf(aId || '');
        const bIndex = columnOrder.indexOf(bId || '');
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    const mappings: ColumnMapping[] = columnsToUse.map((col, index) => {
      const columnId =
        (col as { id?: string }).id ||
        (col as { accessorKey?: string }).accessorKey ||
        `column_${index}`;
      const accessorKey = (col as { accessorKey?: string }).accessorKey || columnId;

      // Try both columnId and accessorKey to find the metadata
      const metadata = columnMetadata[columnId] || columnMetadata[accessorKey];
      let columnLabel = columnId;

      if (metadata && metadata.label) {
        columnLabel = metadata.label;
      }

      return {
        columnId,
        columnLabel,
        include: true,
        order: index,
        customLabel: columnLabel,
      };
    });

    setOptions((prev) => ({ ...prev, columnMappings: mappings }));
  }, [columns, columnMetadata, visibleColumns, columnOrder]);

  // Initialize mappings when dialog opens
  React.useEffect(() => {
    if (open && options.columnMappings.length === 0 && columns && columns.length > 0) {
      queueMicrotask(() => {
        initializeColumnMappings();
      });
    }
  }, [open, columns, options.columnMappings.length, initializeColumnMappings]);

  // Get data based on scope
  const getDataForScope = useCallback(() => {
    switch (options.scope) {
      case 'all':
        return data;
      case 'filtered':
        return filteredData;
      case 'selected':
        return selectedData;
      default:
        return filteredData;
    }
  }, [options.scope, data, filteredData, selectedData]);

  // Generate CSV preview
  const generatePreview = useCallback(() => {
    const targetData = getDataForScope().slice(0, 10); // Only preview first 10 rows
    const generator = new CSVGenerator(options.config);
    const csvContent = generator.generate(targetData, columns, options.columnMappings);
    setPreviewData(csvContent);
  }, [options.config, options.columnMappings, getDataForScope, columns]);

  // Update preview when options change
  React.useEffect(() => {
    if (options.columnMappings.length > 0) {
      queueMicrotask(() => {
        generatePreview();
      });
    }
  }, [options, generatePreview]);

  // Handle download
  const handleDownload = useCallback(() => {
    const targetData = getDataForScope();
    const generator = new CSVGenerator(options.config);
    const csvContent = generator.generate(targetData, columns, options.columnMappings);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', options.filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [options, getDataForScope, columns]);

  // Update column mapping
  const updateColumnMapping = useCallback((index: number, updates: Partial<ColumnMapping>) => {
    setOptions((prev) => ({
      ...prev,
      columnMappings: prev.columnMappings.map((mapping, i) =>
        i === index ? { ...mapping, ...updates } : mapping,
      ),
    }));
  }, []);

  // Reorder columns
  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setOptions((prev) => {
      const newMappings = [...prev.columnMappings];
      const [moved] = newMappings.splice(fromIndex, 1);
      newMappings.splice(toIndex, 0, moved);

      return {
        ...prev,
        columnMappings: newMappings.map((mapping, index) => ({
          ...mapping,
          order: index,
        })),
      };
    });
  }, []);

  const moveColumnUp = useCallback(
    (index: number) => {
      if (index > 0) {
        reorderColumns(index, index - 1);
      }
    },
    [reorderColumns],
  );

  const moveColumnDown = useCallback(
    (index: number) => {
      if (index < options.columnMappings.length - 1) {
        reorderColumns(index, index + 1);
      }
    },
    [reorderColumns, options.columnMappings.length],
  );

  // Reset dialog
  const resetDialog = useCallback(() => {
    setOptions({
      scope: 'filtered',
      filename: `${title}_${new Date().toISOString().split('T')[0]}.csv`,
      config: { ...DEFAULT_CSV_CONFIG, escapeFormulae: true },
      columnMappings: [],
    });
    setPreviewData('');
  }, [title]);

  // Close dialog
  const handleClose = useCallback(() => {
    resetDialog();
    onOpenChange?.(false);
  }, [resetDialog, onOpenChange]);

  const targetData = getDataForScope();
  const includedColumns = options.columnMappings.filter((m) => m.include).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className='sm:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden'>
        <DialogHeader>
          <DialogTitle>CSV ダウンロード</DialogTitle>
          <DialogDescription>CSVファイルのダウンロード設定を行います</DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden min-h-[400px]'>
          <Tabs defaultValue='columns' className='h-full flex flex-col'>
            <TabsList className='grid w-full grid-cols-4 shrink-0'>
              <TabsTrigger value='columns'>カラム設定</TabsTrigger>
              <TabsTrigger value='options'>オプション</TabsTrigger>
              <TabsTrigger value='preview'>プレビュー</TabsTrigger>
              <TabsTrigger value='download'>ダウンロード</TabsTrigger>
            </TabsList>

            <div className='flex-1 overflow-y-auto pt-4'>
              <TabsContent value='columns' className='space-y-4 m-0'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h3>カラム構成</h3>
                    <div className='flex items-center space-x-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setOptions((prev) => ({
                            ...prev,
                            columnMappings: prev.columnMappings.map((mapping) => ({
                              ...mapping,
                              include: true,
                            })),
                          }));
                        }}
                      >
                        すべて選択
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setOptions((prev) => ({
                            ...prev,
                            columnMappings: prev.columnMappings.map((mapping) => ({
                              ...mapping,
                              include: false,
                            })),
                          }));
                        }}
                      >
                        すべて解除
                      </Button>
                    </div>
                  </div>

                  <div className='border rounded-lg overflow-hidden'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-8'>順序</TableHead>
                          <TableHead className='w-12'>選択</TableHead>
                          <TableHead>カラム名</TableHead>
                          <TableHead>表示ラベル</TableHead>
                          <TableHead className='w-20'>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {options.columnMappings
                          .sort((a, b) => a.order - b.order)
                          .map((mapping, index) => (
                            <TableRow key={mapping.columnId}>
                              <TableCell className='text-center text-muted-foreground'>
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={mapping.include}
                                  onCheckedChange={(checked) =>
                                    updateColumnMapping(
                                      options.columnMappings.findIndex(
                                        (m) => m.columnId === mapping.columnId,
                                      ),
                                      { include: !!checked },
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell className='font-medium text-sm'>
                                {mapping.columnLabel}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={mapping.customLabel || ''}
                                  onChange={(e) =>
                                    updateColumnMapping(
                                      options.columnMappings.findIndex(
                                        (m) => m.columnId === mapping.columnId,
                                      ),
                                      { customLabel: e.target.value },
                                    )
                                  }
                                  placeholder={mapping.columnLabel}
                                  className='h-8 text-sm'
                                />
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center space-x-1'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => moveColumnUp(index)}
                                    disabled={index === 0}
                                    className='h-6 w-6 p-0'
                                  >
                                    <ArrowUp className='h-3 w-3' />
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => moveColumnDown(index)}
                                    disabled={index === options.columnMappings.length - 1}
                                    className='h-6 w-6 p-0'
                                  >
                                    <ArrowDown className='h-3 w-3' />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='options' className='space-y-4 m-0'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      id='escape-formulae'
                      checked={!!options.config.escapeFormulae}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({
                          ...prev,
                          config: { ...prev.config, escapeFormulae: !!checked },
                        }))
                      }
                    />
                    <Label htmlFor='escape-formulae'>表計算ソフト向けの数式対策</Label>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    数式に見える文字列にアポストロフィを付けます。機械連携で元の値が必要な場合のみ解除してください。
                  </p>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='scope'>ダウンロード範囲</Label>
                    <Select
                      value={options.scope}
                      onValueChange={(value: string | null) => {
                        if (value) {
                          setOptions((prev) => ({
                            ...prev,
                            scope: value as 'all' | 'filtered' | 'selected',
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>すべてのデータ ({data.length}行)</SelectItem>
                        <SelectItem value='filtered'>
                          フィルター済みデータ ({filteredData.length}行)
                        </SelectItem>
                        <SelectItem value='selected'>
                          選択されたデータ ({selectedData.length}行)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='filename'>ファイル名</Label>
                    <Input
                      id='filename'
                      value={options.filename}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, filename: e.target.value }))
                      }
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='delimiter'>区切り文字</Label>
                    <Select
                      value={options.config.delimiter}
                      onValueChange={(value: string | null) =>
                        setOptions((prev) => ({
                          ...prev,
                          config: { ...prev.config, delimiter: value || ',' },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=','>カンマ (,)</SelectItem>
                        <SelectItem value=';'>セミコロン (;)</SelectItem>
                        <SelectItem value={'\t'}>タブ (\t)</SelectItem>
                        <SelectItem value='|'>パイプ (|)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <div className='flex items-center space-x-2 pt-8'>
                      <Checkbox
                        id='include-header'
                        checked={options.config.includeHeader}
                        onCheckedChange={(checked) =>
                          setOptions((prev) => ({
                            ...prev,
                            config: { ...prev.config, includeHeader: !!checked },
                          }))
                        }
                      />
                      <Label htmlFor='include-header'>ヘッダー行を含む</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='preview' className='space-y-4 m-0'>
                <div className='border rounded-lg p-4 bg-muted/20 font-mono text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto'>
                  {previewData || 'プレビューを生成中...'}
                </div>
              </TabsContent>

              <TabsContent value='download' className='space-y-4 m-0'>
                <div className='text-center py-8 space-y-4'>
                  <Download className='h-12 w-12 mx-auto text-muted-foreground' />
                  <div>
                    <h3 className='font-bold'>準備完了</h3>
                    <p className='text-sm text-muted-foreground'>
                      {targetData.length}行のデータを "{options.filename}"
                      としてダウンロードします。
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className='px-6 py-4'>
          <Button variant='outline' onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleDownload}
            disabled={includedColumns === 0 || targetData.length === 0}
          >
            <Download className='h-4 w-4 mr-2' />
            ダウンロード ({targetData.length}行)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
