import React, { useState, useCallback } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import { Progress } from './progress';
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
import { Upload, FileText, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { CSVParser, type CSVParseConfig, DEFAULT_CSV_PARSE_CONFIG } from '../../lib/csv/parser';
import type { HeaderMapping, UploadProgress } from '../../lib/data-access/common-types';

export type { HeaderMapping, UploadProgress };

// Error handling options
export type ErrorHandlingMode = 'stop' | 'skip' | 'continue';

// Row validation result
export interface RowValidationResult {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  data: Record<string, unknown>;
}

export interface AvailableField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

// Props for CSV upload dialog
export interface CSVUploadDialogProps {
  resourceName: string;
  availableFields: AvailableField[];
  onUpload: (data: Record<string, unknown>[], mapping: HeaderMapping[]) => Promise<UploadProgress>;
  trigger?: React.ComponentProps<typeof DialogTrigger>['render'];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Data type validators
const validators = {
  string: (value: unknown) => ({ isValid: true, converted: String(value) }),
  number: (value: unknown) => {
    const num = Number(value);
    return { isValid: !isNaN(num), converted: num };
  },
  boolean: (value: unknown) => {
    const str = String(value).toLowerCase();
    const bool = str === 'true' || str === '1' || str === 'yes' || str === 'on';
    return { isValid: true, converted: bool };
  },
  date: (value: unknown) => {
    const date = new Date(value as string);
    return { isValid: !isNaN(date.getTime()), converted: date };
  },
  email: (value: unknown) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return { isValid: emailRegex.test(String(value)), converted: String(value) };
  },
};

/**
 * CSVファイルをアップロードしてデータを一括登録するためのダイアログコンポーネント。
 *
 * ファイルのパース、カラムのマッピング、データ型の検証、および
 * アップロード進行状況の表示をサポートします。
 */
export function CSVUploadDialog({
  resourceName,
  availableFields,
  onUpload,
  trigger,
  open,
  onOpenChange,
}: CSVUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<HeaderMapping[]>([]);
  const [config, setConfig] = useState<CSVParseConfig>(DEFAULT_CSV_PARSE_CONFIG);
  const [errorMode, setErrorMode] = useState<ErrorHandlingMode>('stop');
  const [validationResults, setValidationResults] = useState<RowValidationResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState(5);

  // Parse CSV content
  const parseCSV = useCallback(
    (content: string) => {
      try {
        const parser = new CSVParser(config);
        const rows = parser.parse(content);
        setParsedData(rows);

        if (config.hasHeader && rows.length > 0) {
          setMapping(
            rows[0].map((header) => {
              // Try to auto-match headers to available fields
              const matchedField = availableFields.find(
                (f) =>
                  f.label.toLowerCase() === header.toLowerCase() ||
                  f.key.toLowerCase() === header.toLowerCase(),
              );
              return {
                csvColumn: header,
                dbField: matchedField?.key || '',
                required: matchedField?.required || false,
                dataType: matchedField?.type || 'string',
              };
            }),
          );
        } else {
          setMapping([]);
        }
      } catch (error) {
        console.error('CSV parsing error:', error);
      }
    },
    [config, availableFields],
  );

  // Handle file select
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setCsvContent(content);
          parseCSV(content);
        };
        reader.readAsText(selectedFile, 'UTF-8');
      }
    },
    [parseCSV],
  );

  // Update CSV config and reparse
  const updateConfig = useCallback(
    (newConfig: Partial<CSVParseConfig>) => {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      if (csvContent) {
        parseCSV(csvContent);
      }
    },
    [config, csvContent, parseCSV],
  );

  // Validate data with current mapping
  const validateData = useCallback(() => {
    if (parsedData.length === 0) return;

    const dataRows = config.hasHeader ? parsedData.slice(1) : parsedData;
    const results: RowValidationResult[] = [];

    dataRows.forEach((row, index) => {
      const rowData: Record<string, unknown> = {};
      const errors: string[] = [];

      mapping.forEach((map, mapIndex) => {
        if (!map.dbField) return;

        const value = row[mapIndex] || '';
        const validator = validators[map.dataType as keyof typeof validators] || validators.string;
        const { isValid, converted } = validator(value);

        if (!isValid) {
          errors.push(`${map.csvColumn}: 無効な${map.dataType}値 "${value}"`);
        } else if (map.required && (!value || value.trim() === '')) {
          errors.push(`${map.csvColumn}: 必須フィールドが空です`);
        }

        rowData[map.dbField] = converted;
      });

      results.push({
        rowIndex: index + (config.hasHeader ? 2 : 1),
        isValid: errors.length === 0,
        errors,
        data: rowData,
      });
    });

    setValidationResults(results);
  }, [parsedData, mapping, config.hasHeader]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (validationResults.length === 0) {
      validateData();
      return;
    }

    const validData = validationResults
      .filter((result) => result.isValid)
      .map((result) => result.data);

    if (validData.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadProgress({
      total: validData.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    });

    try {
      const progress = await onUpload(validData, mapping);
      setUploadProgress(progress);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress((prev) =>
        prev
          ? {
              ...prev,
              errors: [...prev.errors, `アップロードエラー: ${error}`],
            }
          : null,
      );
    } finally {
      setIsUploading(false);
    }
  }, [validationResults, onUpload, mapping, validateData]);

  // Reset dialog
  const resetDialog = useCallback(() => {
    setFile(null);
    setCsvContent('');
    setParsedData([]);
    setMapping([]);
    setValidationResults([]);
    setUploadProgress(null);
    setIsUploading(false);
  }, []);

  // Close dialog
  const handleClose = useCallback(() => {
    resetDialog();
    onOpenChange?.(false);
  }, [resetDialog, onOpenChange]);

  const validRows = validationResults.filter((r) => r.isValid).length;
  const invalidRows = validationResults.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className='sm:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden'>
        <DialogHeader>
          <DialogTitle>{resourceName} - CSV アップロード</DialogTitle>
          <DialogDescription>CSVファイルをアップロードしてデータを一括登録します</DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden min-h-[400px]'>
          <Tabs defaultValue='file' className='h-full flex flex-col'>
            <TabsList className='grid w-full grid-cols-4 shrink-0'>
              <TabsTrigger value='file'>ファイル選択</TabsTrigger>
              <TabsTrigger value='config' disabled={!file}>
                設定
              </TabsTrigger>
              <TabsTrigger value='mapping' disabled={!file}>
                マッピング
              </TabsTrigger>
              <TabsTrigger value='preview' disabled={!file}>
                プレビュー
              </TabsTrigger>
            </TabsList>

            <div className='flex-1 overflow-y-auto pt-4'>
              <TabsContent value='file' className='space-y-4 m-0'>
                <div className='space-y-4'>
                  <div>
                    <Label htmlFor='csv-file'>CSVファイルを選択</Label>
                    <Input
                      id='csv-file'
                      type='file'
                      accept='.csv'
                      onChange={handleFileSelect}
                      className='mt-2'
                    />
                  </div>

                  {file && (
                    <div className='space-y-2'>
                      <div className='flex items-center space-x-2'>
                        <FileText className='h-4 w-4' />
                        <span className='text-sm font-medium'>{file.name}</span>
                        <Badge variant='secondary'>{file.size} bytes</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='config' className='space-y-4 m-0'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='delimiter'>区切り文字</Label>
                    <Select
                      value={config.delimiter}
                      onValueChange={(value: string | null) =>
                        updateConfig({ delimiter: value || ',' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=','>カンマ (,)</SelectItem>
                        <SelectItem value=';'>セミコロン (;)</SelectItem>
                        <SelectItem value='\t'>タブ (\t)</SelectItem>
                        <SelectItem value='|'>パイプ (|)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor='quote'>引用符</Label>
                    <Select
                      value={config.quoteChar || 'none'}
                      onValueChange={(value: string | null) =>
                        updateConfig({ quoteChar: value === 'none' || !value ? '' : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={'"'}>ダブルクォート (")</SelectItem>
                        <SelectItem value="'">シングルクォート (')</SelectItem>
                        <SelectItem value='none'>なし</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor='error-mode'>エラー処理</Label>
                    <Select
                      value={errorMode}
                      onValueChange={(value: string | null) => {
                        if (value) {
                          setErrorMode(value as ErrorHandlingMode);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='stop'>エラーで停止</SelectItem>
                        <SelectItem value='skip'>エラー行をスキップ</SelectItem>
                        <SelectItem value='continue'>続行</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='has-header'
                      checked={config.hasHeader}
                      onCheckedChange={(checked) => updateConfig({ hasHeader: !!checked })}
                    />
                    <Label htmlFor='has-header'>ヘッダー行を含む</Label>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='skip-empty'
                      checked={config.skipEmptyLines}
                      onCheckedChange={(checked) => updateConfig({ skipEmptyLines: !!checked })}
                    />
                    <Label htmlFor='skip-empty'>空行をスキップ</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='mapping' className='space-y-4 m-0'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h3>カラムマッピング</h3>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={validateData}
                      disabled={mapping.length === 0}
                    >
                      <RefreshCw className='h-4 w-4 mr-2' />
                      検証
                    </Button>
                  </div>

                  <div className='border rounded-lg overflow-hidden'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='min-w-[200px]'>CSVカラム</TableHead>
                          <TableHead className='min-w-[250px]'>データベースフィールド</TableHead>
                          <TableHead className='min-w-[150px]'>データ型</TableHead>
                          <TableHead className='min-w-[100px]'>必須</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mapping.map((map, index) => (
                          <TableRow key={index}>
                            <TableCell className='font-medium'>{map.csvColumn}</TableCell>
                            <TableCell>
                              <Select
                                value={map.dbField || 'none'}
                                onValueChange={(value: string | null) => {
                                  const newMapping = [...mapping];
                                  const field = availableFields.find((f) => f.key === value);
                                  newMapping[index] = {
                                    ...map,
                                    dbField: value === 'none' || !value ? '' : value,
                                    dataType: field?.type || 'string',
                                    required: field?.required || false,
                                  };
                                  setMapping(newMapping);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='none'>マッピングしない</SelectItem>
                                  {availableFields.map((field) => (
                                    <SelectItem key={field.key} value={field.key}>
                                      {field.label} ({field.key})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={map.dataType}
                                onValueChange={(value: string | null) => {
                                  const newMapping = [...mapping];
                                  newMapping[index] = { ...map, dataType: value || 'string' };
                                  setMapping(newMapping);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='string'>文字列</SelectItem>
                                  <SelectItem value='number'>数値</SelectItem>
                                  <SelectItem value='boolean'>真偽値</SelectItem>
                                  <SelectItem value='date'>日付</SelectItem>
                                  <SelectItem value='email'>メール</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={map.required}
                                onCheckedChange={(checked) => {
                                  const newMapping = [...mapping];
                                  newMapping[index] = { ...map, required: !!checked };
                                  setMapping(newMapping);
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='preview' className='space-y-4 m-0'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h3>データプレビュー</h3>
                    <div className='flex items-center space-x-2'>
                      <Label htmlFor='preview-rows'>表示行数:</Label>
                      <Select
                        value={previewRows.toString()}
                        onValueChange={(value: string | null) =>
                          setPreviewRows(parseInt(value || '5'))
                        }
                      >
                        <SelectTrigger className='w-20'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='5'>5</SelectItem>
                          <SelectItem value='10'>10</SelectItem>
                          <SelectItem value='20'>20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {validationResults.length > 0 && (
                    <div className='flex items-center space-x-4'>
                      <div className='flex items-center space-x-2'>
                        <CheckCircle className='h-4 w-4 text-green-500' />
                        <span className='text-sm'>有効: {validRows}行</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <AlertCircle className='h-4 w-4 text-red-500' />
                        <span className='text-sm'>無効: {invalidRows}行</span>
                      </div>
                    </div>
                  )}

                  <div className='border rounded-lg overflow-hidden'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>行</TableHead>
                          {mapping
                            .filter((m) => m.dbField)
                            .map((map) => (
                              <TableHead key={map.csvColumn}>{map.csvColumn}</TableHead>
                            ))}
                          <TableHead>ステータス</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResults.slice(0, previewRows).map((result, index) => (
                          <TableRow key={index}>
                            <TableCell className='font-medium'>{result.rowIndex}</TableCell>
                            {mapping
                              .filter((m) => m.dbField)
                              .map((map) => (
                                <TableCell key={map.csvColumn}>
                                  {result.data[map.dbField]?.toString() || ''}
                                </TableCell>
                              ))}
                            <TableCell>
                              {result.isValid ? (
                                <Badge
                                  variant='outline'
                                  className='text-green-600 border-green-600'
                                >
                                  有効
                                </Badge>
                              ) : (
                                <Badge variant='destructive'>エラー</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {validationResults.some((r) => !r.isValid) && (
                    <div className='space-y-2'>
                      <h4 className='text-red-600 text-sm font-bold'>エラー詳細</h4>
                      <div className='max-h-32 overflow-y-auto space-y-1 bg-red-50 p-2 rounded border border-red-100'>
                        {validationResults
                          .filter((r) => !r.isValid)
                          .slice(0, 10)
                          .map((result, index) => (
                            <div key={index} className='text-xs text-red-600'>
                              <strong>行 {result.rowIndex}:</strong> {result.errors.join(', ')}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {uploadProgress && (
          <div className='px-6 py-2 space-y-2 bg-muted/30 border-t border-b'>
            <div className='flex items-center justify-between text-sm'>
              <span>アップロード進行状況</span>
              <span>
                {uploadProgress.processed} / {uploadProgress.total}
              </span>
            </div>
            <Progress
              value={(uploadProgress.processed / uploadProgress.total) * 100}
              className='w-full'
            />
            <div className='flex items-center justify-between text-xs text-muted-foreground'>
              <span>成功: {uploadProgress.successful}</span>
              <span>失敗: {uploadProgress.failed}</span>
            </div>
          </div>
        )}

        <DialogFooter className='px-6 py-4'>
          <Button variant='outline' onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || validRows === 0}>
            {isUploading ? (
              <>
                <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className='h-4 w-4 mr-2' />
                アップロード ({validRows}行)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
